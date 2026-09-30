'use client';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInButton, useUser } from '@clerk/nextjs';
import { customAlphabet } from 'nanoid';
import Image from 'next/image';
import clsx from 'clsx';

import { AppContext } from '@/contexts/AppProvider';
import { MEETING_ID_REGEX } from '@/lib/constants';
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

// Accepts a bare code ("abc-defg-hij" or "abcdefghij") or a full meeting link.
const parseMeetingCode = (input: string) => {
  let value = input.trim().toLowerCase();
  try {
    value = new URL(value).pathname.split('/').filter(Boolean)[0] || '';
  } catch {}
  if (/^[a-z]{10}$/.test(value)) {
    value = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
  }
  return MEETING_ID_REGEX.test(value) ? value : null;
};

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

  const handleCode = async (e: FormEvent) => {
    e.preventDefault();
    const meetingId = parseMeetingCode(code);
    if (!meetingId) {
      setError('Enter a valid meeting code, like abc-defg-hij.');
      return;
    }
    setCheckingCode(true);

    try {
      const response = await fetch(`/api/meetings/${meetingId}`);
      if (response.ok) {
        router.push(`/${meetingId}`);
        return;
      }
      setError(
        response.status === 404
          ? "Couldn't find the meeting you're trying to join."
          : 'Something went wrong. Please try again.'
      );
    } catch (err) {
      console.error(err);
      setError('Network error. Check your connection and try again.');
    }

    setCheckingCode(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <Header />
      <main
        className={clsx(
          'relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12',
          isLoaded ? 'animate-fade-in' : 'opacity-0'
        )}
      >
        {/* Hero Section */}
        <div className="w-full max-w-4xl pt-8 pb-4 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 text-blue-700 text-sm font-semibold mb-6 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Ultra-low latency HD video meetings
            </span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent leading-tight pb-4 px-4">
            Video calls and meetings
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> for everyone</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl pb-8 leading-relaxed">
            Connect, collaborate, and celebrate from anywhere with{' '}
            <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Aksa Meet</span>
            . Enterprise-grade video conferencing, available to all.
          </p>
        </div>

        {/* Action Controls - Enhanced */}
        <div className="w-full max-w-2xl flex justify-center mb-10">
          <div className="w-full flex flex-col items-center sm:flex-row gap-4 sm:gap-4 justify-center bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/20">
            {isSignedIn ? (
              <ButtonWithIcon
                onClick={handleNewMeeting}
                icon={<Videocall />}
                className="shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                New meeting
              </ButtonWithIcon>
            ) : (
              <SignInButton>
                <Button size="md" className="shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all duration-300">
                  Sign in to start
                </Button>
              </SignInButton>
            )}

            <form
              onSubmit={handleCode}
              className="flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              <TextField
                label="Code or link"
                name="code"
                placeholder="abc-defg-hij"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                icon={<KeyboardFilled />}
                maxLength={200}
              />
              <PlainButton
                type="submit"
                disabled={!code.trim()}
                className={clsx(
                  'px-5 py-2.5 rounded-xl font-semibold transition-all duration-300',
                  code
                    ? 'text-blue-600 hover:bg-blue-50 hover:scale-105 border border-blue-200/50'
                    : 'text-gray-400 cursor-not-allowed border border-gray-200'
                )}
              >
                Join
              </PlainButton>
            </form>
          </div>
        </div>

        {/* Features Showcase - Enhanced */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 px-4">
          <div className="group p-6 rounded-2xl border border-gray-200/50 bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-500 hover:border-blue-300/50 cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              ⚡
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
              Crystal Clear Quality
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Experience lag-free 1080p HD video calls with adaptive bitrate streaming. Perfect for teams of 5+ participants.
            </p>
          </div>

          <div className="group p-6 rounded-2xl border border-gray-200/50 bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-500 hover:border-indigo-300/50 cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              🖥️
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-indigo-600 transition-colors">
              Smart Screen Sharing
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Share your screen instantly with automatic speaker spotlight and intelligent layout switching.
            </p>
          </div>

          <div className="group p-6 rounded-2xl border border-gray-200/50 bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-500 hover:border-sky-300/50 cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              🔒
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-sky-600 transition-colors">
              Secure & Private
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Bank-level encryption, secure meeting codes, and host controls ensure your conversations stay private.
            </p>
          </div>
        </div>

        {/* Share Link Banner - Enhanced */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-2xl p-6 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border border-blue-200/60 mb-8 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl animate-pulse"></div>
            <Image
              src="https://www.gstatic.com/meet/user_edu_get_a_link_light_90698cd7b4ca04d3005c962a3756c42d.svg"
              alt="Get a link you can share"
              width={130}
              height={130}
              className="shrink-0 relative z-10"
            />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2 justify-center sm:justify-start">
              <span>Share instantly</span>
              <span className="text-2xl">🔗</span>
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Click <span className="font-bold text-blue-600">New meeting</span> to create a unique shareable link. 
              Invite team members, friends, or clients with a single click.
            </p>
          </div>
        </div>

        {checkingCode && (
          <div className="z-50 fixed inset-0 flex flex-col items-center justify-center text-white backdrop-blur-md bg-black/60 animate-transition-overlay-fade-in gap-5">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
            <div className="text-center">
              <span className="text-2xl font-semibold">Joining Aksa Meet...</span>
              <p className="text-sm text-gray-300 mt-2">Preparing your meeting experience</p>
            </div>
          </div>
        )}

        {error && (
          <div className="z-50 fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center justify-center animate-fade-in">
            <div className="rounded-2xl px-6 py-4 font-medium text-white text-sm bg-gradient-to-r from-red-600 to-red-700 backdrop-blur-xl border border-red-400/30 shadow-2xl flex items-center gap-3 max-w-md">
              <span className="text-2xl animate-pulse">⚠️</span>
              <div>
                <p className="font-semibold">Unable to join meeting</p>
                <p className="text-xs text-red-100 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        <footer className="relative z-10 w-full max-w-4xl mt-auto pt-10 pb-6 text-center sm:text-left border-t border-gray-200/50 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Aksa Meet.</span>
            <span className="hidden sm:inline">•</span>
            <span>All rights reserved.</span>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-medium border border-blue-200/50">
              Powered by Stream SFU
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Home;
