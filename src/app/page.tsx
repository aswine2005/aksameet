'use client';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInButton, useUser } from '@clerk/nextjs';
import { customAlphabet } from 'nanoid';
import {
  ErrorFromResponse,
  GetCallResponse,
  StreamVideoClient,
  User,
} from '@stream-io/video-react-sdk';
import Image from 'next/image';
import clsx from 'clsx';

import { API_KEY, CALL_TYPE } from '@/contexts/MeetProvider';
import { AppContext, MEETING_ID_REGEX } from '@/contexts/AppProvider';
import Button from '@/components/Button';
import ButtonWithIcon from '@/components/ButtonWithIcon';
import Header from '@/components/Header';
import KeyboardFilled from '@/components/icons/KeyboardFilled';
import PlainButton from '@/components/PlainButton';
import TextField from '@/components/TextField';
import Videocall from '@/components/icons/Videocall';

const generateMeetingId = () => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const nanoid = customAlphabet(alphabet, 4);

  return `${nanoid(3)}-${nanoid(4)}-${nanoid(3)}`;
};

const GUEST_USER: User = { id: 'guest', type: 'guest' };

const Home = () => {
  const { setNewMeeting } = useContext(AppContext);
  const { isLoaded, isSignedIn } = useUser();
  const [code, setCode] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (error) {
      timeout = setTimeout(() => {
        setError('');
      }, 3000);
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [error]);

  const handleNewMeeting = () => {
    setNewMeeting(true);
    router.push(`/${generateMeetingId()}`);
  };

  const handleCode = async () => {
    if (!MEETING_ID_REGEX.test(code)) return;
    setCheckingCode(true);

    const client = new StreamVideoClient({
      apiKey: API_KEY,
      user: GUEST_USER,
    });
    const call = client.call(CALL_TYPE, code);

    try {
      const response: GetCallResponse = await call.get();
      if (response.call) {
        router.push(`/${code}`);
        return;
      }
    } catch (e: unknown) {
      let err = e as ErrorFromResponse<GetCallResponse>;
      console.error(err.message);
      if (err.status === 404) {
        setError("Couldn't find the meeting you're trying to join.");
      }
    }

    setCheckingCode(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50/40 via-white to-white">
      <Header />
      <main
        className={clsx(
          'flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8',
          isLoaded ? 'animate-fade-in' : 'opacity-0'
        )}
      >
        {/* Hero Section */}
        <div className="w-full max-w-3xl pt-4 pb-2 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-5 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span>Ultra-low latency HD video meetings</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight pb-3">
            Video calls and meetings for everyone
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-xl pb-6">
            Connect, collaborate, and celebrate from anywhere with{' '}
            <span className="font-semibold text-blue-600">Aksa Meet</span>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="w-full max-w-xl flex justify-center">
          <div className="w-full flex flex-col items-center sm:flex-row gap-4 sm:gap-3 justify-center">
            {isSignedIn ? (
              <ButtonWithIcon
                onClick={handleNewMeeting}
                icon={<Videocall />}
                className="shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
              >
                New meeting
              </ButtonWithIcon>
            ) : (
              <SignInButton>
                <Button size="md" className="shadow-md shadow-blue-500/20">
                  Sign in
                </Button>
              </SignInButton>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <TextField
                label="Code or link"
                name="code"
                placeholder="Enter a code or link"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                icon={<KeyboardFilled />}
              />
              <PlainButton
                onClick={handleCode}
                disabled={!code}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  code
                    ? 'text-blue-600 hover:bg-blue-50'
                    : 'text-gray-400 cursor-not-allowed'
                )}
              >
                Join
              </PlainButton>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl mx-auto border-b border-gray-200/80 self-stretch my-10" />

        {/* Features Showcase */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-5 rounded-2xl border border-gray-100 bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-3">
              ⚡
            </div>
            <h3 className="font-semibold text-gray-900 text-base mb-1">
              Crystal Clear Video & Audio
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Global SFU WebRTC edge infrastructure ensures lag-free 1080p calls for 5+ participants simultaneously.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-gray-100 bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-3">
              🖥️
            </div>
            <h3 className="font-semibold text-gray-900 text-base mb-1">
              High-Def Screen Sharing
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Present documents, slides, and code with 1-click screen sharing and automatic speaker spotlight.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-gray-100 bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg mb-3">
              🔒
            </div>
            <h3 className="font-semibold text-gray-900 text-base mb-1">
              Secure & Private
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Secure meeting codes, host-managed access, and encrypted real-time communications.
            </p>
          </div>
        </div>

        {/* Share Link Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-lg p-5 rounded-2xl bg-gradient-to-r from-blue-50/50 to-indigo-50/40 border border-blue-100/80 mb-10">
          <Image
            src="https://www.gstatic.com/meet/user_edu_get_a_link_light_90698cd7b4ca04d3005c962a3756c42d.svg"
            alt="Get a link you can share"
            width={120}
            height={120}
            className="shrink-0"
          />
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Get a link you can share
            </h2>
            <p className="text-xs text-gray-600">
              Click <span className="font-semibold text-gray-900">New meeting</span> to generate a unique link to send to team members, friends, or customers.
            </p>
          </div>
        </div>

        {checkingCode && (
          <div className="z-50 fixed inset-0 flex flex-col items-center justify-center text-white text-2xl font-medium bg-black/80 backdrop-blur-sm animate-transition-overlay-fade-in gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Joining Aksa Meet...</span>
          </div>
        )}

        {error && (
          <div className="z-50 fixed bottom-6 left-6 flex items-center justify-start">
            <div className="rounded-xl px-4 py-3 font-medium text-white text-sm bg-gray-900/95 backdrop-blur border border-white/10 shadow-xl flex items-center gap-2.5">
              <span className="text-amber-400">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <footer className="w-full max-w-2xl mt-auto pt-8 pb-4 text-center sm:text-left border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400">
          <div>
            <span>© {new Date().getFullYear()} Aksa Meet. All rights reserved.</span>
          </div>
          <div className="mt-2 sm:mt-0">
            <span className="text-gray-500">
              Built with Next.js & Stream SFU WebRTC
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Home;
