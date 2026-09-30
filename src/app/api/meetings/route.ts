import { customAlphabet } from 'nanoid';

import { DEFAULT_SETTINGS, sanitizeSettings } from '@/lib/attendance';
import { CALL_TYPE, MAX_TITLE_LENGTH } from '@/lib/constants';
import { fail, handle, json, person } from '@/lib/server';
import { getStreamClient } from '@/lib/stream-server';
import { createMeeting, getMeeting } from '@/lib/store';

const letters = customAlphabet('abcdefghijklmnopqrstuvwxyz', 10);
const newCode = () => {
  const raw = letters();
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
};

/**
 * Create a meeting, on the server.
 *
 * The browser used to create the call itself and name itself host. Created
 * here, the host is whoever the session says it is -- which matters now that
 * being host means seeing everyone's attendance and attention.
 */
export async function POST(request: Request) {
  try {
    const host = await person();
    if (!host) return fail(401, 'Sign in to create a meeting.');

    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      settings?: unknown;
    };
    const title =
      (typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE_LENGTH) : '') ||
      `${host.name.split(' ')[0]}'s meeting`;
    const settings = sanitizeSettings(body.settings, DEFAULT_SETTINGS);

    let id = newCode();
    for (let tries = 0; (await getMeeting(id)) && tries < 5; tries += 1) id = newCode();

    const stream = getStreamClient();
    await stream.upsertUsers([
      { id: host.id, name: host.name, ...(host.image ? { image: host.image } : {}) },
    ]);
    await stream.video.call(CALL_TYPE, id).getOrCreate({
      data: {
        created_by_id: host.id,
        members: [{ user_id: host.id, role: 'host' }],
        custom: { title },
      },
    });
    await createMeeting({ id, title, host, settings, now: new Date() });
    return json({ id }, 201);
  } catch (error) {
    return handle(error, 'create the meeting');
  }
}
