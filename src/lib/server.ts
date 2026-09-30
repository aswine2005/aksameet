// What every API route needs: who is asking, and a consistent way to fail.

import { auth, currentUser } from '@clerk/nextjs/server';

import { isOpen, MeetingSettings, meetingWindow, summarize, ParticipantSummary } from './attendance';
import { MissingDatabaseError } from './db';
import { MissingConfigError } from './stream-server';
import { MeetingDoc, ParticipantDoc, Person, toRecord } from './store';
import { MEETING_ID_REGEX } from './constants';

export const noStore = { 'Cache-Control': 'no-store' };

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: noStore });

export const fail = (status: number, error: string) => json({ error }, status);

/**
 * The signed-in user's id, from the session token alone.
 *
 * No network call: `auth()` verifies the token locally. A heartbeat arrives
 * every fifteen seconds from every student, and asking Clerk's API for a
 * profile on each would be four calls a second for a class of sixty -- well
 * into its rate limits.
 */
export async function userId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/** The full profile, for the moments it is needed: creating or joining. */
export async function person(): Promise<Person | null> {
  const user = await currentUser();
  if (!user) return null;
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  return {
    id: user.id,
    name:
      user.fullName || user.username || email || 'User',
    email,
    image: user.hasImage ? user.imageUrl : null,
  };
}

export const validMeetingId = (id: string) => MEETING_ID_REGEX.test(id);

export function handle(error: unknown, action: string) {
  if (error instanceof MissingDatabaseError) {
    console.error(error.message);
    return fail(503, 'The meeting database is not configured (set MONGODB_URI).');
  }
  if (error instanceof MissingConfigError) {
    console.error(error.message);
    return fail(503, 'The video service is not configured.');
  }
  console.error(`Failed to ${action}`, error);
  return fail(500, `Failed to ${action}.`);
}

/** What anyone in the meeting may know about it. */
export function publicMeeting(meeting: MeetingDoc, viewerId: string) {
  return {
    id: meeting._id,
    title: meeting.title,
    hostName: meeting.hostName,
    isHost: meeting.hostId === viewerId,
    createdAt: meeting.createdAt.toISOString(),
    endedAt: meeting.endedAt ? meeting.endedAt.toISOString() : null,
    // Students are told what is being measured; only the host sees results.
    settings: meeting.settings,
  };
}

export interface Report {
  meeting: ReturnType<typeof publicMeeting>;
  window: { startedAt: number | null; endedAt: number | null; durationMs: number; live: boolean };
  participants: ParticipantSummary[];
  /** Per participant: minute -> share of that minute spent attentive (0..100). */
  timelines: Record<string, Record<string, number>>;
  /** Per participant: when they were in the meeting, as [from, to] pairs. */
  spans: Record<string, [number, number][]>;
}

export function buildReport(
  meeting: MeetingDoc,
  docs: ParticipantDoc[],
  viewerId: string,
  now: number,
  withTimelines = false
): Report {
  const records = docs.map(toRecord);
  const window = meetingWindow(
    meeting.endedAt ? meeting.endedAt.getTime() : null,
    records.map((r) => r.segments),
    now
  );
  const settings: MeetingSettings = meeting.settings;
  const participants = records
    .map((r) => summarize(r, window, settings, now))
    .sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.name.localeCompare(b.name));

  const timelines: Report['timelines'] = {};
  const spans: Report['spans'] = {};
  if (withTimelines) {
    for (const record of records) {
      spans[record.userId] = record.segments.map((segment) => [
        segment.joinedAt,
        segment.leftAt ?? (isOpen(segment, now) ? now : segment.lastSeenAt),
      ]);
    }
    for (const doc of docs) {
      const series: Record<string, number> = {};
      for (const [minute, bucket] of Object.entries(doc.timeline ?? {})) {
        if (bucket.m && bucket.m > 0) {
          series[minute] = Math.round(((bucket.a ?? 0) / bucket.m) * 100);
        }
      }
      timelines[doc.userId] = series;
    }
  }
  return { meeting: publicMeeting(meeting, viewerId), window, participants, timelines, spans };
}
