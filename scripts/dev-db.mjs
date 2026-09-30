// A real MongoDB for local development, no install needed:
//
//   npm run db:dev      (leave it running)
//   MONGODB_URI=mongodb://127.0.0.1:27018/?directConnection=true   in .env.local
//
// Data survives restarts in .data/mongo. In production (Vercel) point
// MONGODB_URI at MongoDB Atlas instead -- see README.
import { mkdirSync } from 'node:fs';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

const dbPath = new URL('../.data/mongo', import.meta.url).pathname;
mkdirSync(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
  instance: { port: 27018, dbPath, storageEngine: 'wiredTiger' },
});
console.log(`Local MongoDB running at ${server.getUri()} (data in .data/mongo). Ctrl+C to stop.`);

const stop = async () => {
  await server.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
