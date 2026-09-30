'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';

import { MEETING_ID_REGEX } from '@/lib/constants';

/** The meeting a signed-out visitor was trying to reach, if it was one. */
function useTargetMeeting(): string | null {
  const params = useSearchParams();
  const target = params.get('redirect_url');
  if (!target) return null;
  try {
    const first = new URL(target, 'http://x').pathname.split('/').filter(Boolean)[0] ?? '';
    return MEETING_ID_REGEX.test(first) ? first : null;
  } catch {
    return null;
  }
}

function Heading() {
  const meeting = useTargetMeeting();
  return (
    <div className="mb-6 text-center max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">
        {meeting ? 'Sign in to join the meeting' : 'Sign in to AksaMeet'}
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        {meeting ? (
          <>
            You&apos;re joining <span className="font-mono">{meeting}</span>. Every participant signs
            in so the host&apos;s attendance shows who was there — you&apos;ll come straight back to
            the meeting.
          </>
        ) : (
          'Use your college Google account or email.'
        )}
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-50/40 via-white to-gray-50 py-12 px-4">
      <Suspense fallback={null}>
        <Heading />
      </Suspense>
      <SignIn />
    </div>
  );
}
