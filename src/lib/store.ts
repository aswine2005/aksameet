// Meetings, and who was in them.
//
// One document per meeting, and one per (meeting, person). A heartbeat is a
// single atomic update to the person's document plus one to the meeting's --
// no read first -- so sixty students reporting every fifteen seconds is four
// small writes a second, which a free Atlas cluster does not notice.

import {
  ATTENTION_STATES,
  AttentionState,
  AttentionTotals,
  emptyTotals,
} from './attention';
import {
  MeetingSettings,
  ParticipantRecord,
  STALE_MS,
  Segment,
} from './attendance';
import { collections } from './db';

export interface MeetingDoc {
  _id: string;
  title: string;
  hostId: string;
  hostName: string;
  hostEmail: string | null;
  createdAt: Date;
  settings: MeetingSettings;
  /**
   * First join, and the latest heartbeat from anyone. Absent until somebody
   * joins -- not null: `$min` ranks null below every date, so a meeting
   * created with `startedAt: null` would keep it for ever.
   */
  startedAt?: Date;
  lastActivityAt?: Date;
  /** Set when the host ends the meeting for everyone. */
  endedAt: Date | null;
  participantCount: number;
}

interface SegmentDoc {
  session: string;
  joinedAt: Date;
  lastSeenAt: Date;
  leftAt: Date | null;
}

export interface ParticipantDoc {
  _id: string;
  meetingId: string;
  userId: string;
  name: string;
  email: string | null;
  image: string | null;
  isHost: boolean;
  createdAt: Date;
  segments: SegmentDoc[];
  attention: AttentionTotals;
  live: { state: AttentionState; since: Date; at: Date } | null;
  /** Per clock minute: attentive and observed milliseconds, for the report's timeline. */
  timeline: Record<string, { a?: number; m?: number }>;
}

export interface Person {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
}

/** Who a heartbeat is from. The profile is only looked up on join. */
export type Reporter = { id: string } & Partial<Omit<Person, 'id'>>;

const participantId = (meetingId: string, userId: string) => `${meetingId}:${userId}`;

export async function createMeeting(input: {
  id: string;
  title: string;
  host: Person;
  settings: MeetingSettings;
  now: Date;
}): Promise<MeetingDoc> {
  const { meetings } = await collections();
  const doc: MeetingDoc = {
    _id: input.id,
    title: input.title,
    hostId: input.host.id,
    hostName: input.host.name,
    hostEmail: input.host.email,
    createdAt: input.now,
    settings: input.settings,
    endedAt: null,
    participantCount: 0,
  };
  await meetings.insertOne(doc);
  return doc;
}

export async function getMeeting(id: string): Promise<MeetingDoc | null> {
  const { meetings } = await collections();
  return meetings.findOne({ _id: id });
}

export async function updateSettings(id: string, settings: MeetingSettings) {
  const { meetings } = await collections();
  await meetings.updateOne({ _id: id }, { $set: { settings } });
}

export async function endMeeting(id: string, now: Date) {
  const { meetings } = await collections();
  await meetings.updateOne({ _id: id, endedAt: null }, { $set: { endedAt: now } });
}

export type PresenceType = 'join' | 'beat' | 'leave';

export interface PresenceInput {
  meetingId: string;
  person: Reporter;
  isHost: boolean;
  type: PresenceType;
  /** Random per tab and per join, chosen by the browser. */
  session: string;
  /** Time spent in each state since the last report. */
  attention?: Partial<AttentionTotals>;
  live?: { state: AttentionState; since: number } | null;
  now: Date;
}

/** Longest a single report may claim: a little over one heartbeat. */
export const MAX_REPORT_MS = 20_000;

export function cleanAttention(input: Partial<AttentionTotals> | undefined): AttentionTotals {
  const totals = emptyTotals();
  if (!input) return totals;
  let budget = MAX_REPORT_MS;
  for (const state of ATTENTION_STATES) {
    const value = Number(input[state]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const taken = Math.min(value, budget);
    totals[state] = Math.round(taken);
    budget -= taken;
  }
  return totals;
}

export async function recordPresence(input: PresenceInput): Promise<void> {
  const { meetings, participants } = await collections();
  const { meetingId, person, session, now } = input;
  const _id = participantId(meetingId, person.id);

  const attention = cleanAttention(input.attention);
  const inc: Record<string, number> = {};
  for (const state of ATTENTION_STATES) {
    if (attention[state]) inc[`attention.${state}`] = attention[state];
  }
  const observed = attention.attentive + attention.away + attention.eyes_closed + attention.no_face + attention.tab_hidden;
  if (observed > 0) {
    const minute = Math.floor(now.getTime() / 60_000);
    inc[`timeline.${minute}.a`] = attention.attentive;
    inc[`timeline.${minute}.m`] = observed;
  }

  const set: Record<string, unknown> = {};
  if (input.live && ATTENTION_STATES.includes(input.live.state)) {
    set.live = {
      state: input.live.state,
      since: new Date(Math.min(input.live.since, now.getTime())),
      at: now,
    };
  }

  // The stay this report belongs to: same tab, not left, and heard from
  // recently. A laptop that slept past STALE_MS starts a new stay on waking,
  // so the time it was shut is never counted as time in the meeting.
  const fresh = {
    _id,
    segments: {
      $elemMatch: {
        session,
        leftAt: null,
        lastSeenAt: { $gte: new Date(now.getTime() - STALE_MS) },
      },
    },
  };

  const extend = {
    ...(Object.keys(inc).length ? { $inc: inc } : {}),
    $set: {
      ...set,
      'segments.$.lastSeenAt': now,
      ...(input.type === 'leave' ? { 'segments.$.leftAt': now } : {}),
    },
  };
  const extended = await participants.updateOne(fresh, extend);

  if (extended.matchedCount === 0 && input.type !== 'leave') {
    // A new stay: a join, or a heartbeat whose stay has lapsed.
    const segment: SegmentDoc = { session, joinedAt: now, lastSeenAt: now, leftAt: null };
    const result = await participants.updateOne(
      { _id },
      {
        $setOnInsert: {
          meetingId,
          userId: person.id,
          isHost: input.isHost,
          createdAt: now,
          timeline: {},
          attention: emptyTotals(),
          // Only when this report carries no profile of its own.
          ...(person.name === undefined ? { name: 'Participant', email: null, image: null } : {}),
        },
        $set: {
          ...(person.name === undefined
            ? {}
            : { name: person.name, email: person.email ?? null, image: person.image ?? null }),
          ...set,
        },
        $push: { segments: segment },
      },
      { upsert: true }
    );
    if (result.upsertedCount) {
      await meetings.updateOne({ _id: meetingId }, { $inc: { participantCount: 1 } });
    }
    // Separately: $setOnInsert and $inc may not touch the same path in one
    // update, and a new document's `attention` is created by the first.
    if (Object.keys(inc).length) await participants.updateOne({ _id }, { $inc: inc });
  }

  await meetings.updateOne(
    { _id: meetingId },
    { $min: { startedAt: now }, $max: { lastActivityAt: now } }
  );
}

const toSegment = (s: SegmentDoc): Segment => ({
  session: s.session,
  joinedAt: s.joinedAt.getTime(),
  lastSeenAt: s.lastSeenAt.getTime(),
  leftAt: s.leftAt ? s.leftAt.getTime() : null,
});

export function toRecord(doc: ParticipantDoc): ParticipantRecord {
  return {
    userId: doc.userId,
    name: doc.name,
    email: doc.email,
    image: doc.image,
    isHost: doc.isHost,
    segments: doc.segments.map(toSegment),
    attention: { ...emptyTotals(), ...(doc.attention ?? {}) },
    live: doc.live
      ? { state: doc.live.state, since: doc.live.since.getTime(), at: doc.live.at.getTime() }
      : null,
  };
}

export async function listParticipants(meetingId: string): Promise<ParticipantDoc[]> {
  const { participants } = await collections();
  return participants.find({ meetingId }).sort({ createdAt: 1 }).toArray();
}

export async function getParticipant(meetingId: string, userId: string) {
  const { participants } = await collections();
  return participants.findOne({ _id: participantId(meetingId, userId) });
}

export async function listHosted(hostId: string, limit = 50): Promise<MeetingDoc[]> {
  const { meetings } = await collections();
  return meetings.find({ hostId }).sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function listAttended(
  userId: string,
  limit = 50
): Promise<{ meeting: MeetingDoc; participant: ParticipantDoc }[]> {
  const { meetings, participants } = await collections();
  const mine = await participants
    .find({ userId, isHost: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  if (mine.length === 0) return [];
  const found = await meetings.find({ _id: { $in: mine.map((p) => p.meetingId) } }).toArray();
  const byId = new Map(found.map((m) => [m._id, m]));
  return mine.flatMap((participant) => {
    const meeting = byId.get(participant.meetingId);
    return meeting ? [{ meeting, participant }] : [];
  });
}
