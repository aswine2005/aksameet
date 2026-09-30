// MongoDB, shared across requests.
//
// On Vercel every API route is a serverless function, and a new MongoClient
// per request would open a new connection pool per request -- the classic way
// to exhaust a free Atlas cluster's connection limit within minutes of a class
// starting. The client is kept on `globalThis`, so warm invocations (and hot
// reloads in development) reuse one pool.

import { Collection, Db, MongoClient } from 'mongodb';

import type { MeetingDoc, ParticipantDoc } from './store';

export class MissingDatabaseError extends Error {}

type Cache = { client: MongoClient; ready: Promise<Db> };

const globalForMongo = globalThis as typeof globalThis & { __aksaMongo?: Cache };

async function prepare(client: MongoClient): Promise<Db> {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'aksameet');
  // Idempotent: creating an index that exists is a no-op.
  await Promise.all([
    db.collection('meetings').createIndex({ hostId: 1, createdAt: -1 }),
    db.collection('participants').createIndex({ meetingId: 1 }),
    db.collection('participants').createIndex({ userId: 1, createdAt: -1 }),
  ]);
  return db;
}

export function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new MissingDatabaseError('MONGODB_URI is not set'));
  }
  if (!globalForMongo.__aksaMongo) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    const ready = prepare(client).catch((error) => {
      // A failed first connection must not poison every later request.
      delete globalForMongo.__aksaMongo;
      throw error;
    });
    globalForMongo.__aksaMongo = { client, ready };
  }
  return globalForMongo.__aksaMongo.ready;
}

export async function collections(): Promise<{
  meetings: Collection<MeetingDoc>;
  participants: Collection<ParticipantDoc>;
}> {
  const db = await getDb();
  return {
    meetings: db.collection<MeetingDoc>('meetings'),
    participants: db.collection<ParticipantDoc>('participants'),
  };
}

/** For tests: drop the cached client. */
export async function closeDb() {
  const cached = globalForMongo.__aksaMongo;
  delete globalForMongo.__aksaMongo;
  if (cached) await cached.client.close();
}
