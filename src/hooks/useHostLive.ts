'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

import type { ParticipantSummary } from '@/lib/attendance';

export interface LiveAlert {
  userId: string;
  name: string;
  state: string;
  forMs: number;
}

export interface LiveData {
  window: { startedAt: number | null; durationMs: number; live: boolean };
  participants: ParticipantSummary[];
  alerts: LiveAlert[];
  now: number;
}

const POLL_MS = 5000;

/**
 * The host's view of the room, refreshed every five seconds.
 *
 * Polling, not a socket: one small request from one person, answered from a
 * single indexed query, is the cheapest thing that can be live -- and on
 * Vercel's serverless functions it is also the thing that works.
 */
export function useHostLive(meetingId: string, enabled: boolean) {
  const { getToken } = useAuth();
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: number | undefined;

    const load = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`/api/meetings/${meetingId}/live`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(String(response.status));
        const next = (await response.json()) as LiveData;
        if (!cancelled) {
          setData(next);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
      if (!cancelled) timer = window.setTimeout(load, POLL_MS);
    };
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [meetingId, enabled, getToken]);

  return { data, error };
}
