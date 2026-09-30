import { useState } from 'react';

import CallEndFilled from './icons/CallEndFilled';
import useClickOutside from '../hooks/useClickOutside';

/**
 * The host's hang-up: leave quietly, or end the meeting for everyone. Ending
 * it also stops the attendance clock, so the report's duration is the class's
 * and not whoever lingered last.
 */
const HostLeaveMenu = ({ onLeave, onEnd }: { onLeave: () => void; onEnd: () => Promise<void> }) => {
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const ref = useClickOutside(() => setOpen(false)) as React.MutableRefObject<HTMLDivElement>;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Leave or end the meeting"
        aria-expanded={open}
        className="h-11 px-4 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold inline-flex items-center justify-center gap-2 shadow-lg transition-all duration-300 active:scale-95 border border-red-500/30"
      >
        <CallEndFilled />
        <span className="hidden sm:inline text-sm">End</span>
      </button>
      {open && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-60 rounded-xl bg-white p-2 text-sm text-meet-black shadow-xl">
          <button
            type="button"
            onClick={onLeave}
            className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100"
          >
            <div className="font-medium">Leave meeting</div>
            <div className="text-xs text-gray-500">Others can carry on</div>
          </button>
          <button
            type="button"
            disabled={ending}
            onClick={async () => {
              setEnding(true);
              await onEnd();
            }}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <div className="font-medium">{ending ? 'Ending…' : 'End meeting for everyone'}</div>
            <div className="text-xs text-red-600/80">Closes attendance for this meeting</div>
          </button>
        </div>
      )}
    </div>
  );
};

export default HostLeaveMenu;
