// The API as a host and a student would use it: the real route handlers,
// the real store, a real mongod. Only the two outside services are stood in
// for -- Clerk (who is signed in) and Stream (the video call).

import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const signedIn = vi.hoisted(() => ({ id: null as string | null }));
const streamCalls = vi.hoisted(() => ({ created: [] as unknown[], ended: [] as string[] }));

const PEOPLE: Record<string, { name: string; email: string }> = {
  user_host: { name: 'Dr. Kumar', email: 'kumar@example.com' },
  user_priya: { name: 'Priya', email: 'priya@example.com' },
  user_arun: { name: '=HYPERLINK("http://evil")', email: 'arun@example.com' },
};

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: signedIn.id }),
  currentUser: async () =>
    signedIn.id
      ? {
          id: signedIn.id,
          fullName: PEOPLE[signedIn.id].name,
          username: null,
          primaryEmailAddress: { emailAddress: PEOPLE[signedIn.id].email },
          hasImage: false,
          imageUrl: '',
        }
      : null,
}));

vi.mock('@/lib/stream-server', () => {
  class MissingConfigError extends Error {}
  return {
    MissingConfigError,
    isNotFoundError: () => false,
    errorResponse: (_e: unknown, message: string) => Response.json({ error: message }, { status: 500 }),
    getStreamClient: () => ({
      upsertUsers: async () => ({}),
      generateUserToken: ({ user_id }: { user_id: string }) => `token-for-${user_id}`,
      video: {
        call: (_type: string, id: string) => ({
          getOrCreate: async (request: unknown) => {
            streamCalls.created.push({ id, request });
            return {};
          },
          end: async () => {
            streamCalls.ended.push(id);
            return {};
          },
          get: async () => ({}),
        }),
      },
    }),
  };
});

import { closeDb, getDb } from '@/lib/db';
import { POST as createMeeting } from './meetings/route';
import { GET as getMeeting, PATCH as patchMeeting } from './meetings/[meetingId]/route';
import { POST as presence } from './meetings/[meetingId]/presence/route';
import { GET as live } from './meetings/[meetingId]/live/route';
import { GET as report } from './meetings/[meetingId]/report/route';
import { POST as end } from './meetings/[meetingId]/end/route';
import { GET as history } from './history/route';
import { POST as token } from './token/route';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = 'aksameet_api_test';
});

afterAll(async () => {
  await closeDb();
  await mongo?.stop();
});

beforeEach(async () => {
  const db = await getDb();
  await db.collection('meetings').deleteMany({});
  await db.collection('participants').deleteMany({});
  streamCalls.created.length = 0;
  streamCalls.ended.length = 0;
});

const as = (id: string | null) => {
  signedIn.id = id;
};
const params = (meetingId: string) => ({ params: Promise.resolve({ meetingId }) });
const request = (method: string, body?: unknown, url = 'http://localhost/api') =>
  new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function newMeeting(settings: object = {}) {
  as('user_host');
  const response = await createMeeting(request('POST', { title: 'DBMS — Unit 3', settings }));
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

const report_ = async (id: string, query = '') =>
  report(request('GET', undefined, `http://localhost/api/meetings/${id}/report${query}`), params(id));

describe('creating a meeting', () => {
  it('makes the signed-in user the host, on the server', async () => {
    const id = await newMeeting();
    expect(id).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
    const [created] = streamCalls.created as { request: { data: { created_by_id: string; members: { role: string }[] } } }[];
    expect(created.request.data.created_by_id).toBe('user_host');
    expect(created.request.data.members[0].role).toBe('host');

    const info = await (await getMeeting(request('GET'), params(id))).json();
    expect(info).toMatchObject({ title: 'DBMS — Unit 3', hostName: 'Dr. Kumar', isHost: true });

    as('user_priya');
    const seenByStudent = await (await getMeeting(request('GET'), params(id))).json();
    expect(seenByStudent.isHost).toBe(false);
    // Told what is measured, before joining.
    expect(seenByStudent.settings.attention).toBe(true);
  });

  it('refuses the signed-out, and hands out no guest tokens', async () => {
    as(null);
    expect((await createMeeting(request('POST', {}))).status).toBe(401);
    expect((await token()).status).toBe(401);
    as('user_priya');
    expect(await (await token()).json()).toEqual({ userId: 'user_priya', token: 'token-for-user_priya' });
  });
});

describe('a class in progress', () => {
  it('shows the host who is away too long, and nobody else', async () => {
    const id = await newMeeting({ awayAlertSeconds: 60 });

    as('user_host');
    await presence(request('POST', { type: 'join', session: 'host-tab-0001' }), params(id));

    as('user_priya');
    expect((await presence(request('POST', { type: 'join', session: 'priya-tab-001' }), params(id))).status).toBe(200);
    // Her device reports she has been looking away for seventy seconds.
    const beat = await presence(
      request('POST', {
        type: 'beat',
        session: 'priya-tab-001',
        attention: { attentive: 5000, away: 10000 },
        live: { state: 'away', since: Date.now() - 70_000 },
      }),
      params(id)
    );
    expect(beat.status).toBe(200);

    // A student asking for the host's panel is refused by the server.
    expect((await live(request('GET'), params(id))).status).toBe(403);

    as('user_host');
    const panel = await (await live(request('GET'), params(id))).json();
    const priya = panel.participants.find((p: { userId: string }) => p.userId === 'user_priya');
    expect(priya.inMeeting).toBe(true);
    expect(priya.liveState).toBe('away');
    expect(priya.attention.away).toBe(10000);
    expect(panel.alerts).toEqual([
      expect.objectContaining({ userId: 'user_priya', name: 'Priya', state: 'away' }),
    ]);
    // The host is never alerted about themselves.
    expect(panel.alerts.some((a: { userId: string }) => a.userId === 'user_host')).toBe(false);
  });

  it('also alerts the host to a camera left off, without counting it against attention', async () => {
    const id = await newMeeting({ awayAlertSeconds: 60 });
    as('user_priya');
    await presence(request('POST', { type: 'join', session: 'priya-tab-001' }), params(id));
    await presence(
      request('POST', {
        type: 'beat',
        session: 'priya-tab-001',
        attention: { attentive: 5000, camera_off: 10000 },
        live: { state: 'camera_off', since: Date.now() - 90_000 },
      }),
      params(id)
    );
    as('user_host');
    const panel = await (await live(request('GET'), params(id))).json();
    expect(panel.alerts).toEqual([expect.objectContaining({ userId: 'user_priya', state: 'camera_off' })]);
    // Too little observed to give a percentage; camera-off time is not "away".
    expect(panel.participants.find((p: { userId: string }) => p.userId === 'user_priya').attention.camera_off).toBe(10000);
  });

  it('stops counting anyone once the host has ended the meeting', async () => {
    const id = await newMeeting();
    as('user_priya');
    await presence(request('POST', { type: 'join', session: 'priya-tab-001' }), params(id));
    as('user_host');
    await end(request('POST'), params(id));
    as('user_priya');
    const late = await (await presence(request('POST', { type: 'beat', session: 'priya-tab-001', attention: { attentive: 9000 } }), params(id))).json();
    expect(late.recorded).toBe(false);
    expect(late.endedAt).toBeTruthy();
    // A leave still lands, so the stay closes.
    const leave = await (await presence(request('POST', { type: 'leave', session: 'priya-tab-001' }), params(id))).json();
    expect(leave.recorded).toBe(true);
    as('user_host');
    const panel = await (await live(request('GET'), params(id))).json();
    const priya = panel.participants.find((p: { userId: string }) => p.userId === 'user_priya');
    expect(priya.attention.attentive).toBe(0);
    expect(priya.inMeeting).toBe(false);
  });

  it('ignores attention figures when the host has turned attention off', async () => {
    const id = await newMeeting({ attention: false });
    as('user_priya');
    await presence(
      request('POST', { type: 'join', session: 'priya-tab-001', attention: { attentive: 9000 }, live: { state: 'attentive', since: Date.now() } }),
      params(id)
    );
    as('user_host');
    const panel = await (await live(request('GET'), params(id))).json();
    expect(panel.participants[0].attention.attentive).toBe(0);
    expect(panel.participants[0].liveState).toBeNull();
  });

  it('records nobody but the host when attendance is off', async () => {
    const id = await newMeeting({ attendance: false });
    as('user_priya');
    const reply = await (await presence(request('POST', { type: 'join', session: 'priya-tab-001' }), params(id))).json();
    expect(reply.recorded).toBe(false);
    as('user_host');
    const panel = await (await live(request('GET'), params(id))).json();
    expect(panel.participants).toHaveLength(0);
  });

  it('rejects a malformed report instead of guessing', async () => {
    const id = await newMeeting();
    as('user_priya');
    expect((await presence(request('POST', { type: 'teleport', session: 'x' }), params(id))).status).toBe(400);
  });

  it('lets only the host change the settings', async () => {
    const id = await newMeeting();
    as('user_priya');
    expect((await patchMeeting(request('PATCH', { settings: { attention: false } }), params(id))).status).toBe(403);
    as('user_host');
    const updated = await (await patchMeeting(request('PATCH', { settings: { awayAlertSeconds: 120 } }), params(id))).json();
    expect(updated.settings.awayAlertSeconds).toBe(120);
    expect(updated.settings.attention).toBe(true);
  });
});

describe('after class', () => {
  async function classWithTwoStudents() {
    const id = await newMeeting();
    for (const user of ['user_host', 'user_priya', 'user_arun']) {
      as(user);
      await presence(request('POST', { type: 'join', session: `${user}-tab` }), params(id));
      await presence(request('POST', { type: 'leave', session: `${user}-tab` }), params(id));
    }
    return id;
  }

  it('gives the host everyone, and a student only themselves', async () => {
    const id = await classWithTwoStudents();
    as('user_host');
    const full = await (await report_(id)).json();
    expect(full.participants.map((p: { name: string }) => p.name).sort()).toEqual(
      ['=HYPERLINK("http://evil")', 'Dr. Kumar', 'Priya'].sort()
    );
    expect(Object.keys(full.spans)).toHaveLength(3);

    as('user_priya');
    const mine = await (await report_(id)).json();
    expect(mine.participants.map((p: { userId: string }) => p.userId)).toEqual(['user_priya']);
    expect(mine.spans).toEqual({});
    expect((await report_(id, '?format=csv')).status).toBe(403);
  });

  it('exports CSV a spreadsheet cannot be tricked by', async () => {
    const id = await classWithTwoStudents();
    as('user_host');
    const response = await report_(id, '?format=csv');
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    const csv = await response.text();
    expect(csv).toContain('"Minutes present"');
    // A name that is a formula arrives as text.
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });

  it('lists hosted and attended meetings separately in history', async () => {
    const id = await classWithTwoStudents();
    as('user_host');
    const mineAsHost = await (await history()).json();
    expect(mineAsHost.hosted.map((m: { id: string }) => m.id)).toEqual([id]);
    expect(mineAsHost.hosted[0].participantCount).toBe(3);
    expect(mineAsHost.attended).toEqual([]);

    as('user_priya');
    const mineAsStudent = await (await history()).json();
    expect(mineAsStudent.hosted).toEqual([]);
    expect(mineAsStudent.attended[0]).toMatchObject({ id, hostName: 'Dr. Kumar' });
  });

  it('lets only the host end the meeting, and ends the call too', async () => {
    const id = await classWithTwoStudents();
    as('user_priya');
    expect((await end(request('POST'), params(id))).status).toBe(403);
    as('user_host');
    expect((await end(request('POST'), params(id))).status).toBe(200);
    expect(streamCalls.ended).toEqual([id]);
    const info = await (await getMeeting(request('GET'), params(id))).json();
    expect(info.endedAt).not.toBeNull();
  });
});
