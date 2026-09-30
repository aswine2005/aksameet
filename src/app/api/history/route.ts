import { attentionPercent, emptyTotals } from '@/lib/attention';
import { presenceMs } from '@/lib/attendance';
import { fail, handle, json, userId } from '@/lib/server';
import { listAttended, listHosted, MeetingDoc, toRecord } from '@/lib/store';

const LIVE_WITHIN_MS = 60_000;

function span(meeting: MeetingDoc, now: number) {
  const startedAt = meeting.startedAt?.getTime() ?? null;
  const last = meeting.lastActivityAt?.getTime() ?? null;
  const live = !meeting.endedAt && last !== null && now - last < LIVE_WITHIN_MS;
  const end = meeting.endedAt?.getTime() ?? (live ? now : last);
  return {
    startedAt,
    endedAt: live ? null : end,
    durationMs: startedAt !== null && end !== null ? Math.max(0, end - startedAt) : 0,
    live,
  };
}

// GET /api/history -- meetings I hosted, and meetings I attended.
export async function GET() {
  try {
    const viewer = await userId();
    if (!viewer) return fail(401, 'Sign in first.');
    const now = Date.now();
    const [hosted, attended] = await Promise.all([listHosted(viewer), listAttended(viewer)]);
    return json({
      hosted: hosted.map((m) => ({
        id: m._id,
        title: m.title,
        createdAt: m.createdAt.toISOString(),
        participantCount: m.participantCount,
        settings: m.settings,
        ...span(m, now),
      })),
      attended: attended.map(({ meeting, participant }) => {
        const record = toRecord(participant);
        return {
          id: meeting._id,
          title: meeting.title,
          hostName: meeting.hostName,
          createdAt: meeting.createdAt.toISOString(),
          ...span(meeting, now),
          myPresentMs: presenceMs(record.segments, now),
          myAttentionPercent: attentionPercent(record.attention ?? emptyTotals()),
        };
      }),
    });
  } catch (error) {
    return handle(error, 'load your meeting history');
  }
}
