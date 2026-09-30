import { CALL_TYPE } from '@/lib/constants';
import { fail, handle, json, userId, validMeetingId } from '@/lib/server';
import { getStreamClient, isNotFoundError } from '@/lib/stream-server';
import { endMeeting, getMeeting } from '@/lib/store';

type RouteContext = { params: Promise<{ meetingId: string }> };

// POST /api/meetings/:id/end -- the host ends the meeting for everyone.
export async function POST(_request: Request, { params }: RouteContext) {
  const { meetingId } = await params;
  if (!validMeetingId(meetingId)) return fail(400, 'Invalid meeting code');
  try {
    const viewer = await userId();
    if (!viewer) return fail(401, 'Sign in first.');
    const meeting = await getMeeting(meetingId);
    if (!meeting) return fail(404, 'Meeting not found');
    if (meeting.hostId !== viewer) return fail(403, 'Only the host can end the meeting.');

    // The record first: the meeting's duration stops here even if the video
    // service is slow to hang everybody up.
    await endMeeting(meetingId, new Date());
    try {
      await getStreamClient().video.call(CALL_TYPE, meetingId).end();
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
    return json({ ended: true });
  } catch (error) {
    return handle(error, 'end the meeting');
  }
}
