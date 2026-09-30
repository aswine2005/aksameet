import { useEffect } from 'react';
import { useCall, useConnectedUser } from '@stream-io/video-react-sdk';

import ButtonWithIcon from './ButtonWithIcon';
import Clipboard from './Clipboard';
import PersonAdd from './icons/PersonAdd';
import Popup from './Popup';
import useLocalStorage from '../hooks/useLocalStorage';

const MeetingPopup = () => {
  const user = useConnectedUser();
  const call = useCall();
  const meetingId = call?.id!;

  const [seen, setSeen] = useLocalStorage(`meetingPopupSeen`, {
    [meetingId]: false,
  });

  const email = user?.custom?.email || user?.name || user?.id;
  const clipboardValue =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${meetingId}`
      : '';

  const addOthers = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join my meeting', url: clipboardValue });
        return;
      } catch {
        // Share sheet dismissed; fall back to copying the link.
      }
    }
    navigator.clipboard.writeText(clipboardValue).catch(console.error);
  };

  const onClose = () => {
    setSeen({
      ...seen,
      [meetingId]: true,
    });
  };

  useEffect(() => {
    setSeen({
      ...seen,
      [meetingId]: seen[meetingId] || false,
    });

    const setSeenTrue = () => {
      if (seen[meetingId]) return;
      setSeen({
        ...seen,
        [meetingId]: true,
      });
    };

    return () => {
      setSeenTrue();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Popup
      open={!seen[meetingId]}
      onClose={onClose}
      title={<h2>Your meeting&apos;s ready</h2>}
      className="bottom-0 -translate-y-22.5 animate-popup"
    >
      <div className="p-6 pt-0">
        <ButtonWithIcon
          icon={
            <div className="w-6.5 flex items-center justify-start">
              <PersonAdd />
            </div>
          }
          rounding="lg"
          size="sm"
          variant="secondary"
          onClick={addOthers}
        >
          Add others
        </ButtonWithIcon>
        <div className="mt-2 text-dark-gray text-sm font-roboto tracking-looserst">
          Or share this meeting link with others you want in the meeting
        </div>
        <div className="mt-2">
          <Clipboard value={clipboardValue} />
        </div>
        <div className="my-4 text-xs font-roboto text-meet-gray tracking-wide">
          Anyone with the link must sign in to join, so attendance shows who was there. Open{' '}
          <span className="font-semibold">Class insights</span> (the shield icon) to see who is
          attending — only you can see it.
        </div>
        <div className="text-xs font-roboto text-meet-gray tracking-wide">
          Joined as {email}
        </div>
      </div>
    </Popup>
  );
};

export default MeetingPopup;
