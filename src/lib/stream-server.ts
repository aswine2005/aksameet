import { StreamClient } from '@stream-io/node-sdk';

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
