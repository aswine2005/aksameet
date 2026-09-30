import { CALL_TYPE, MEETING_ID_REGEX } from '@/lib/constants';
import {
  errorResponse,
  getStreamClient,
  isNotFoundError,
} from '@/lib/stream-server';

type RouteContext = { params: Promise<{ meetingId: string }> };

// GET /api/meetings/:meetingId — lets the home page check a code before
// navigating, without having to connect a Stream client first.
export async function GET(_request: Request, { params }: RouteContext) {
  const { meetingId } = await params;
  if (!MEETING_ID_REGEX.test(meetingId)) {
    return Response.json({ error: 'Invalid meeting code' }, { status: 400 });
  }

  try {
    await getStreamClient().video.call(CALL_TYPE, meetingId).get();
    return Response.json({ meetingId });
  } catch (error) {
    if (isNotFoundError(error)) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }
    return errorResponse(error, 'Failed to look up meeting');
  }
}
