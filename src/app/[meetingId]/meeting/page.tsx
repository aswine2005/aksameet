'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CallingState,
  hasScreenShare,
  isPinned,
  RecordCallButton,
  StreamTheme,
  useCall,
  useCallStateHooks,
  useConnectedUser,
} from '@stream-io/video-react-sdk';
import { Channel } from 'stream-chat';
import { DefaultStreamChatGenerics, useChatContext } from 'stream-chat-react';

import CallControlButton from '@/components/CallControlButton';
import CallInfoButton from '@/components/CallInfoButton';
import CallEndFilled from '@/components/icons/CallEndFilled';
import Chat from '@/components/icons/Chat';
import ChatFilled from '@/components/icons/ChatFilled';
import ChatPopup from '@/components/ChatPopup';
import ClosedCaptions from '@/components/icons/ClosedCaptions';
import GridLayout from '@/components/GridLayout';
import Group from '@/components/icons/Group';
import Info from '@/components/icons/Info';
import Mood from '@/components/icons/Mood';
import PresentToAll from '@/components/icons/PresentToAll';
import MeetingPopup from '@/components/MeetingPopup';
import MoreVert from '@/components/icons/MoreVert';
import RecordingsPopup from '@/components/RecordingsPopup';
import SpeakerLayout from '@/components/SpeakerLayout';
import ToggleAudioButton from '@/components/ToggleAudioButton';
import ToggleVideoButton from '@/components/ToggleVideoButton';
import useTime from '@/hooks/useTime';

interface MeetingProps {
  params: {
    meetingId: string;
  };
}

const Meeting = ({ params }: MeetingProps) => {
  const { meetingId } = params;
  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();
  const call = useCall();
  const user = useConnectedUser();
  const { currentTime } = useTime();
  const { client: chatClient } = useChatContext();
  const { useCallCallingState, useParticipants, useScreenShareState } =
    useCallStateHooks();
  const participants = useParticipants();
  const { screenShare } = useScreenShareState();
  const callingState = useCallCallingState();

  const [chatChannel, setChatChannel] =
    useState<Channel<DefaultStreamChatGenerics>>();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRecordingListOpen, setIsRecordingListOpen] = useState(false);
  const [participantInSpotlight, _] = participants;
  const [prevParticipantsCount, setPrevParticipantsCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const isCreator = call?.state.createdBy?.id === user?.id;
  const isUnkownOrIdle =
    callingState === CallingState.UNKNOWN || callingState === CallingState.IDLE;

  const copyMeetingLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/${meetingId}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  useEffect(() => {
    const startup = async () => {
      if (isUnkownOrIdle) {
        router.push(`/${meetingId}`);
      } else if (chatClient) {
        const channel = chatClient.channel('messaging', meetingId);
        setChatChannel(channel);
      }
    };
    startup();
  }, [router, meetingId, isUnkownOrIdle, chatClient]);

  useEffect(() => {
    if (participants.length > prevParticipantsCount) {
      audioRef.current?.play();
      setPrevParticipantsCount(participants.length);
    }
  }, [participants.length, prevParticipantsCount]);

  const isSpeakerLayout = useMemo(() => {
    if (participantInSpotlight) {
      return (
        hasScreenShare(participantInSpotlight) ||
        isPinned(participantInSpotlight)
      );
    }
    return false;
  }, [participantInSpotlight]);

  const leaveCall = async () => {
    await call?.leave();
    router.push(`/${meetingId}/meeting-end`);
  };

  const toggleScreenShare = async () => {
    try {
      await screenShare.toggle();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleChatPopup = () => {
    setIsChatOpen((prev) => !prev);
  };

  const toggleRecordingsList = () => {
    setIsRecordingListOpen((prev) => !prev);
  };

  if (isUnkownOrIdle) return null;

  return (
    <StreamTheme className="root-theme">
      <div className="relative w-svw h-svh bg-meet-black overflow-hidden">
        {isSpeakerLayout && <SpeakerLayout />}
        {!isSpeakerLayout && <GridLayout />}
        <div className="absolute left-0 bottom-0 right-0 w-full h-20 bg-[#16171b]/95 backdrop-blur-md border-t border-white/10 text-white text-center flex items-center justify-between px-2">
          {/* Meeting ID & Quick Copy */}
          <div className="hidden sm:flex grow shrink basis-1/4 items-center text-start justify-start ml-3 truncate max-w-full">
            <div className="flex items-center overflow-hidden mx-2 h-20 gap-3 select-none">
              <span className="font-medium text-sm text-gray-300">{currentTime}</span>
              <span className="text-gray-600">{'|'}</span>
              <button
                type="button"
                onClick={copyMeetingLink}
                title={copiedLink ? 'Link copied to clipboard!' : 'Click to copy meeting link'}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-all text-xs font-mono text-gray-200 hover:text-white border border-white/5"
              >
                <span className="truncate">{meetingId}</span>
                {copiedLink ? (
                  <span className="text-emerald-400 font-sans font-semibold text-xs flex items-center gap-1">
                    ✓ Copied
                  </span>
                ) : (
                  <svg className="w-3.5 h-3.5 fill-current opacity-70" viewBox="0 0 24 24">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {/* Meeting Controls */}
          <div className="relative flex grow shrink basis-1/4 items-center justify-center px-1.5 gap-3 ml-0">
            <ToggleAudioButton />
            <ToggleVideoButton />
            <CallControlButton
              icon={<ClosedCaptions />}
              title={'Turn on captions'}
            />
            <CallControlButton
              icon={<Mood />}
              title={'Send a reaction'}
              className="hidden sm:inline-flex"
            />
            <CallControlButton
              onClick={toggleScreenShare}
              icon={<PresentToAll />}
              title={'Present now'}
            />
            <RecordCallButton />
            <div className="hidden sm:block relative">
              <CallControlButton
                onClick={toggleRecordingsList}
                icon={<MoreVert />}
                title={'View recording list'}
              />
              <RecordingsPopup
                isOpen={isRecordingListOpen}
                onClose={() => setIsRecordingListOpen(false)}
              />
            </div>
            <CallControlButton
              onClick={leaveCall}
              icon={<CallEndFilled />}
              title={'Leave call'}
              className="leave-call-button"
            />
          </div>
          {/* Meeting Info */}
          <div className="hidden sm:flex grow shrink basis-1/4 items-center justify-end mr-3">
            <CallInfoButton icon={<Info />} title="Meeting details" />
            <CallInfoButton icon={<Group />} title="People" />
            <CallInfoButton
              onClick={toggleChatPopup}
              icon={
                isChatOpen ? <ChatFilled color="var(--icon-blue)" /> : <Chat />
              }
              title="Chat with everyone"
            />
          </div>
        </div>
        <ChatPopup
          channel={chatChannel!}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
        {isCreator && <MeetingPopup />}
        <audio
          ref={audioRef}
          src="https://www.gstatic.com/meet/sounds/join_call_6a6a67d6bcc7a4e373ed40fdeff3930a.ogg"
        />
      </div>
    </StreamTheme>
  );
};

export default Meeting;
