import { describe, expect, it } from 'vitest';

import { emptyTotals } from './attention';
import {
  DEFAULT_SETTINGS,
  ParticipantRecord,
  STALE_MS,
  Segment,
  meetingWindow,
  presenceMs,
  rejoinCount,
  sanitizeSettings,
  summarize,
} from './attendance';

const MIN = 60_000;
const seg = (from: number, to: number, left = true, session = `s${from}`): Segment => ({
  session,
  joinedAt: from * MIN,
  lastSeenAt: to * MIN,
  leftAt: left ? to * MIN : null,
});

describe('time present', () => {
  it('adds up separate stays', () => {
    expect(presenceMs([seg(0, 10), seg(15, 25)], 60 * MIN)).toBe(20 * MIN);
  });

  it('counts two tabs open at once only once', () => {
    expect(presenceMs([seg(0, 30), seg(10, 40)], 60 * MIN)).toBe(40 * MIN);
  });

  it('runs an open stay up to now while its heartbeats are fresh', () => {
    const now = 20 * MIN;
    const open = { ...seg(0, 0, false), lastSeenAt: now - 5000 };
    expect(presenceMs([open], now)).toBe(20 * MIN);
  });

  it('ends a stay whose heartbeats stopped at its last heartbeat', () => {
    // A closed laptop lid says no goodbye.
    const silent = seg(0, 12, false);
    expect(presenceMs([silent], 12 * MIN + STALE_MS + 1)).toBe(12 * MIN);
  });
});

describe('rejoins', () => {
  it('counts coming back, not a second tab', () => {
    expect(rejoinCount([seg(0, 10), seg(15, 25), seg(30, 40)], 60 * MIN)).toBe(2);
    expect(rejoinCount([seg(0, 30), seg(10, 40)], 60 * MIN)).toBe(0);
  });
});

describe('the meeting’s own duration', () => {
  it('runs from the first join to the last heartbeat once everyone has gone', () => {
    const w = meetingWindow(null, [[seg(2, 40)], [seg(5, 55)]], 90 * MIN);
    expect(w.startedAt).toBe(2 * MIN);
    expect(w.durationMs).toBe(53 * MIN);
    expect(w.live).toBe(false);
  });

  it('stops at the host ending it', () => {
    const w = meetingWindow(30 * MIN, [[seg(0, 30)]], 90 * MIN);
    expect(w.durationMs).toBe(30 * MIN);
  });
});

describe('one participant’s attendance', () => {
  const record = (segments: Segment[], extra: Partial<ParticipantRecord> = {}): ParticipantRecord => ({
    userId: 'u1',
    name: 'Priya',
    email: 'priya@example.com',
    image: null,
    isHost: false,
    segments,
    attention: emptyTotals(),
    live: null,
    ...extra,
  });
  const window = { startedAt: 0, endedAt: 60 * MIN, durationMs: 60 * MIN, live: false };

  it('is present above the threshold and partial below it', () => {
    const present = summarize(record([seg(0, 50)]), window, DEFAULT_SETTINGS, 90 * MIN);
    expect(present.percentOfMeeting).toBe(83);
    expect(present.status).toBe('present');
    const partial = summarize(record([seg(0, 20)]), window, DEFAULT_SETTINGS, 90 * MIN);
    expect(partial.status).toBe('partial');
  });

  it('marks a late arrival late, but never the host', () => {
    const late = summarize(record([seg(15, 60)]), window, DEFAULT_SETTINGS, 90 * MIN);
    expect(late.late).toBe(true);
    expect(late.lateByMs).toBe(15 * MIN);
    const host = summarize(record([seg(15, 60)], { isHost: true }), window, DEFAULT_SETTINGS, 90 * MIN);
    expect(host.late).toBe(false);
  });

  it('reports a live state only while its reports keep coming', () => {
    const now = 30 * MIN;
    const open = { ...seg(0, 0, false), lastSeenAt: now - 3000 };
    const live = { state: 'away', since: now - 70_000, at: now - 3000 };
    const s = summarize(record([open], { live }), { ...window, live: true }, DEFAULT_SETTINGS, now);
    expect(s.inMeeting).toBe(true);
    expect(s.liveState).toBe('away');
    expect(s.liveStateMs).toBe(70_000);
    const stale = summarize(
      record([open], { live: { ...live, at: now - STALE_MS - 1 } }),
      window,
      DEFAULT_SETTINGS,
      now
    );
    expect(stale.liveState).toBeNull();
  });
});

describe('settings from a request', () => {
  it('keeps what is valid and clamps what is not', () => {
    const s = sanitizeSettings({ attention: false, awayAlertSeconds: 5, presentPercent: '80', junk: 1 });
    expect(s).toEqual({ ...DEFAULT_SETTINGS, attention: false, awayAlertSeconds: 15, presentPercent: 80 });
  });
});
