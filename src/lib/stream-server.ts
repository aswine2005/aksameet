import { createHmac, timingSafeEqual } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { StreamClient } from '@stream-io/node-sdk';

import { GUEST_ID_PREFIX } from './constants';

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const API_SECRET = process.env.STREAM_API_SECRET;

let client: StreamClient | undefined;

export class MissingConfigError extends Error {}

export const getStreamClient = () => {
  if (!API_KEY || !API_SECRET) {
    throw new MissingConfigError(
      'NEXT_PUBLIC_STREAM_API_KEY and STREAM_API_SECRET must be set'
    );
  }
  client ??= new StreamClient(API_KEY, API_SECRET);
  return client;
};

export const isNotFoundError = (error: unknown) =>
  (error as { metadata?: { responseCode?: number } })?.metadata
    ?.responseCode === 404;

export const errorResponse = (error: unknown, fallback: string) => {
  if (error instanceof MissingConfigError) {
    console.error(error.message);
    return Response.json({ error: 'Stream is not configured' }, { status: 500 });
  }
  console.error(fallback, error);
  return Response.json({ error: fallback }, { status: 500 });
};

/**
 * Returns the user id of a Stream user token signed with our secret,
 * or null when the token is malformed, forged or expired.
 */
const verifyStreamToken = (token: string): string | null => {
  if (!API_SECRET) return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;

  const expected = createHmac('sha256', API_SECRET)
    .update(`${header}.${payload}`)
    .digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;

  try {
    const { alg } = JSON.parse(Buffer.from(header, 'base64url').toString());
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (alg !== 'HS256') return null;
    if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now())
      return null;
    return typeof claims.user_id === 'string' ? claims.user_id : null;
  } catch {
    return null;
  }
};

/**
 * Identifies the caller: either a signed-in Clerk user, or a guest proving
 * its identity with the Stream token that /api/token issued to it.
 */
export const getRequestUserId = async (request: Request) => {
  const { userId } = await auth();
  if (userId) return userId;

  const token = request.headers
    .get('authorization')
    ?.match(/^Bearer (.+)$/)?.[1];
  const guestId = token ? verifyStreamToken(token) : null;
  return guestId?.startsWith(GUEST_ID_PREFIX) ? guestId : null;
};
