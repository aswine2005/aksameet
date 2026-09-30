import { errorResponse, getStreamClient } from '@/lib/stream-server';
import { userId } from '@/lib/server';

// The client SDKs call back here to refresh, so the token can be short-lived.
const USER_TOKEN_TTL_SECONDS = 60 * 60;

/**
 * A Stream token for the signed-in user's own Clerk id -- and for nobody
 * else. There are no guests: every AksaMeet participant is signed in, which
 * is what lets attendance name who was there.
 */
export async function POST() {
  try {
    const id = await userId();
    if (!id) return Response.json({ error: 'Sign in to join meetings.' }, { status: 401 });
    const token = getStreamClient().generateUserToken({
      user_id: id,
      validity_in_seconds: USER_TOKEN_TTL_SECONDS,
    });
    return Response.json({ userId: id, token });
  } catch (error) {
    return errorResponse(error, 'Failed to generate token');
  }
}
