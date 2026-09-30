'use client';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { RedirectToSignIn, useAuth, useUser } from '@clerk/nextjs';
import {
  BackgroundFiltersProvider,
  Call,
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  User,
} from '@stream-io/video-react-sdk';
import { StreamChat } from 'stream-chat';
import { Chat } from 'stream-chat-react';

import type { MeetingSettings } from '@/lib/attendance';
import { CALL_TYPE } from '@/lib/constants';
import Button from '../components/Button';
import InvalidMeetingCode from '../components/InvalidMeetingCode';
import LoadingOverlay from '../components/LoadingOverlay';

export const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY as string;

export interface MeetingInfo {
  id: string;
  title: string;
  hostName: string;
  isHost: boolean;
  createdAt: string;
  endedAt: string | null;
  settings: MeetingSettings;
}

type Clients = {
  videoClient: StreamVideoClient;
  chatClient: StreamChat;
  call: Call;
};

type MeetContextValue = {
  meeting: MeetingInfo | null;
  isHost: boolean;
  /** Replace the local copy, e.g. from a heartbeat's reply. */
  setSettings: (settings: MeetingSettings) => void;
  /** Change the settings on the server (host only). */
  saveSettings: (settings: MeetingSettings) => Promise<void>;
  /** Fetch with a fresh Clerk token, for this app's own API. */
  api: (path: string, init?: RequestInit) => Promise<Response>;
  /** Load the meeting again -- e.g. to learn that the host has ended it. */
  refreshMeeting: () => void;
};

const MeetContext = createContext<MeetContextValue>({
  meeting: null,
  isHost: false,
  setSettings: () => null,
  saveSettings: async () => undefined,
  api: (path, init) => fetch(path, init),
  refreshMeeting: () => null,
});

export const useMeet = () => useContext(MeetContext);

const fetchToken = async (): Promise<string> => {
  const response = await fetch('/api/token', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Token request failed with status ${response.status}`);
  }
  return (await response.json()).token;
};

type MeetProviderProps = {
  meetingId: string;
  children: ReactNode;
};

const MeetProvider = ({ meetingId, children }: MeetProviderProps) => {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [clients, setClients] = useState<Clients>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  // undefined while loading, null when there is no such meeting
  const [meeting, setMeeting] = useState<MeetingInfo | null>();
  const [meetingVersion, setMeetingVersion] = useState(0);
  const refreshMeeting = useCallback(() => setMeetingVersion((n) => n + 1), []);

  const api = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = await getToken().catch(() => null);
      return fetch(path, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    [getToken]
  );

  // Primitive values only: Clerk hands out a new `user` object on every
  // session refresh, which must not tear down an ongoing call.
  const userId = isSignedIn ? clerkUser.id : undefined;
  const userName = isSignedIn
    ? clerkUser.fullName ||
      clerkUser.username ||
      clerkUser.primaryEmailAddress?.emailAddress ||
      'User'
    : undefined;
  const userImage = isSignedIn && clerkUser.hasImage ? clerkUser.imageUrl : undefined;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api(`/api/meetings/${meetingId}`)
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) return setMeeting(null);
        if (!response.ok) throw new Error(`Meeting lookup failed: ${response.status}`);
        setMeeting((await response.json()) as MeetingInfo);
      })
      .catch((err) => {
        console.error(err);
        // Only the first load is fatal; a failed refresh keeps what we had.
        if (!cancelled && meetingVersion === 0) setError("Couldn't load this meeting.");
      });
    return () => {
      cancelled = true;
    };
    // `api` is left out on purpose: it changes whenever Clerk refreshes the
    // session, and a new token is no reason to reload the meeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, userId, attempt, meetingVersion]);

  useEffect(() => {
    if (!userId || !userName) return;

    let cancelled = false;
    const user: User = { id: userId, name: userName, image: userImage };
    const videoClient = new StreamVideoClient({ apiKey: API_KEY });
    const chatClient = new StreamChat(API_KEY);
    const call = videoClient.call(CALL_TYPE, meetingId);

    Promise.all([
      videoClient.connectUser(user, fetchToken),
      chatClient.connectUser({ id: userId, name: userName, image: userImage }, fetchToken),
    ])
      .then(() => {
        if (!cancelled) setClients({ videoClient, chatClient, call });
      })
      .catch((err) => {
        console.error('Failed to connect to Stream:', err);
        if (!cancelled) setError("Couldn't connect to the meeting service.");
      });

    return () => {
      cancelled = true;
      setClients(undefined);
      setError('');
      const leave =
        call.state.callingState === CallingState.LEFT
          ? Promise.resolve()
          : call.leave().catch(() => {});
      leave.finally(() => {
        videoClient.disconnectUser().catch(console.error);
        chatClient.disconnectUser().catch(console.error);
      });
    };
  }, [userId, userName, userImage, meetingId, attempt]);

  const setSettings = useCallback((settings: MeetingSettings) => {
    setMeeting((current) =>
      current && JSON.stringify(current.settings) !== JSON.stringify(settings)
        ? { ...current, settings }
        : current
    );
  }, []);

  const saveSettings = useCallback(
    async (settings: MeetingSettings) => {
      const response = await api(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!response.ok) throw new Error(`Saving settings failed: ${response.status}`);
      setMeeting((await response.json()) as MeetingInfo);
    },
    [api, meetingId]
  );

  const contextValue = useMemo<MeetContextValue>(
    () => ({
      meeting: meeting ?? null,
      isHost: !!meeting?.isHost,
      setSettings,
      saveSettings,
      api,
      refreshMeeting,
    }),
    [meeting, setSettings, saveSettings, api, refreshMeeting]
  );

  // Middleware already sends signed-out visitors to sign in; this is the
  // belt to its braces, for a session that expires while the page is open.
  if (isLoaded && !isSignedIn) return <RedirectToSignIn />;
  if (!isLoaded) return <LoadingOverlay />;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white">
        <h1 className="text-3xl font-bold text-gray-900">{error}</h1>
        <p className="text-gray-600 max-w-md">
          Check your internet connection and try again.
        </p>
        <Button size="md" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  if (meeting === null) return <InvalidMeetingCode notFound />;
  if (!clients || meeting === undefined) return <LoadingOverlay />;

  return (
    <MeetContext.Provider value={contextValue}>
      <Chat client={clients.chatClient}>
        <StreamVideo client={clients.videoClient}>
          <StreamCall call={clients.call}>
            {/* Background blur, on the student's own device. */}
            <BackgroundFiltersProvider>{children}</BackgroundFiltersProvider>
          </StreamCall>
        </StreamVideo>
      </Chat>
    </MeetContext.Provider>
  );
};

export default MeetProvider;
