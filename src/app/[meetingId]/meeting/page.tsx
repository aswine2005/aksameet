'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CallingState,
  hasScreenShare,
  isPinned,
  OwnCapability,
  ParticipantsAudio,
  RecordCallButton,
  StreamTheme,
  useCall,
  useCallStateHooks,
  useConnectedUser,
} from '@stream-io/video-react-sdk';
import { Channel } from 'stream-chat';
import { DefaultStreamChatGenerics, useChatContext } from 'stream-chat-react';
import clsx from 'clsx';

import { CHAT_CHANNEL_TYPE } from '@/lib/constants';
import { useMeet } from '@/contexts/MeetProvider';
import CallControlButton from '@/components/CallControlButton';
import CallInfoButton from '@/components/CallInfoButton';
import CallEndFilled from '@/components/icons/CallEndFilled';
import Chat from '@/components/icons/Chat';
import ChatFilled from '@/components/icons/ChatFilled';
import ChatPopup from '@/components/ChatPopup';
import GridLayout from '@/components/GridLayout';
import Group from '@/components/icons/Group';
import GroupFilled from '@/components/icons/GroupFilled';
import Info from '@/components/icons/Info';
import InfoFilled from '@/components/icons/InfoFilled';
import MeetingInfoPopup from '@/components/MeetingInfoPopup';
import MeetingPopup from '@/components/MeetingPopup';
import MoreVert from '@/components/icons/MoreVert';
import ParticipantsPopup from '@/components/ParticipantsPopup';
import PresentToAll from '@/components/icons/PresentToAll';
import ReactionsControl from '@/components/ReactionsControl';
import RecordingsPopup from '@/components/RecordingsPopup';
import SpeakerLayout from '@/components/SpeakerLayout';
import ToggleAudioButton from '@/components/ToggleAudioButton';
import ToggleVideoButton from '@/components/ToggleVideoButton';
import useTime from '@/hooks/useTime';

type SidePanel = 'chat' | 'people' | 'info';

type ChatToast = { id: string; author: string; text: string };

const RECONNECTING_STATES = [
  CallingState.RECONNECTING,
  CallingState.MIGRATING,
  CallingState.OFFLINE,
];

const Meeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();
  const call = useCall();
  const user = useConnectedUser();
  const { authHeaders } = useMeet();
  const { currentTime } = useTime();
  const { client: chatClient } = useChatContext();
  const {
    useCallCallingState,
    useHasPermissions,
    useParticipants,
    useRemoteParticipants,
    useScreenShareState,
  } = useCallStateHooks();
  const participants = useParticipants();
  const remoteParticipants = useRemoteParticipants();
  const { screenShare, optimisticIsMute: isScreenShareOff } =
    useScreenShareState();
  const canScreenShare = useHasPermissions(OwnCapability.SCREENSHARE);
  const callingState = useCallCallingState();

  const [chatChannel, setChatChannel] =
    useState<Channel<DefaultStreamChatGenerics>>();
  const [chatError, setChatError] = useState(false);
  const [chatAttempt, setChatAttempt] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatToast, setChatToast] = useState<ChatToast>();
  const [sidePanel, setSidePanel] = useState<SidePanel | null>(null);
  const [isRecordingListOpen, setIsRecordingListOpen] = useState(false);
  const [participantInSpotlight] = participants;
  const [prevParticipantsCount, setPrevParticipantsCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [screenShareSupported, setScreenShareSupported] = useState(false);
  const isChatOpen = sidePanel === 'chat';
  const isChatOpenRef = useRef(isChatOpen);
  const isCreator = call?.state.createdBy?.id === user?.id;
  const isJoined = callingState === CallingState.JOINED;
  const isInCall =
    callingState !== CallingState.UNKNOWN &&
    callingState !== CallingState.IDLE &&
    callingState !== CallingState.LEFT;

  const copyMeetingLink = () => {
    const url = `${window.location.origin}/${meetingId}`;
    navigator.clipboard.writeText(url).catch(console.error);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Refreshing this page or opening it directly lands in the lobby; leaving
  // (or being removed from) the call lands on the meeting-end screen.
  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      router.replace(`/${meetingId}/meeting-end`);
    } else if (
      callingState === CallingState.UNKNOWN ||
      callingState === CallingState.IDLE
    ) {
      router.replace(`/${meetingId}`);
    }
  }, [callingState, meetingId, router]);

  useEffect(() => {
    setScreenShareSupported(
      typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getDisplayMedia
    );
  }, []);

  useEffect(() => {
    if (!isJoined || chatChannel) return;
    let cancelled = false;

    const joinChat = async () => {
      try {
        setChatError(false);
        const response = await fetch(`/api/meetings/${meetingId}/chat`, {
          method: 'POST',
          headers: authHeaders,
        });
        if (!response.ok) {
          throw new Error(`Chat join failed with status ${response.status}`);
        }
        const channel = chatClient.channel(CHAT_CHANNEL_TYPE, meetingId);
        await channel.watch();
        if (!cancelled) setChatChannel(channel);
      } catch (error) {
        console.error('Error setting up chat:', error);
        if (!cancelled) setChatError(true);
      }
    };

    joinChat();
    return () => {
      cancelled = true;
    };
  }, [isJoined, chatChannel, chatClient, meetingId, authHeaders, chatAttempt]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) {
      setUnreadCount(0);
      setChatToast(undefined);
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (!chatChannel) return;
    const { unsubscribe } = chatChannel.on('message.new', (event) => {
      const { message } = event;
      if (!message || message.user?.id === chatClient.userID) return;
      if (isChatOpenRef.current) return;
      setUnreadCount((count) => count + 1);
      setChatToast({
        id: message.id,
        author: message.user?.name || message.user?.id || 'Someone',
        text: message.text || 'Sent an attachment',
      });
    });
    return unsubscribe;
  }, [chatChannel, chatClient]);

  useEffect(() => {
    if (!chatToast) return;
    const timeout = setTimeout(() => setChatToast(undefined), 5000);
    return () => clearTimeout(timeout);
  }, [chatToast]);

  useEffect(() => {
    if (participants.length > prevParticipantsCount) {
      audioRef.current?.play().catch(() => {});
    }
    setPrevParticipantsCount(participants.length);
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
    try {
      await call?.leave();
    } catch (error) {
      console.error('Error leaving call:', error);
      router.replace(`/${meetingId}/meeting-end`);
    }
  };

  const toggleScreenShare = async () => {
    try {
      await screenShare.toggle();
    } catch (error) {
      // Dismissing the browser's screen picker rejects; nothing to report.
      if ((error as Error)?.name !== 'NotAllowedError') console.error(error);
    }
  };

  const togglePanel = (panel: SidePanel) => {
    setSidePanel((current) => (current === panel ? null : panel));
  };

  if (!isInCall) return null;

  return (
    <StreamTheme className="root-theme">
      <div className="relative w-svw h-svh bg-gradient-to-b from-gray-900 via-[#16171b] to-black overflow-hidden">
        {/* Everyone's audio is rendered once here, independent of which
            tiles are visible (grid pages, screen-share spotlight). */}
        <ParticipantsAudio participants={remoteParticipants} />

        {isSpeakerLayout && <SpeakerLayout />}
        {!isSpeakerLayout && <GridLayout />}

        {RECONNECTING_STATES.includes(callingState) && (
          <div className="z-20 absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/80 text-white text-sm shadow-lg">
            Reconnecting…
          </div>
        )}
        {callingState === CallingState.RECONNECTING_FAILED && (
          <div className="z-20 absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-meet-red text-white text-sm shadow-lg">
            Connection lost. Leave and rejoin the meeting.
          </div>
        )}

        {/* Enhanced Control Bar (z-10 keeps its menus above tile overlays) */}
        <div className="z-10 absolute left-0 bottom-0 right-0 w-full h-20 bg-gradient-to-t from-black/95 via-[#16171b]/95 to-transparent backdrop-blur-xl border-t border-white/5 text-white flex items-center justify-between px-2 sm:px-4 shadow-2xl">
          {/* Meeting Info & Timer */}
          <div className="hidden lg:flex grow shrink basis-1/4 items-center text-start justify-start gap-4 ml-2">
            {/* Time */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <span className="text-xs font-mono text-gray-300">🕐</span>
              <span className="font-medium text-sm text-white">{currentTime}</span>
            </div>

            {/* Meeting ID with copy button */}
            <button
              type="button"
              onClick={copyMeetingLink}
              title={copiedLink ? 'Link copied!' : 'Click to copy meeting link'}
              className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="text-xs font-mono text-blue-300 group-hover:text-blue-200">{meetingId}</span>
              {copiedLink ? (
                <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                  <span className="text-base">✓</span> Copied
                </span>
              ) : (
                <svg className="w-3.5 h-3.5 fill-blue-400 group-hover:fill-blue-300 transition-colors" viewBox="0 0 24 24">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
              )}
            </button>
          </div>

          {/* Main Meeting Controls */}
          <div className="relative flex grow shrink basis-1/4 items-center justify-center px-1.5 gap-2 sm:gap-3">
            <ToggleAudioButton />
            <ToggleVideoButton />
            <ReactionsControl className="hidden sm:block" />
            {screenShareSupported && canScreenShare && (
              <CallControlButton
                onClick={toggleScreenShare}
                icon={<PresentToAll />}
                title={isScreenShareOff ? 'Present now' : 'Stop presenting'}
                className={clsx(
                  'hover:scale-110 transition-transform',
                  !isScreenShareOff && '!bg-light-blue !border-light-blue'
                )}
              />
            )}
            <div className="hidden sm:block">
              <RecordCallButton />
            </div>
            <div className="hidden sm:block relative">
              <CallControlButton
                onClick={() => setIsRecordingListOpen((prev) => !prev)}
                icon={<MoreVert />}
                title={'View recording list'}
                className="hover:scale-110 transition-transform"
              />
              <RecordingsPopup
                isOpen={isRecordingListOpen}
                onClose={() => setIsRecordingListOpen(false)}
              />
            </div>

            {/* Leave Call Button - Enhanced */}
            <button
              onClick={leaveCall}
              title="Leave call"
              className="h-11 px-4 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold inline-flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95 border border-red-500/30"
            >
              <CallEndFilled />
              <span className="hidden sm:inline text-sm">Leave</span>
            </button>
          </div>

          {/* Meeting Actions */}
          <div className="flex sm:grow shrink sm:basis-1/4 items-center justify-end gap-1 sm:gap-2 sm:mr-2">
            <CallInfoButton
              onClick={() => togglePanel('info')}
              icon={
                sidePanel === 'info' ? (
                  <InfoFilled color="var(--icon-blue)" />
                ) : (
                  <Info />
                )
              }
              title="Meeting details"
              className="hidden sm:inline-flex hover:scale-110 transition-transform"
            />
            <div className="relative">
              <CallInfoButton
                onClick={() => togglePanel('people')}
                icon={
                  sidePanel === 'people' ? (
                    <GroupFilled color="var(--icon-blue)" />
                  ) : (
                    <Group />
                  )
                }
                title="People"
                className="hover:scale-110 transition-transform"
              />
              <span className="pointer-events-none absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-[#5f6368] text-white text-[11px] font-medium flex items-center justify-center">
                {participants.length}
              </span>
            </div>
            <div className="relative">
              <CallInfoButton
                onClick={() => togglePanel('chat')}
                icon={
                  isChatOpen ? <ChatFilled color="var(--icon-blue)" /> : <Chat />
                }
                title="Chat with everyone"
                className="hover:scale-110 transition-transform"
              />
              {unreadCount > 0 && (
                <span className="pointer-events-none absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-light-blue text-meet-black text-[11px] font-semibold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {chatToast && (
          <button
            type="button"
            key={chatToast.id}
            onClick={() => setSidePanel('chat')}
            className="z-10 absolute right-4 bottom-24 max-w-[min(20rem,calc(100vw-2rem))] text-left px-4 py-3 rounded-xl bg-white text-meet-black shadow-xl animate-fade-in"
          >
            <div className="text-sm font-semibold truncate">{chatToast.author}</div>
            <div className="text-sm text-meet-gray line-clamp-2 break-words">
              {chatToast.text}
            </div>
          </button>
        )}

        <ChatPopup
          channel={chatChannel}
          error={chatError}
          onRetry={() => setChatAttempt((n) => n + 1)}
          isOpen={isChatOpen}
          onClose={() => setSidePanel(null)}
        />
        <ParticipantsPopup
          isOpen={sidePanel === 'people'}
          onClose={() => setSidePanel(null)}
        />
        <MeetingInfoPopup
          meetingId={meetingId}
          isOpen={sidePanel === 'info'}
          onClose={() => setSidePanel(null)}
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
