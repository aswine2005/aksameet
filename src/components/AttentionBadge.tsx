import clsx from 'clsx';

import { useHostInsights } from '@/contexts/HostInsights';
import { STATE_LABEL } from '@/lib/attention';
import { clock } from '@/lib/client/format';
import { styleFor } from '@/lib/client/states';

/**
 * A dot on each tile, drawn only in the host's browser.
 *
 * Nothing about it reaches the students' screens: the data behind it comes
 * from an endpoint that answers the host alone.
 */
const AttentionBadge = ({ userId }: { userId: string }) => {
  const { byUserId, alerted } = useHostInsights();
  const summary = byUserId.get(userId);
  const style = styleFor(summary?.liveState ?? null);
  if (!summary || summary.isHost || !style) return null;
  const alert = alerted.has(userId);
  const label = STATE_LABEL[summary.liveState as keyof typeof STATE_LABEL];
  return (
    <div
      className={clsx(
        'z-1 absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm',
        alert ? 'bg-red-600/90 animate-pulse' : 'bg-black/55'
      )}
      title={`${label}${summary.liveState !== 'attentive' ? ` for ${clock(summary.liveStateMs)}` : ''} — visible only to you`}
    >
      <span className={clsx('h-2 w-2 rounded-full', style.dot)} />
      {summary.attentionPercent !== null && <span>{summary.attentionPercent}%</span>}
      {alert && <span>· {clock(summary.liveStateMs)}</span>}
    </div>
  );
};

export default AttentionBadge;
