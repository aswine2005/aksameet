'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CallingState, useCallStateHooks } from '@stream-io/video-react-sdk';

import { useMeet } from '@/contexts/MeetProvider';
import { formatDuration, ParticipantSummary } from '@/lib/attendance';
import { chime } from '@/lib/client/chime';
import Button from '@/components/Button';
import PlainButton from '@/components/PlainButton';

const COUNTDOWN_SECONDS = 60;

const MeetingEnd = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { meeting, isHost, api, refreshMeeting } = useMeet();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [mine, setMine] = useState<ParticipantSummary | null>(null);
  const invalidMeeting = searchParams.get('invalid') === 'true';
  const left = invalidMeeting || callingState === CallingState.LEFT;

  useEffect(() => {
    if (!left) {
      router.push('/');
      return;
    }
    chime('down');
    const interval = setInterval(() => setCountdown((n) => (n ? n - 1 : 0)), 1000);
    return () => clearInterval(interval);
    // Runs once on arrival; later state changes must not restart the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown === 0) router.push('/');
  }, [countdown, router]);

  // So "Rejoin" is not offered for a meeting the host has just ended.
  useEffect(() => {
    refreshMeeting();
  }, [refreshMeeting]);

  // A student's own record, the moment they leave. Fetched after a beat so
  // the leave report has landed first.
  useEffect(() => {
    if (!left || isHost || !meeting?.settings.attendance) return;
    const timeout = setTimeout(() => {
      api(`/api/meetings/${meetingId}/report`)
        .then((r) => (r.ok ? r.json() : null))
        .then((report) => setMine(report?.participants?.[0] ?? null))
        .catch(() => undefined);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [left, isHost, meeting?.settings.attendance, api, meetingId]);

  if (!left) return null;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white">
      <div className="p-5 flex items-center gap-3 text-sm text-gray-600">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-500 font-semibold text-blue-700">
          {countdown}
        </span>
        Returning to the home screen
      </div>
      <div className="mt-6 px-4 flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          {invalidMeeting ? 'Check your meeting code' : 'You left the meeting'}
        </h1>
        {meeting && <p className="-mt-5 text-gray-600">{meeting.title}</p>}

        {mine && (
          <div className="rounded-2xl bg-white border border-gray-200 px-6 py-4 shadow-sm">
            <div className="text-sm text-gray-500">Your attendance</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{formatDuration(mine.presentMs)}</div>
            <div className="text-sm text-gray-600">
              {mine.joins > 1 ? `across ${mine.joins} stays` : 'in one stay'}
              {mine.attentionPercent !== null && ` · attention ${mine.attentionPercent}%`}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {!invalidMeeting && !meeting?.endedAt && (
            <PlainButton
              size="sm"
              className="border border-hairline-gray px-6"
              onClick={() => router.push(`/${meetingId}`)}
            >
              Rejoin
            </PlainButton>
          )}
          {isHost && (
            <Link
              href={`/history/${meetingId}`}
              className="h-10 inline-flex items-center rounded-xl border border-blue-200 px-5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              View attendance report
            </Link>
          )}
          <Button size="sm" onClick={() => router.push('/')}>
            Return to home screen
          </Button>
        </div>

        <div className="max-w-md rounded-2xl border border-hairline-gray bg-white/70 px-5 py-4 text-left">
          <h2 className="font-semibold text-gray-900">Only signed-in people can join</h2>
          <p className="mt-1 text-sm text-gray-600">
            Everyone in an AksaMeet meeting signs in first, so the host always knows who was there.
            {!isHost && ' You can see your own attendance any time under History.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MeetingEnd;
