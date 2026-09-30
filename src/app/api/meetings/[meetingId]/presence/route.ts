import { AttentionState, ATTENTION_STATES } from '@/lib/attention';
import { fail, handle, json, person, userId, validMeetingId } from '@/lib/server';
import { getMeeting, PresenceType, recordPresence, Reporter } from '@/lib/store';

type RouteContext = { params: Promise<{ meetingId: string }> };

const TYPES: PresenceType[] = ['join', 'beat', 'leave'];
const SESSION = /^[A-Za-z0-9_-]{8,40}$/;

/**
 * POST /api/meetings/:id/presence -- a browser saying "still here".
 *
 * Sent on join, every fifteen seconds, and on leave (as a beacon, which
 * survives the tab closing). The body carries only minutes: how long this
 * tab spent in each attention state since the last report. No image, no
 * landmarks -- the looking was done on the student's own device.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { meetingId } = await params;
  if (!validMeetingId(meetingId)) return fail(400, 'Invalid meeting code');
  try {
    const id = await userId();
    if (!id) return fail(401, 'Sign in first.');

    const body = (await request.json().catch(() => null)) as {
      type?: unknown;
      session?: unknown;
      attention?: Record<string, unknown>;
      live?: { state?: unknown; since?: unknown } | null;
    } | null;
    const type = TYPES.find((t) => t === body?.type);
    const session = typeof body?.session === 'string' && SESSION.test(body.session) ? body.session : null;
    if (!type || !session) return fail(400, 'Malformed report');

    const meeting = await getMeeting(meetingId);
    if (!meeting) return fail(404, 'Meeting not found');
    const isHost = meeting.hostId === id;
    // Once the host has ended it, nobody's minutes run on. A leave is still
    // taken, so a stay open at the end closes where it really stopped.
    if (meeting.endedAt && type !== 'leave') {
      return json({ recorded: false, settings: meeting.settings, endedAt: meeting.endedAt });
    }
    // The host's choice holds on the server, not only in the browser.
    if (!meeting.settings.attendance && !isHost) return json({ recorded: false });

    const measuring = meeting.settings.attention;
    const state = ATTENTION_STATES.find((s) => s === body?.live?.state) as AttentionState | undefined;
    const since = Number(body?.live?.since);

    // The profile is fetched from Clerk on join only; see `userId`.
    const reporter: Reporter = type === 'join' ? ((await person()) ?? { id }) : { id };

    await recordPresence({
      meetingId,
      person: reporter,
      isHost,
      type,
      session,
      attention: measuring ? (body?.attention as Record<string, number> | undefined) : undefined,
      live: measuring && state && Number.isFinite(since) ? { state, since } : null,
      now: new Date(),
    });
    return json({ recorded: true, settings: meeting.settings, endedAt: meeting.endedAt });
  } catch (error) {
    return handle(error, 'record presence');
  }
}
