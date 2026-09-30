import { MutableRefObject, useState } from 'react';
import { defaultEmojiReactionMap, useCall } from '@stream-io/video-react-sdk';

import CallControlButton from './CallControlButton';
import Mood from './icons/Mood';
import useClickOutside from '../hooks/useClickOutside';

// Emoji codes understood by the SDK's <Reaction /> overlay.
const REACTIONS = [
  { type: 'reaction', emoji_code: ':like:', label: 'Thumbs up' },
  { type: 'reaction', emoji_code: ':heart:', label: 'Heart' },
  { type: 'reaction', emoji_code: ':smile:', label: 'Smile' },
  { type: 'reaction', emoji_code: ':fireworks:', label: 'Celebrate' },
  { type: 'reaction', emoji_code: ':dislike:', label: 'Thumbs down' },
  { type: 'raised-hand', emoji_code: ':raise-hand:', label: 'Raise hand' },
];

const ReactionsControl = ({ className }: { className?: string }) => {
  const call = useCall();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(
    () => setIsOpen(false),
    true
  ) as MutableRefObject<HTMLDivElement>;

  const sendReaction = (reaction: (typeof REACTIONS)[number]) => {
    setIsOpen(false);
    call
      ?.sendReaction({ type: reaction.type, emoji_code: reaction.emoji_code })
      .catch((error) => console.error('Error sending reaction:', error));
  };

  return (
    <div className={className}>
      <div ref={ref} className="relative">
        {isOpen && (
          <div className="z-3 absolute bottom-13 left-1/2 -translate-x-1/2 flex gap-1 p-2 rounded-full bg-container-gray shadow-[0_2px_2px_0_rgba(0,0,0,.14),0_3px_1px_-2px_rgba(0,0,0,.12),0_1px_5px_0_rgba(0,0,0,.2)]">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.emoji_code}
                type="button"
                title={reaction.label}
                onClick={() => sendReaction(reaction)}
                className="w-10 h-10 text-xl rounded-full hover:bg-white/10 transition-colors"
              >
                {defaultEmojiReactionMap[reaction.emoji_code]}
              </button>
            ))}
          </div>
        )}
        <CallControlButton
          icon={<Mood />}
          title="Send a reaction"
          onClick={() => setIsOpen((prev) => !prev)}
          className="hover:scale-110 transition-transform"
        />
      </div>
    </div>
  );
};

export default ReactionsControl;
