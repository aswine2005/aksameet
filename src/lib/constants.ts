// Shared between client components and route handlers, so keep this module
// free of 'use client' and server-only imports.

export const CALL_TYPE = 'default';
export const CHAT_CHANNEL_TYPE = 'messaging';

export const MEETING_ID_REGEX = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

export const MAX_TITLE_LENGTH = 80;
