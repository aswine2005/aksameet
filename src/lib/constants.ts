// Shared between client components and route handlers, so keep this module
// free of 'use client' and server-only imports.

export const CALL_TYPE = 'default';
export const CHAT_CHANNEL_TYPE = 'messaging';

export const MEETING_ID_REGEX = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

// Guest user ids are minted by /api/token and never collide with Clerk ids
// (which start with `user_`).
export const GUEST_ID_PREFIX = 'guest_';
