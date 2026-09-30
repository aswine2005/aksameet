import {
  hasAudio,
  hasScreenShare,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';

import Avatar from './Avatar';
import MicFilled from './icons/MicFilled';
import MicOffFilled from './icons/MicOffFilled';
import Popup from './Popup';
import { SIDE_PANEL_CLASSNAME } from './ChatPopup';

interface ParticipantsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const ParticipantsPopup = ({ isOpen, onClose }: ParticipantsPopupProps) => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  return (
    <Popup
      open={isOpen}
      onClose={onClose}
      title={<h2>People ({participants.length})</h2>}
      className={SIDE_PANEL_CLASSNAME}
    >
      <ul className="px-3 pb-4 h-[calc(100%-78px)] overflow-y-auto">
        {participants.map((participant) => (
          <li
            key={participant.sessionId}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50"
          >
            <Avatar participant={participant} width={32} />
            <div className="grow min-w-0">
              <div className="truncate text-sm font-medium text-meet-black">
                {participant.name || participant.userId}
                {participant.isLocalParticipant && ' (You)'}
              </div>
              {hasScreenShare(participant) && (
                <div className="text-xs text-meet-gray">Presenting</div>
              )}
            </div>
            <span
              title={hasAudio(participant) ? 'Microphone on' : 'Muted'}
              className="shrink-0"
            >
              {hasAudio(participant) ? (
                <MicFilled width={20} height={20} color="#5f6368" />
              ) : (
                <MicOffFilled width={20} height={20} color="#5f6368" />
              )}
            </span>
          </li>
        ))}
      </ul>
    </Popup>
  );
};

export default ParticipantsPopup;
