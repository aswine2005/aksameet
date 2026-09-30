// Attendance, from join/leave segments.
//
// Pure functions over plain numbers (epoch milliseconds), so the report, the
// live panel and the CSV export all agree, and all of it is testable without
// a database or a clock.

import { AttentionTotals, attentionPercent, emptyTotals } from './attention';

export interface MeetingSettings {
  /** Record who joined, when, and for how long. */
  attendance: boolean;
  /** Estimate, on each student's device, whether they are facing the screen. */
  attention: boolean;
  /** Tell the host once a student has been away this long. */
  awayAlertSeconds: number;
  /** Share of the meeting a student must attend to count as present. */
  presentPercent: number;
  /** Joining this long after the meeting started counts as late. */
  lateAfterMinutes: number;
}

export const DEFAULT_SETTINGS: MeetingSettings = {
  attendance: true,
  attention: true,
  awayAlertSeconds: 60,
  presentPercent: 75,
  lateAfterMinutes: 10,
};

export const ALERT_CHOICES = [30, 60, 120, 300];

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

/** Settings from untrusted input, filled from `base` wherever input is missing or wrong. */
export function sanitizeSettings(
  input: unknown,
  base: MeetingSettings = DEFAULT_SETTINGS
): MeetingSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    attendance: typeof raw.attendance === 'boolean' ? raw.attendance : base.attendance,
    attention: typeof raw.attention === 'boolean' ? raw.attention : base.attention,
    awayAlertSeconds: clampNumber(raw.awayAlertSeconds, 15, 900, base.awayAlertSeconds),
    presentPercent: clampNumber(raw.presentPercent, 1, 100, base.presentPercent),
    lateAfterMinutes: clampNumber(raw.lateAfterMinutes, 0, 240, base.lateAfterMinutes),
  };
}

export interface Segment {
  /** One tab's stay in the meeting, from join to leave. */
  session: string;
  joinedAt: number;
  lastSeenAt: number;
  leftAt: number | null;
}

/**
 * A heartbeat arrives every 15 seconds; a stay with no heartbeat for this
 * long has ended, whether or not the browser said goodbye. A closed laptop
 * lid sends nothing.
 */
export const HEARTBEAT_MS = 15_000;
export const STALE_MS = 45_000;

export const isOpen = (segment: Segment, now: number) =>
  segment.leftAt === null && now - segment.lastSeenAt < STALE_MS;

/** A segment's end: when it left, else its last heartbeat (or now, while live). */
const segmentEnd = (segment: Segment, now: number) =>
  segment.leftAt ?? (isOpen(segment, now) ? now : segment.lastSeenAt);

/**
 * Total time present, with overlapping stays merged.
 *
 * A student with the meeting open in two tabs is not in it twice, and a
 * refresh that rejoins a second before the old tab's leave arrives must not
 * count that second double.
 */
export function presenceMs(segments: Segment[], now: number): number {
  const spans = segments
    .map((s) => [s.joinedAt, Math.max(s.joinedAt, segmentEnd(s, now))] as const)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let start = -Infinity;
  let end = -Infinity;
  for (const [from, to] of spans) {
    if (from > end) {
      if (end > start) total += end - start;
      start = from;
      end = to;
    } else {
      end = Math.max(end, to);
    }
  }
  if (end > start) total += end - start;
  return total;
}

/** Stays that began after an earlier one had ended: coming back, not a second tab. */
export function rejoinCount(segments: Segment[], now: number): number {
  const sorted = [...segments].sort((a, b) => a.joinedAt - b.joinedAt);
  let rejoins = 0;
  let reachedUntil = -Infinity;
  for (const s of sorted) {
    if (reachedUntil !== -Infinity && s.joinedAt > reachedUntil) rejoins += 1;
    reachedUntil = Math.max(reachedUntil, segmentEnd(s, now));
  }
  return rejoins;
}

export interface MeetingWindow {
  startedAt: number | null;
  endedAt: number | null;
  durationMs: number;
  live: boolean;
}

/**
 * When the meeting ran: from the first join to the host ending it, or to the
 * last person's last heartbeat. Live while anyone is still in it.
 */
export function meetingWindow(
  endedAt: number | null,
  everyone: Segment[][],
  now: number
): MeetingWindow {
  const all = everyone.flat();
  if (all.length === 0) return { startedAt: null, endedAt, durationMs: 0, live: false };
  const startedAt = Math.min(...all.map((s) => s.joinedAt));
  const live = endedAt === null && all.some((s) => isOpen(s, now));
  const end = endedAt ?? (live ? now : Math.max(...all.map((s) => segmentEnd(s, now))));
  return { startedAt, endedAt: live ? null : end, durationMs: Math.max(0, end - startedAt), live };
}

export type AttendanceStatus = 'present' | 'partial';

export interface ParticipantRecord {
  userId: string;
  name: string;
  email: string | null;
  image: string | null;
  isHost: boolean;
  segments: Segment[];
  attention: AttentionTotals;
  /** The latest confirmed state, as the student's device last reported it. */
  live: { state: string; since: number; at: number } | null;
}

export interface ParticipantSummary {
  userId: string;
  name: string;
  email: string | null;
  image: string | null;
  isHost: boolean;
  inMeeting: boolean;
  firstJoinAt: number | null;
  lastSeenAt: number | null;
  presentMs: number;
  /** Share of the meeting's duration, 0..100. */
  percentOfMeeting: number;
  joins: number;
  rejoins: number;
  lateByMs: number;
  late: boolean;
  status: AttendanceStatus;
  attentionPercent: number | null;
  attention: AttentionTotals;
  /** Current state and for how long, while in the meeting. */
  liveState: string | null;
  liveStateMs: number;
}

export function summarize(
  p: ParticipantRecord,
  window: MeetingWindow,
  settings: MeetingSettings,
  now: number
): ParticipantSummary {
  const present = presenceMs(p.segments, now);
  const firstJoinAt = p.segments.length ? Math.min(...p.segments.map((s) => s.joinedAt)) : null;
  const lastSeenAt = p.segments.length ? Math.max(...p.segments.map((s) => segmentEnd(s, now))) : null;
  const inMeeting = p.segments.some((s) => isOpen(s, now));
  // Under a minute there is no meaningful share of anything.
  const percent =
    window.durationMs >= 60_000
      ? Math.min(100, Math.round((present / window.durationMs) * 100))
      : 100;
  const lateByMs =
    firstJoinAt !== null && window.startedAt !== null ? Math.max(0, firstJoinAt - window.startedAt) : 0;
  const late = !p.isHost && lateByMs > settings.lateAfterMinutes * 60_000;
  // A state is only live while its reports keep coming.
  const liveFresh = inMeeting && p.live !== null && now - p.live.at < STALE_MS;
  return {
    userId: p.userId,
    name: p.name,
    email: p.email,
    image: p.image,
    isHost: p.isHost,
    inMeeting,
    firstJoinAt,
    lastSeenAt,
    presentMs: present,
    percentOfMeeting: percent,
    joins: p.segments.length,
    rejoins: rejoinCount(p.segments, now),
    lateByMs,
    late,
    status: percent >= settings.presentPercent ? 'present' : 'partial',
    attentionPercent: attentionPercent(p.attention ?? emptyTotals()),
    attention: p.attention ?? emptyTotals(),
    liveState: liveFresh ? p.live!.state : null,
    liveStateMs: liveFresh ? Math.max(0, now - p.live!.since) : 0,
  };
}

export const formatDuration = (ms: number) => {
  const totalMinutes = Math.round(ms / 60_000);
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};
