'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { DEFAULT_SETTINGS, sanitizeSettings } from '@/lib/attendance';
import { createMeeting } from '@/components/NewMeetingDialog';
import LoadingOverlay from '@/components/LoadingOverlay';

/**
 * /new?title=DBMS+Unit+3&attention=0 -- create a meeting from a link.
 *
 * The door AksaRank uses: a "Start class" button there is just a link here.
 * Middleware has already made sure the visitor is signed in, so they become
 * the host. Query flags are optional; anything missing uses the defaults.
 */
function Create() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const flag = (name: string) => {
      const value = params.get(name);
      return value === null ? undefined : value === '1' || value === 'true';
    };
    const settings = sanitizeSettings(
      {
        attendance: flag('attendance'),
        attention: flag('attention'),
        awayAlertSeconds: params.get('alert') ?? undefined,
      },
      DEFAULT_SETTINGS
    );
    createMeeting(params.get('title') ?? '', settings)
      .then((id) => router.replace(`/${id}`))
      .catch((err) => setError((err as Error).message));
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Couldn&apos;t create the meeting</h1>
        <p className="text-gray-600">{error}</p>
        <Link href="/" className="font-semibold text-blue-600 hover:underline">
          Go to AksaMeet
        </Link>
      </div>
    );
  }
  return <LoadingOverlay />;
}

export default function NewMeetingPage() {
  return (
    <Suspense fallback={<LoadingOverlay />}>
      <Create />
    </Suspense>
  );
}
