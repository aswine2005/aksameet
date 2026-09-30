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
import { useUser } from '@clerk/nextjs';
import {
  Call,
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  User,
} from '@stream-io/video-react-sdk';
import { StreamChat } from 'stream-chat';
import { Chat } from 'stream-chat-react';

import { CALL_TYPE } from '@/lib/constants';
import Button from '../components/Button';
import GuestNameForm from '../components/GuestNameForm';
import LoadingOverlay from '../components/LoadingOverlay';

export const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY as string;

const GUEST_SESSION_KEY = 'aksa-meet:guest-session';
const GUEST_NAME_KEY = 'aksa-meet:guest-name';
// Don't reuse a guest token that would expire in the middle of a meeting.
const GUEST_SESSION_MIN_REMAINING_MS = 2 * 60 * 60 * 1000;

type TokenResponse = { userId: string; token: string; expiresAt?: number };

type GuestSession = {
  userId: string;
  token: string;
  expiresAt: number;
  name: string;
};

type Clients = {
  videoClient: StreamVideoClient;
  chatClient: StreamChat;
  call: Call;
};

type MeetContextValue = {
  isGuest: boolean;
  /** Headers that authenticate the current user against this app's API. */
  authHeaders: Record<string, string>;
  /** Lets a guest go back to the name form before joining. */
  editGuestName: () => void;
};

const MeetContext = createContext<MeetContextValue>({
  isGuest: false,
  authHeaders: {},
  editGuestName: () => null,
});

export const useMeet = () => useContext(MeetContext);

const fetchToken = async (): Promise<TokenResponse> => {
  const response = await fetch('/api/token', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Token request failed with status ${response.status}`);
  }
  return response.json();
};

const readGuestSession = (): GuestSession | null => {
  try {
    const session: GuestSession | null = JSON.parse(
      sessionStorage.getItem(GUEST_SESSION_KEY) || 'null'
    );
    if (
      session?.userId &&
      session.token &&
      session.name &&
      session.expiresAt - Date.now() > GUEST_SESSION_MIN_REMAINING_MS
    ) {
      return session;
    }
  } catch {}
  return null;
};

const saveGuestSession = (session: GuestSession) => {
  try {
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(GUEST_NAME_KEY, session.name);
  } catch {}
};

const readLastGuestName = () => {
  try {
    return localStorage.getItem(GUEST_NAME_KEY) || '';
  } catch {
    return '';
  }
};

type MeetProviderProps = {
  meetingId: string;
  children: ReactNode;
};

const MeetProvider = ({ meetingId, children }: MeetProviderProps) => {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  // undefined = not read from storage yet, null = guest has no session yet
  const [guest, setGuest] = useState<GuestSession | null>();
  const [editingGuestName, setEditingGuestName] = useState(false);
  const [clients, setClients] = useState<Clients>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const isGuest = isLoaded && !isSignedIn;

  useEffect(() => {
    if (isGuest) setGuest(readGuestSession());
  }, [isGuest]);

  // Primitive values only: Clerk hands out a new `user` object on every
  // session refresh, which must not tear down an ongoing call.
  const userId = isSignedIn ? clerkUser.id : guest?.userId;
  const userName = isSignedIn
    ? clerkUser.fullName ||
      clerkUser.username ||
      clerkUser.primaryEmailAddress?.emailAddress ||
      'User'
    : guest?.name;
  const userImage =
    isSignedIn && clerkUser.hasImage ? clerkUser.imageUrl : undefined;
  const guestToken = isSignedIn ? undefined : guest?.token;

  useEffect(() => {
    if (!userId || !userName) return;

    let cancelled = false;
    const user: User = { id: userId, name: userName, image: userImage };
    // Guests hold a long-lived token; signed-in users fetch (and refresh)
    // theirs through their Clerk session.
    const tokenOrProvider =
      guestToken ?? (async () => (await fetchToken()).token);

    const videoClient = new StreamVideoClient({ apiKey: API_KEY });
    const chatClient = new StreamChat(API_KEY);
    const call = videoClient.call(CALL_TYPE, meetingId);

    Promise.all([
      videoClient.connectUser(user, tokenOrProvider),
      chatClient.connectUser(
        { id: userId, name: userName, image: userImage },
        tokenOrProvider
      ),
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
  }, [userId, userName, userImage, guestToken, meetingId, attempt]);

  const submitGuestName = useCallback(
    async (name: string) => {
      const session = guest
        ? { ...guest, name }
        : await fetchToken().then(({ userId, token, expiresAt }) => ({
            userId,
            token,
            expiresAt: expiresAt!,
            name,
          }));
      saveGuestSession(session);
      setGuest(session);
      setEditingGuestName(false);
    },
    [guest]
  );

  const editGuestName = useCallback(() => setEditingGuestName(true), []);

  const contextValue = useMemo<MeetContextValue>(
    () => ({
      isGuest,
      authHeaders: guestToken
        ? { Authorization: `Bearer ${guestToken}` }
        : ({} as Record<string, string>),
      editGuestName,
    }),
    [isGuest, guestToken, editGuestName]
  );

  if (!isLoaded || (isGuest && guest === undefined)) return <LoadingOverlay />;

  if (isGuest && (guest === null || editingGuestName)) {
    return (
      <GuestNameForm
        meetingId={meetingId}
        initialName={guest?.name || readLastGuestName()}
        onSubmit={submitGuestName}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white">
        <h1 className="text-3xl font-bold text-gray-900">{error}</h1>
        <p className="text-gray-600 max-w-md">
          Check your internet connection and try again. If this keeps
          happening, make sure the Stream API key and secret are configured.
        </p>
        <Button size="md" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  if (!clients) return <LoadingOverlay />;

  return (
    <MeetContext.Provider value={contextValue}>
      <Chat client={clients.chatClient}>
        <StreamVideo client={clients.videoClient}>
          <StreamCall call={clients.call}>{children}</StreamCall>
        </StreamVideo>
      </Chat>
    </MeetContext.Provider>
  );
};

export default MeetProvider;
