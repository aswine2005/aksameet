import type { AttentionState } from '@/lib/attention';

/** One colour per state, used by the tile badge, the panel and the report. */
export const STATE_STYLE: Record<AttentionState, { dot: string; chip: string; short: string }> = {
  attentive: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', short: 'Attentive' },
  away: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-900 border-amber-200', short: 'Looking away' },
  eyes_closed: { dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-900 border-violet-200', short: 'Eyes closed' },
  no_face: { dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-900 border-rose-200', short: 'Not in view' },
  camera_off: { dot: 'bg-slate-400', chip: 'bg-slate-50 text-slate-700 border-slate-200', short: 'Camera off' },
  tab_hidden: { dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-900 border-orange-200', short: 'Other tab' },
};

export const styleFor = (state: string | null) =>
  state && state in STATE_STYLE ? STATE_STYLE[state as AttentionState] : null;
