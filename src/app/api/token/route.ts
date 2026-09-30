import { auth } from '@clerk/nextjs/server';
import { nanoid } from 'nanoid';

import { GUEST_ID_PREFIX } from '@/lib/constants';
import { errorResponse, getStreamClient } from '@/lib/stream-server';

// Signed-in users' tokens are short-lived; the client SDKs call back here to
// refresh them. Guests can't refresh (they have no session), so their token
// has to outlive a meeting.
const USER_TOKEN_TTL_SECONDS = 60 * 60;
const GUEST_TOKEN_TTL_SECONDS = 12 * 60 * 60;

/**
 * Signed-in users get a token for their own Clerk user id. Everyone else gets
 * a brand-new guest identity, so a caller can never obtain a token for a user
 * id it doesn't own.
 */
export async function POST() {
  try {
    const client = getStreamClient();
    const { userId } = await auth();

    if (userId) {
      const token = client.generateUserToken({
        user_id: userId,
        validity_in_seconds: USER_TOKEN_TTL_SECONDS,
      });
      return Response.json({ userId, token });
    }

    const guestId = `${GUEST_ID_PREFIX}${nanoid(16)}`;
    const token = client.generateUserToken({
      user_id: guestId,
      validity_in_seconds: GUEST_TOKEN_TTL_SECONDS,
    });
    const expiresAt = Date.now() + GUEST_TOKEN_TTL_SECONDS * 1000;
    return Response.json({ userId: guestId, token, expiresAt });
  } catch (error) {
    return errorResponse(error, 'Failed to generate token');
  }
}
