/** "45s", "1m 05s", "12m" -- for how long a live state has lasted. */
export function clock(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 10) return `${minutes}m`;
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
}

export function dateTime(ms: number | string | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeOfDay(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
