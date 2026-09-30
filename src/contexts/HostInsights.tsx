'use client';
import { createContext, ReactNode, useContext, useMemo } from 'react';

import type { ParticipantSummary } from '@/lib/attendance';
import type { LiveData } from '@/hooks/useHostLive';

type Value = {
  /** Only ever populated in the host's browser. */
  byUserId: Map<string, ParticipantSummary>;
  alerted: Set<string>;
  data: LiveData | null;
};

const HostInsightsContext = createContext<Value>({
  byUserId: new Map(),
  alerted: new Set(),
  data: null,
});

export const useHostInsights = () => useContext(HostInsightsContext);

export function HostInsightsProvider({ data, children }: { data: LiveData | null; children: ReactNode }) {
  const value = useMemo<Value>(
    () => ({
      data,
      byUserId: new Map((data?.participants ?? []).map((p) => [p.userId, p])),
      alerted: new Set((data?.alerts ?? []).map((a) => a.userId)),
    }),
    [data]
  );
  return <HostInsightsContext.Provider value={value}>{children}</HostInsightsContext.Provider>;
}
