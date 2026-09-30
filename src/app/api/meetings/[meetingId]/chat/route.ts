import {
  CALL_TYPE,
  CHAT_CHANNEL_TYPE,
  MEETING_ID_REGEX,
} from '@/lib/constants';
import { userId as signedInUserId } from '@/lib/server';
import { errorResponse, getStreamClient, isNotFoundError } from '@/lib/stream-server';

type RouteContext = { params: Promise<{ meetingId: string }> };

// POST /api/meetings/:meetingId/chat — adds the caller to the meeting's chat
// channel. `messaging` channels only let members read and post, and clients
// can't add themselves, so membership has to be granted server-side.
export async function POST(_request: Request, { params }: RouteContext) {
  const { meetingId } = await params;
  if (!MEETING_ID_REGEX.test(meetingId)) {
    return Response.json({ error: 'Invalid meeting code' }, { status: 400 });
  }

  const userId = await signedInUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = getStreamClient();

    try {
      await client.video.call(CALL_TYPE, meetingId).get();
    } catch (error) {
      if (isNotFoundError(error)) {
        return Response.json({ error: 'Meeting not found' }, { status: 404 });
      }
      throw error;
    }

    const channel = client.chat.channel(CHAT_CHANNEL_TYPE, meetingId);
    await channel.getOrCreate({ data: { created_by_id: userId } });
    await channel.update({ add_members: [{ user_id: userId }] });

    return Response.json({ type: CHAT_CHANNEL_TYPE, id: meetingId });
  } catch (error) {
    return errorResponse(error, 'Failed to join meeting chat');
  }
}
