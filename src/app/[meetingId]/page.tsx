'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  CallingState,
  CallParticipantResponse,
  useCall,
  useCallStateHooks,
  useConnectedUser,
} from '@stream-io/video-react-sdk';

import { useMeet } from '@/contexts/MeetProvider';
import Button from '@/components/Button';
import CallParticipants from '@/components/CallParticipants';
import Header from '@/components/Header';
import MeetingPreview from '@/components/MeetingPreview';
import TrackingNotice from '@/components/TrackingNotice';

const Lobby = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { meeting, isHost, refreshMeeting } = useMeet();
  const router = useRouter();
  const connectedUser = useConnectedUser();
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [participants, setParticipants] = useState<CallParticipantResponse[]>([]);
  const ended = !!meeting?.endedAt;

  // Fresh on every visit: the host may have ended it since it was loaded.
  useEffect(() => {
    refreshMeeting();
  }, [refreshMeeting]);

  // Navigating back here from an ongoing meeting leaves it first.
  useEffect(() => {
    if (!joining && callingState === CallingState.JOINED) {
      call?.leave().catch(console.error);
    }
  }, [call, callingState, joining]);

  useEffect(() => {
    if (!call || !connectedUser) return;
    let cancelled = false;
    // The meeting was created on the server; here it is only looked at.
    call
      .get()
      .then(({ call: callData }) => {
        if (!cancelled) setParticipants(callData.session?.participants || []);
      })
      .catch((error) => console.error('Error loading meeting:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [call, connectedUser]);

  const participantsUI = useMemo(() => {
    switch (true) {
      case loading:
        return "You'll be able to join in just a moment";
      case joining:
        return "You'll join the call in just a moment";
      case participants.length === 0:
        return 'No one else is here yet';
      default:
        return <CallParticipants participants={participants} />;
    }
  }, [loading, joining, participants]);

  const joinCall = async () => {
    if (!call) return;
    setJoining(true);
    setJoinError('');
    try {
      if (call.state.callingState !== CallingState.JOINED) {
        await call.join();
      }
      router.push(`/${meetingId}/meeting`);
    } catch (error) {
      console.error('Error joining call:', error);
      setJoinError("Couldn't join the meeting. Please try again.");
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white">
      <Header navItems={false} />
      <main className="lg:min-h-[calc(100svh-80px)] p-6 mt-3 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-3xl blur-2xl"></div>
          <div className="relative">
            <MeetingPreview />
          </div>
        </div>

        <div className="flex flex-col items-center lg:justify-center gap-6 grow-0 shrink-0 basis-112 max-w-md w-full">
          <div className="w-full bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-blue-700">
              {isHost ? 'You are the host' : `Hosted by ${meeting?.hostName ?? '…'}`}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-center text-gray-900 break-words">
              {meeting?.title}
            </h1>
            <p className="mt-1 mb-6 text-center font-mono text-xs text-gray-500">{meetingId}</p>

            {ended ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-gray-700">This meeting has ended.</p>
                {isHost ? (
                  <Link href={`/history/${meetingId}`} className="font-semibold text-blue-600 hover:underline">
                    View the attendance report
                  </Link>
                ) : (
                  <Link href="/" className="font-semibold text-blue-600 hover:underline">
                    Return home
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 text-gray-700 font-medium text-base p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                    {participantsUI}
                  </div>
                </div>

                <div className="flex justify-center">
                  {!joining && !loading ? (
                    <Button className="w-full text-base shadow-xl" onClick={joinCall} rounding="lg">
                      {isHost ? 'Start meeting' : 'Join now'}
                    </Button>
                  ) : (
                    <div className="h-14 w-full flex items-center justify-center">
                      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {joinError && (
                  <p role="alert" className="mt-4 text-center text-sm text-red-600">
                    {joinError}
                  </p>
                )}
              </>
            )}
          </div>

          {meeting && !ended && <TrackingNotice settings={meeting.settings} isHost={isHost} />}
        </div>
      </main>
    </div>
  );
};

export default Lobby;
