// Attention, decided on the student's own device.
//
// Everything here is pure: a face reading goes in, a state comes out. The
// camera frames never leave the browser -- only the time spent in each state
// is sent to the server, a few numbers every few seconds. That is what keeps
// a class of sixty as cheap as a class of five: every student's laptop does
// its own looking, and the server only adds up minutes.
//
// This is a meeting, not an exam, so the thresholds are loose on purpose. A
// student glancing at their notes or at a second window for a few seconds is
// attending; one who has been turned away for a minute is what the host is
// told about.

export type AttentionState =
  | 'attentive'
  | 'away'
  | 'eyes_closed'
  | 'no_face'
  | 'camera_off'
  | 'tab_hidden';

export const ATTENTION_STATES: AttentionState[] = [
  'attentive',
  'away',
  'eyes_closed',
  'no_face',
  'camera_off',
  'tab_hidden',
];

/** Milliseconds spent in each state. */
export type AttentionTotals = Record<AttentionState, number>;

export const emptyTotals = (): AttentionTotals => ({
  attentive: 0,
  away: 0,
  eyes_closed: 0,
  no_face: 0,
  camera_off: 0,
  tab_hidden: 0,
});

export const STATE_LABEL: Record<AttentionState, string> = {
  attentive: 'Looking at the screen',
  away: 'Looking away',
  eyes_closed: 'Eyes closed',
  no_face: 'Not in front of the camera',
  camera_off: 'Camera off',
  tab_hidden: 'On another tab or window',
};

/** States that count against attention when the camera can see. */
export const NOT_ATTENTIVE: AttentionState[] = ['away', 'eyes_closed', 'no_face', 'tab_hidden'];

/**
 * States the host is alerted about once they last past the threshold.
 *
 * Camera-off is here though it is not in NOT_ATTENTIVE: it never counts
 * against a student's attention -- the model cannot see, so it says nothing
 * -- but a camera turned off for minutes is the one way to be invisible to
 * this whole feature, and the host is entitled to know it is happening.
 */
export const ALERT_STATES: AttentionState[] = [...NOT_ATTENTIVE, 'camera_off'];

/**
 * Head pose limits, in radians, for "facing the screen".
 *
 * A laptop camera sits above the screen, so a student reading it already
 * looks slightly down at the lens -- which is why "down" is allowed further
 * than "up" or "sideways". Looser than AksaRank's exam limits (0.3 rad of
 * yaw), because a class allows a glance that an exam does not.
 */
export const YAW_LIMIT = 0.45; // ~26 degrees either side
export const PITCH_DOWN_LIMIT = 0.6; // ~34 degrees, chin towards the desk
export const PITCH_UP_LIMIT = 0.45; // ~26 degrees

/** Eye blendshape scores (0..1) above which the eyes are doing something else. */
export const GAZE_SIDE_LIMIT = 0.62;
export const GAZE_DOWN_LIMIT = 0.68;
export const EYES_CLOSED_LIMIT = 0.55;

export interface FaceReading {
  yaw: number | null;
  pitch: number | null;
  /** MediaPipe face blendshapes, by category name. */
  blendshapes: Record<string, number> | null;
}

export interface FrameInput {
  cameraOn: boolean;
  tabHidden: boolean;
  faces: FaceReading[];
}

const score = (b: Record<string, number> | null, name: string) => b?.[name] ?? 0;

/** One frame's verdict, before smoothing. */
export function classifyFrame(input: FrameInput): AttentionState {
  // A hidden tab first: the camera may still see a face looking at the
  // screen, but the screen is showing something other than the class.
  if (input.tabHidden) return 'tab_hidden';
  if (!input.cameraOn) return 'camera_off';
  const face = input.faces[0];
  if (!face) return 'no_face';

  const b = face.blendshapes;
  const closed = (score(b, 'eyeBlinkLeft') + score(b, 'eyeBlinkRight')) / 2;
  if (closed > EYES_CLOSED_LIMIT) return 'eyes_closed';

  if (face.yaw !== null && Math.abs(face.yaw) > YAW_LIMIT) return 'away';
  if (face.pitch !== null) {
    if (face.pitch > PITCH_DOWN_LIMIT) return 'away';
    if (face.pitch < -PITCH_UP_LIMIT) return 'away';
  }

  if (b) {
    // Both eyes turned the same way: out on one side is in on the other.
    const toOneSide = Math.min(score(b, 'eyeLookOutLeft'), score(b, 'eyeLookInRight'));
    const toOtherSide = Math.min(score(b, 'eyeLookInLeft'), score(b, 'eyeLookOutRight'));
    if (Math.max(toOneSide, toOtherSide) > GAZE_SIDE_LIMIT) return 'away';
    const down = (score(b, 'eyeLookDownLeft') + score(b, 'eyeLookDownRight')) / 2;
    if (down > GAZE_DOWN_LIMIT) return 'away';
  }
  return 'attentive';
}

/**
 * How long a new state must hold before it replaces the current one.
 *
 * Eyes move several times a second and blinks last a few hundred
 * milliseconds; counting each of those would paint an attentive student as
 * restless. A change has to persist before it is believed. Leaving the tab is
 * believed at once -- the browser reports it, nothing is being estimated.
 */
export const CONFIRM_MS = 1500;
export const EYES_CLOSED_CONFIRM_MS = 3000;

export interface Tracker {
  state: AttentionState;
  /** When the current state was confirmed. */
  since: number;
  /** A different state seen recently and not yet confirmed. */
  candidate: AttentionState | null;
  candidateSince: number;
  /** Time counted but not yet reported. */
  pending: AttentionTotals;
  /** The last time `step` ran, for counting. */
  last: number;
}

export function startTracker(now: number, state: AttentionState = 'attentive'): Tracker {
  return {
    state,
    since: now,
    candidate: null,
    candidateSince: now,
    pending: emptyTotals(),
    last: now,
  };
}

/** Advance by one frame. Mutates and returns the tracker. */
export function step(tracker: Tracker, raw: AttentionState, now: number): Tracker {
  // Gaps are capped: a laptop that slept for ten minutes did not spend them
  // in whatever state it happened to be in when it closed. A hidden tab is
  // allowed a longer gap, because the browser itself says the tab is hidden
  // and may still slow a page it is not showing.
  const cap = tracker.state === 'tab_hidden' ? 70_000 : 5000;
  const elapsed = Math.min(Math.max(0, now - tracker.last), cap);
  tracker.pending[tracker.state] += elapsed;
  tracker.last = now;

  if (raw === tracker.state) {
    tracker.candidate = null;
    return tracker;
  }
  if (tracker.candidate !== raw) {
    tracker.candidate = raw;
    tracker.candidateSince = now;
  }
  const needed =
    raw === 'tab_hidden' || raw === 'camera_off'
      ? 0
      : raw === 'eyes_closed'
        ? EYES_CLOSED_CONFIRM_MS
        : CONFIRM_MS;
  if (now - tracker.candidateSince >= needed) {
    tracker.state = raw;
    tracker.since = tracker.candidateSince;
    tracker.candidate = null;
  }
  return tracker;
}

/** Hand over what has been counted since the last report, and start afresh. */
export function drain(tracker: Tracker): AttentionTotals {
  const out = tracker.pending;
  tracker.pending = emptyTotals();
  return out;
}

/**
 * Share of observed time spent attentive, 0..100, or null when too little was
 * observed to say anything.
 *
 * Camera-off time is left out of both sides: the model cannot see, so it
 * neither counts for a student nor against them. It is reported separately,
 * and the host decides what a camera left off means.
 */
export function attentionPercent(totals: AttentionTotals, minObservedMs = 30_000): number | null {
  const observed =
    totals.attentive + totals.away + totals.eyes_closed + totals.no_face + totals.tab_hidden;
  if (observed < minObservedMs) return null;
  return Math.round((totals.attentive / observed) * 100);
}

/** Yaw and pitch from MediaPipe's column-major 4x4 facial transformation matrix. */
export function poseFromMatrix(data: ArrayLike<number>): { yaw: number; pitch: number } | null {
  if (data.length < 16) return null;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  // Same extraction as AksaRank's exam proctoring: rotation about Y is the
  // head turning, rotation about X is the chin nodding (positive = down).
  const yaw = Math.asin(clamp(-(data[2] ?? 0)));
  const pitch = Math.atan2(data[6] ?? 0, data[10] ?? 0);
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return null;
  return { yaw, pitch };
}
