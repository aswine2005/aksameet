'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CallingState,
  CallParticipantResponse,
  useCall,
  useCallStateHooks,
  useConnectedUser,
} from '@stream-io/video-react-sdk';

import { AppContext } from '@/contexts/AppProvider';
import { useMeet } from '@/contexts/MeetProvider';
import Button from '@/components/Button';
import CallParticipants from '@/components/CallParticipants';
import Header from '@/components/Header';
import MeetingPreview from '@/components/MeetingPreview';

const Lobby = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { newMeeting, setNewMeeting } = useContext(AppContext);
  // Read once: the flag is reset when the lobby unmounts, and a remount
  // (e.g. React StrictMode in dev) must still create the meeting.
  const [isNewMeeting] = useState(newMeeting);
  const { isGuest, editGuestName } = useMeet();
  const router = useRouter();
  const connectedUser = useConnectedUser();
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [meetingNotFound, setMeetingNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [participants, setParticipants] = useState<CallParticipantResponse[]>(
    []
  );

  // Navigating back here from an ongoing meeting leaves it first.
  useEffect(() => {
    if (!joining && callingState === CallingState.JOINED) {
      call?.leave().catch(console.error);
    }
  }, [call, callingState, joining]);

  useEffect(() => {
    if (!call || !connectedUser) return;
    let cancelled = false;

    const loadCall = async () => {
      try {
        if (isNewMeeting) {
          await call.getOrCreate({
            data: {
              members: [{ user_id: connectedUser.id, role: 'host' }],
            },
          });
        } else {
          const { call: callData } = await call.get();
          if (!cancelled) setParticipants(callData.session?.participants || []);
        }
      } catch (error) {
        console.error('Error loading meeting:', error);
        if (!cancelled) setMeetingNotFound(true);
      }
      if (!cancelled) setLoading(false);
    };

    loadCall();
    return () => {
      cancelled = true;
    };
  }, [call, connectedUser, isNewMeeting]);

  useEffect(() => {
    if (meetingNotFound) router.replace(`/${meetingId}/meeting-end?invalid=true`);
  }, [meetingNotFound, meetingId, router]);

  useEffect(() => {
    return () => {
      setNewMeeting(false);
    };
  }, [setNewMeeting]);

  const heading = loading ? 'Getting ready...' : 'Ready to join?';

  const participantsUI = useMemo(() => {
    switch (true) {
      case loading:
        return "You'll be able to join in just a moment";
      case joining:
        return "You'll join the call in just a moment";
      case participants.length === 0:
        return 'No one else is here';
      case participants.length > 0:
        return <CallParticipants participants={participants} />;
      default:
        return null;
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
      <main className="lg:h-[calc(100svh-80px)] p-6 mt-3 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-8">
        {/* Video Preview Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-3xl blur-2xl"></div>
          <div className="relative">
            <MeetingPreview />
          </div>
        </div>
        
        {/* Meeting Info & Controls */}
        <div className="flex flex-col items-center lg:justify-center gap-6 grow-0 shrink-0 basis-112 max-w-md">
          <div className="w-full bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
            <h2 className="text-black text-3xl font-bold text-center mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {heading}
            </h2>
            
            {isGuest && !loading && (
              <p className="mb-6 text-center text-sm text-gray-600">
                Joining as{' '}
                <span className="font-semibold text-gray-900">
                  {connectedUser?.name}
                </span>{' '}
                ·{' '}
                <button
                  type="button"
                  onClick={editGuestName}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Change name
                </button>
              </p>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 text-gray-700 font-medium text-base p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                {typeof participantsUI === 'string' ? (
                  <>
                    <span className="text-2xl">
                      {loading ? '⏳' : joining ? '🚀' : participants.length === 0 ? '👋' : '👥'}
                    </span>
                    <span>{participantsUI}</span>
                  </>
                ) : (
                  participantsUI
                )}
              </div>
            </div>
            
            <div className="flex justify-center">
              {!joining && !loading && (
                <Button
                  className="w-full text-base shadow-xl"
                  onClick={joinCall}
                  rounding="lg"
                >
                  Join now
                </Button>
              )}
              {(joining || loading) && (
                <div className="h-14 w-full flex items-center justify-center">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
                  </div>
                </div>
              )}
            </div>
            {joinError && (
              <p role="alert" className="mt-4 text-center text-sm text-red-600">
                {joinError}
              </p>
            )}
          </div>

          {/* Meeting Tips */}
          <div className="w-full bg-gradient-to-r from-blue-50/50 to-indigo-50/50 backdrop-blur-sm p-6 rounded-2xl border border-blue-200/30">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">💡</span>
              <span>Tips for a great meeting</span>
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Find a quiet space with good lighting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Test your camera and microphone</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Use headphones to avoid echo</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Lobby;
