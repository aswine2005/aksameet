import Clipboard from './Clipboard';
import Popup from './Popup';
import { SIDE_PANEL_CLASSNAME } from './ChatPopup';

interface MeetingInfoPopupProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
}

const MeetingInfoPopup = ({
  meetingId,
  isOpen,
  onClose,
}: MeetingInfoPopupProps) => {
  const meetingLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${meetingId}`
      : '';

  return (
    <Popup
      open={isOpen}
      onClose={onClose}
      title={<h2>Meeting details</h2>}
      className={SIDE_PANEL_CLASSNAME}
    >
      <div className="px-6 pb-6">
        <div className="text-sm font-medium text-meet-black mb-2">
          Joining info
        </div>
        <Clipboard value={meetingLink} />
        <p className="mt-3 text-xs font-roboto text-meet-gray tracking-wide">
          Share this link with anyone you want in the meeting. Meeting code:{' '}
          <span className="font-mono">{meetingId}</span>
        </p>
      </div>
    </Popup>
  );
};

export default MeetingInfoPopup;
