import { sanitizeSettings } from '@/lib/attendance';
import { fail, handle, json, publicMeeting, userId, validMeetingId } from '@/lib/server';
import { getMeeting, updateSettings } from '@/lib/store';

type RouteContext = { params: Promise<{ meetingId: string }> };

// GET /api/meetings/:id -- the meeting's title, host and what is measured.
// Everyone who can join may see this; only the host sees anybody's results.
export async function GET(_request: Request, { params }: RouteContext) {
  const { meetingId } = await params;
  if (!validMeetingId(meetingId)) return fail(400, 'Invalid meeting code');
  try {
    const viewer = await userId();
    if (!viewer) return fail(401, 'Sign in to join meetings.');
    const meeting = await getMeeting(meetingId);
    if (!meeting) return fail(404, 'Meeting not found');
    return json(publicMeeting(meeting, viewer));
  } catch (error) {
    return handle(error, 'look up the meeting');
  }
}

// PATCH /api/meetings/:id -- the host changes what is measured, mid-meeting too.
export async function PATCH(request: Request, { params }: RouteContext) {
  const { meetingId } = await params;
  if (!validMeetingId(meetingId)) return fail(400, 'Invalid meeting code');
  try {
    const viewer = await userId();
    if (!viewer) return fail(401, 'Sign in first.');
    const meeting = await getMeeting(meetingId);
    if (!meeting) return fail(404, 'Meeting not found');
    if (meeting.hostId !== viewer) return fail(403, 'Only the host can change these settings.');
    const body = (await request.json().catch(() => ({}))) as { settings?: unknown };
    const settings = sanitizeSettings(body.settings, meeting.settings);
    await updateSettings(meetingId, settings);
    return json(publicMeeting({ ...meeting, settings }, viewer));
  } catch (error) {
    return handle(error, 'update the meeting');
  }
}
