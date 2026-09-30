// Against a real mongod, because the interesting bugs here are in the update
// operators -- a positional $ that matches the wrong stay, or $setOnInsert and
// $inc colliding on one path -- and a fake would agree with whatever I wrote.

import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, STALE_MS, meetingWindow, summarize } from './attendance';
import { closeDb, getDb } from './db';
import {
  MAX_REPORT_MS,
  Person,
  cleanAttention,
  createMeeting,
  getMeeting,
  listAttended,
  listHosted,
  listParticipants,
  recordPresence,
  toRecord,
} from './store';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = 'aksameet_test';
});

afterAll(async () => {
  await closeDb();
  await mongo?.stop();
});

beforeEach(async () => {
  const db = await getDb();
  await db.collection('meetings').deleteMany({});
  await db.collection('participants').deleteMany({});
});

const host: Person = { id: 'user_host', name: 'Dr. Kumar', email: 'kumar@example.com', image: null };
const priya: Person = { id: 'user_priya', name: 'Priya', email: 'priya@example.com', image: null };
const at = (minutes: number, seconds = 0) => new Date(Date.UTC(2026, 8, 30, 10, minutes, seconds));

async function meeting() {
  await createMeeting({ id: 'abc-defg-hij', title: 'DBMS lecture', host, settings: DEFAULT_SETTINGS, now: at(0) });
}

const beat = (person: Person, session: string, now: Date, extra: object = {}) =>
  recordPresence({ meetingId: 'abc-defg-hij', person, isHost: person === host, type: 'beat', session, now, ...extra });

/** Join, heartbeat every 15 seconds as a browser does, and leave. */
async function stay(person: Person, session: string, fromMinute: number, toMinute: number) {
  const base = { meetingId: 'abc-defg-hij', person, isHost: person === host, session };
  await recordPresence({ ...base, type: 'join', now: at(fromMinute) });
  for (let s = 15; s < (toMinute - fromMinute) * 60; s += 15) {
    await recordPresence({ ...base, type: 'beat', now: new Date(at(fromMinute).getTime() + s * 1000) });
  }
  await recordPresence({ ...base, type: 'leave', now: at(toMinute) });
}

describe('a student’s stay', () => {
  it('is one stay across heartbeats, and counts attention as it goes', async () => {
    await meeting();
    await recordPresence({ meetingId: 'abc-defg-hij', person: priya, isHost: false, type: 'join', session: 'tab-aaaaaaaa', now: at(1) });
    for (let s = 15; s <= 60; s += 15) {
      await beat(priya, 'tab-aaaaaaaa', at(1, s), {
        attention: { attentive: 12_000, away: 3_000 },
        live: { state: 'attentive', since: at(1).getTime() },
      });
    }
    await recordPresence({ meetingId: 'abc-defg-hij', person: priya, isHost: false, type: 'leave', session: 'tab-aaaaaaaa', now: at(2, 10) });

    const [doc] = await listParticipants('abc-defg-hij');
    expect(doc.segments).toHaveLength(1);
    expect(doc.segments[0].leftAt).toEqual(at(2, 10));
    expect(doc.attention.attentive).toBe(48_000);
    expect(doc.attention.away).toBe(12_000);
    expect(doc.live?.state).toBe('attentive');

    const m = await getMeeting('abc-defg-hij');
    expect(m?.participantCount).toBe(1);
    expect(m?.startedAt).toEqual(at(1));
    expect(m?.lastActivityAt).toEqual(at(2, 10));
  });

  it('starts a new stay on rejoining, and the report counts the rejoin', async () => {
    await meeting();
    await stay(priya, 'tab-aaaaaaaa', 0, 10);
    await stay(priya, 'tab-bbbbbbbb', 20, 40);

    const [doc] = await listParticipants('abc-defg-hij');
    const record = toRecord(doc);
    const now = at(60).getTime();
    const window = meetingWindow(null, [record.segments], now);
    const summary = summarize(record, window, DEFAULT_SETTINGS, now);
    expect(summary.joins).toBe(2);
    expect(summary.rejoins).toBe(1);
    expect(summary.presentMs).toBe(30 * 60_000);
    // Still one person in the meeting's count.
    expect((await getMeeting('abc-defg-hij'))?.participantCount).toBe(1);
  });

  it('does not count a laptop that slept as time in the meeting', async () => {
    await meeting();
    await recordPresence({ meetingId: 'abc-defg-hij', person: priya, isHost: false, type: 'join', session: 'tab-aaaaaaaa', now: at(0) });
    await beat(priya, 'tab-aaaaaaaa', at(0, 15));
    // Lid closed for ten minutes; the same tab wakes and carries on.
    await beat(priya, 'tab-aaaaaaaa', at(10, 15));
    await beat(priya, 'tab-aaaaaaaa', at(10, 30));

    const [doc] = await listParticipants('abc-defg-hij');
    expect(doc.segments).toHaveLength(2);
    const now = at(10, 30).getTime() + 1000;
    const record = toRecord(doc);
    const summary = summarize(record, meetingWindow(null, [record.segments], now), DEFAULT_SETTINGS, now);
    // 15 seconds before sleeping, and about 16 since waking -- not ten minutes.
    expect(summary.presentMs).toBeLessThan(60_000);
    expect(STALE_MS).toBeLessThan(10 * 60_000);
  });

  it('treats a retried join from the same tab as the same stay', async () => {
    await meeting();
    await recordPresence({ meetingId: 'abc-defg-hij', person: priya, isHost: false, type: 'join', session: 'tab-aaaaaaaa', now: at(0) });
    await recordPresence({ meetingId: 'abc-defg-hij', person: priya, isHost: false, type: 'join', session: 'tab-aaaaaaaa', now: at(0, 5) });
    const [doc] = await listParticipants('abc-defg-hij');
    expect(doc.segments).toHaveLength(1);
  });

  it('counts attention sent on the very first heartbeat of a new document', async () => {
    await meeting();
    await beat(priya, 'tab-aaaaaaaa', at(0), { attention: { attentive: 9_000 } });
    const [doc] = await listParticipants('abc-defg-hij');
    expect(doc.attention.attentive).toBe(9_000);
  });
});

describe('what a report may claim', () => {
  it('caps one report at a little over one heartbeat, whatever the browser says', () => {
    const cleaned = cleanAttention({ attentive: 1e9, away: 5_000, no_face: -4 });
    expect(cleaned.attentive).toBe(MAX_REPORT_MS);
    expect(cleaned.away).toBe(0);
    expect(cleaned.no_face).toBe(0);
  });
});

describe('history', () => {
  it('lists meetings hosted, and meetings attended as a student', async () => {
    await meeting();
    await recordPresence({ meetingId: 'abc-defg-hij', person: host, isHost: true, type: 'join', session: 'tab-hhhhhhhh', now: at(0) });
    await recordPresence({ meetingId: 'abc-defg-hij', person: priya, isHost: false, type: 'join', session: 'tab-aaaaaaaa', now: at(1) });

    const hosted = await listHosted(host.id);
    expect(hosted.map((m) => m.title)).toEqual(['DBMS lecture']);
    expect(hosted[0].participantCount).toBe(2);

    const attended = await listAttended(priya.id);
    expect(attended).toHaveLength(1);
    expect(attended[0].meeting._id).toBe('abc-defg-hij');
    // The host's own meeting is under "hosted", not "attended".
    expect(await listAttended(host.id)).toHaveLength(0);
  });
});
