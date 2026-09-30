'use client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

import type { AttentionTotals, AttentionState } from '@/lib/attention';
import type { MeetingSettings } from '@/lib/attendance';
import { HEARTBEAT_MS } from '@/lib/attendance';
import { newSessionId, steadyInterval } from '@/lib/client/steadyInterval';

type Take = () => {
  totals: AttentionTotals | null;
  live: { state: AttentionState; since: number } | null;
};

interface Options {
  meetingId: string;
  /** True once the call is joined. */
  active: boolean;
  takeTotals: Take;
  /** The host may change what is measured mid-meeting; every reply says. */
  onSettings?: (settings: MeetingSettings) => void;
}

/**
 * Tells the server this person is in the meeting: on join, every fifteen
 * seconds, and on leave.
 *
 * **A token on every report, not just the cookie.** Clerk's session cookie
 * lives about a minute and is refreshed by a timer the browser slows down in
 * a hidden tab -- exactly when a student is in another window and most needs
 * their attendance to keep counting. `getToken()` returns a fresh one each
 * time. The last token is kept for the leave report, which is sent while the
 * page is going away and cannot wait for a new one.
 */
export function usePresence({ meetingId, active, takeTotals, onSettings }: Options) {
  const { getToken } = useAuth();
  // Held in refs, not effect dependencies: if any of these changed identity
  // the effect would re-run, which reports a leave and a new join -- a
  // phantom "rejoin" on the student's attendance record.
  const tokenSource = useRef(getToken);
  tokenSource.current = getToken;
  const take = useRef(takeTotals);
  take.current = takeTotals;
  const settingsCallback = useRef(onSettings);
  settingsCallback.current = onSettings;

  useEffect(() => {
    if (!active) return;
    const session = newSessionId();
    const url = `/api/meetings/${meetingId}/presence`;
    let token: string | null = null;
    let left = false;

    const send = async (type: 'join' | 'beat' | 'leave', fresh = true) => {
      const { totals, live } = take.current();
      if (fresh) token = (await tokenSource.current().catch(() => null)) ?? token;
      const response = await fetch(url, {
        method: 'POST',
        // keepalive lets the leave report outlive the tab that sent it.
        keepalive: type === 'leave',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type, session, attention: totals ?? undefined, live }),
      }).catch(() => null);
      if (response?.ok) {
        const data = (await response.json().catch(() => null)) as { settings?: MeetingSettings } | null;
        if (data?.settings) settingsCallback.current?.(data.settings);
      }
    };

    const leave = () => {
      if (left) return;
      left = true;
      void send('leave', false);
    };

    void send('join');
    const stop = steadyInterval(() => void send('beat'), HEARTBEAT_MS);
    // pagehide fires on tab close and navigation; beforeunload is not
    // reliable on mobile and blocks the back-forward cache.
    window.addEventListener('pagehide', leave);
    return () => {
      stop();
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, [active, meetingId]);
}
