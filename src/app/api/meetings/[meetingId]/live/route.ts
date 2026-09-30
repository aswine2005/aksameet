import { ALERT_STATES, AttentionState } from '@/lib/attention';
import { buildReport, fail, handle, json, userId, validMeetingId } from '@/lib/server';
import { getMeeting, listParticipants } from '@/lib/store';

type RouteContext = { params: Promise<{ meetingId: string }> };

/**
 * GET /api/meetings/:id/live -- the host's private panel.
 *
 * Polled every few seconds by the host's browser, and by nobody else: the
 * check is here, on the server, not in which buttons a student's screen
 * happens to draw.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { meetingId } = await params;
  if (!validMeetingId(meetingId)) return fail(400, 'Invalid meeting code');
  try {
    const viewer = await userId();
    if (!viewer) return fail(401, 'Sign in first.');
    const meeting = await getMeeting(meetingId);
    if (!meeting) return fail(404, 'Meeting not found');
    if (meeting.hostId !== viewer) return fail(403, 'Only the host can see this.');

    const now = Date.now();
    const report = buildReport(meeting, await listParticipants(meetingId), viewer, now);
    const threshold = meeting.settings.awayAlertSeconds * 1000;
    const alerts = report.participants
      .filter(
        (p) =>
          p.inMeeting &&
          !p.isHost &&
          p.liveState !== null &&
          ALERT_STATES.includes(p.liveState as AttentionState) &&
          p.liveStateMs >= threshold
      )
      .map((p) => ({ userId: p.userId, name: p.name, state: p.liveState, forMs: p.liveStateMs }));
    return json({ ...report, alerts, now });
  } catch (error) {
    return handle(error, 'load the live panel');
  }
}
