import { useEffect, useState } from 'react';
import {
  combineComparators,
  Comparator,
  hasScreenShare,
  ParticipantView,
  pinned,
  screenSharing,
  StreamVideoParticipant,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';

import ParticipantViewUI from './ParticipantViewUI';
import useAnimateVideoLayout from '../hooks/useAnimateVideoLayout';
import VideoPlaceholder from './VideoPlaceholder';

const SpeakerLayout = () => {
  const call = useCall();
  const { useParticipants } = useCallStateHooks();
  const { ref } = useAnimateVideoLayout(true);
  const participants = useParticipants();

  const [participantInSpotlight, ...otherParticipants] = participants;
  // While someone presents, their camera stays visible in the strip.
  const barParticipants =
    participantInSpotlight && hasScreenShare(participantInSpotlight)
      ? participants
      : otherParticipants;
  const [participantsBar, setParticipantsBar] = useState<HTMLDivElement | null>(
    null
  );

  const getCustomSortingPreset = (): Comparator<StreamVideoParticipant> => {
    return combineComparators(screenSharing, pinned);
  };

  useEffect(() => {
    if (!call) return;
    const customSortingPreset = getCustomSortingPreset();
    call.setSortParticipantsBy(customSortingPreset);
  }, [call]);

  useEffect(() => {
    if (!participantsBar || !call) return;

    const cleanup = call.setViewport(participantsBar);

    return () => cleanup?.();
  }, [participantsBar, call]);

  return (
    <div
      ref={ref}
      className="w-full relative overflow-hidden str-video__speaker-layout str-video__speaker-layout--variant-bottom"
    >
      <div className="str-video__speaker-layout__wrapper">
        <div
          className={
            barParticipants.length > 0
              ? 'str-video__speaker-layout__spotlight'
              : 'spotlight--one'
          }
        >
          {call && participantInSpotlight && (
            <ParticipantView
              participant={participantInSpotlight}
              trackType={
                hasScreenShare(participantInSpotlight)
                  ? 'screenShareTrack'
                  : 'videoTrack'
              }
              ParticipantViewUI={ParticipantViewUI}
              VideoPlaceholder={VideoPlaceholder}
              muteAudio
            />
          )}
        </div>
        {call && barParticipants.length > 0 && (
          <div className="str-video__speaker-layout__participants-bar-buttons-wrapper">
            <div className="str-video__speaker-layout__participants-bar-wrapper">
              <div
                ref={setParticipantsBar}
                className="str-video__speaker-layout__participants-bar"
              >
                {barParticipants.map((participant) => (
                  <div
                    key={participant.sessionId}
                    className="str-video__speaker-layout__participant-tile"
                  >
                    <ParticipantView
                      participant={participant}
                      ParticipantViewUI={ParticipantViewUI}
                      VideoPlaceholder={VideoPlaceholder}
                      muteAudio
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakerLayout;
