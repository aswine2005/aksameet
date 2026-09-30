'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInButton, useUser } from '@clerk/nextjs';
import clsx from 'clsx';

import { MEETING_ID_REGEX } from '@/lib/constants';
import Header from '@/components/Header';
import KeyboardFilled from '@/components/icons/KeyboardFilled';
import NewMeetingDialog from '@/components/NewMeetingDialog';
import TextField from '@/components/TextField';

const AKSARANK_URL = process.env.NEXT_PUBLIC_AKSARANK_URL;

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

const ECOSYSTEM = [
  {
    name: 'AksaRank Exams',
    tag: 'Proctoring',
    text: 'Online exams watched by AI on the student’s own laptop — face, gaze, phones and voices — with every event signed and every decision left to a person.',
    accent: 'from-blue-600 to-indigo-600',
  },
  {
    name: 'AksaMeet',
    tag: 'You are here',
    text: 'Classes and meetings with automatic attendance and private attention insights for the host. Sign-in required, nothing recorded for analysis.',
    accent: 'from-sky-500 to-cyan-600',
  },
  {
    name: 'AksaRank Side Camera',
    tag: 'Android',
    text: 'The student’s phone becomes a second camera beside the desk, counting people in the room where a webcam cannot see.',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    name: 'Speech Insights',
    tag: 'Tamil · English',
    text: 'Speech in Tamil, English or Tanglish is heard and summarised for the invigilator — advisory, never a verdict.',
    accent: 'from-violet-500 to-purple-600',
  },
];

const PRINCIPLES = [
  {
    title: 'Analysed on the student’s device',
    text: 'Attention is estimated in each participant’s own browser. Video never goes to our server for analysis — only minutes do.',
  },
  {
    title: 'Told, not watched in secret',
    text: 'Before joining, every participant is shown exactly what the meeting measures. The host’s panel is private; its existence is not.',
  },
  {
    title: 'Private to the host',
    text: 'Nobody sees another participant’s attention or alerts. A student can see their own record, and only their own.',
  },
  {
    title: 'Evidence, not verdicts',
    text: 'A turned head is not misconduct. The panel tells the host where to look; the host decides what it means.',
  },
];

const STEPS = [
  {
    title: 'Create',
    text: 'Name the meeting and choose what to measure — attendance, attention, and how long counts as “away”.',
  },
  {
    title: 'Share the link',
    text: 'Participants sign in (Google works) and see what is measured before they join.',
  },
  {
    title: 'Teach',
    text: 'A private panel shows who is here and alerts you when someone has been turned away too long.',
  },
  {
    title: 'Review',
    text: 'Every meeting keeps its history: duration, attendance, rejoins and attention, exportable as CSV.',
  },
];

const Home = () => {
  const { isLoaded, isSignedIn } = useUser();
  const [code, setCode] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(''), 3500);
    return () => clearTimeout(timeout);
  }, [error]);

  const handleCode = async (e: FormEvent) => {
    e.preventDefault();
    const meetingId = parseMeetingCode(code);
    if (!meetingId) {
      setError('Enter a valid meeting code, like abc-defg-hij.');
      return;
    }
    // Signed out: go straight there, and sign-in brings them back to it.
    if (!isSignedIn) {
      router.push(`/${meetingId}`);
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
    } catch {
      setError('Network error. Check your connection and try again.');
    }
    setCheckingCode(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white">
      <Header />
      <main className={clsx('flex-1', isLoaded ? 'animate-fade-in' : 'opacity-0')}>
        {/* Hero */}
        <section className="px-4 sm:px-6 pt-14 pb-10 text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-blue-200/70 text-blue-700 text-sm font-semibold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Part of the AksaRank integrity ecosystem
          </span>
          <h1 className="mt-6 max-w-4xl text-4xl sm:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
            Online classes that keep their{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              integrity
            </span>{' '}
            — and everyone’s dignity
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-600 leading-relaxed">
            AksaMeet is AksaRank’s meeting room for colleges: HD video, automatic attendance, and
            attention insights worked out on each student’s own device — never recorded, never
            streamed to a server.
          </p>

          <div className="mt-8 w-full max-w-2xl flex flex-col sm:flex-row items-center gap-4 justify-center bg-white/70 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/40">
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                New meeting
              </button>
            ) : (
              <SignInButton>
                <button
                  type="button"
                  className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30"
                >
                  Sign in to start
                </button>
              </SignInButton>
            )}
            <form onSubmit={handleCode} className="flex items-center gap-3">
              <TextField
                label="Code or link"
                name="code"
                placeholder="abc-defg-hij"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                icon={<KeyboardFilled />}
                maxLength={200}
              />
              <button
                type="submit"
                disabled={!code.trim()}
                className={clsx(
                  'h-12 px-5 rounded-xl font-semibold border transition-colors',
                  code.trim()
                    ? 'text-blue-600 border-blue-200 hover:bg-blue-50'
                    : 'text-gray-400 border-gray-200 cursor-not-allowed'
                )}
              >
                Join
              </button>
            </form>
          </div>
          {!isSignedIn && isLoaded && (
            <p className="mt-3 text-sm text-gray-500">
              Every participant signs in — that is what lets attendance name who was there.
            </p>
          )}
        </section>

        {/* How it works */}
        <section className="px-4 sm:px-6 py-10">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">How AksaMeet runs a class</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl bg-white/80 border border-gray-200/70 p-5 shadow-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Ecosystem */}
        <section className="px-4 sm:px-6 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">The AksaRank ecosystem</h2>
              <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
                One idea across exams, classes and devices: fair assessment that checks the work, not
                the person’s home.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {ECOSYSTEM.map((product) => (
                <article
                  key={product.name}
                  className={clsx(
                    'rounded-2xl bg-white border p-6 shadow-sm',
                    product.tag === 'You are here' ? 'border-sky-300 ring-2 ring-sky-100' : 'border-gray-200/70'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                    <span
                      className={clsx(
                        'rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white',
                        product.accent
                      )}
                    >
                      {product.tag}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{product.text}</p>
                </article>
              ))}
            </div>
            {AKSARANK_URL && (
              <div className="mt-6 text-center">
                <a href={AKSARANK_URL} className="font-semibold text-blue-600 hover:underline">
                  Open AksaRank →
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Principles */}
        <section className="px-4 sm:px-6 py-10">
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-gray-900 to-indigo-950 p-8 sm:p-10 text-white">
            <h2 className="text-2xl sm:text-3xl font-bold">Integrity with dignity</h2>
            <p className="mt-2 text-indigo-200 max-w-2xl">
              Watching a class is easy. Doing it without treating students as suspects is the design.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {PRINCIPLES.map((p) => (
                <div key={p.title}>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-indigo-100/80 leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scale */}
        <section className="px-4 sm:px-6 py-10">
          <div className="mx-auto max-w-5xl grid gap-4 sm:grid-cols-3">
            {[
              ['60 students', 'cost the server what 5 do — every laptop does its own looking'],
              ['2 frames a second', 'analysed per student, a few milliseconds each'],
              ['15 seconds', 'between heartbeats; a class of 60 is 4 small writes a second'],
            ].map(([figure, text]) => (
              <div key={figure} className="rounded-2xl bg-white/80 border border-gray-200/70 p-5 text-center shadow-sm">
                <div className="text-2xl font-bold text-blue-700">{figure}</div>
                <div className="mt-1 text-sm text-gray-600">{text}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="px-4 sm:px-6 py-6 border-t border-gray-200/60 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-5xl mx-auto w-full">
        <span>© {new Date().getFullYear()} AksaMeet · an AksaRank product</span>
        <span>Video by Stream · Sign-in by Clerk</span>
      </footer>

      {isSignedIn && <NewMeetingDialog open={creating} onClose={() => setCreating(false)} />}

      {checkingCode && (
        <div className="z-50 fixed inset-0 flex items-center justify-center text-white backdrop-blur-md bg-black/60">
          <div className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-xl font-semibold">Joining AksaMeet…</span>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="z-50 fixed bottom-8 left-1/2 -translate-x-1/2 rounded-2xl px-6 py-4 text-sm text-white bg-red-600 shadow-2xl max-w-[calc(100vw-2rem)]"
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default Home;
