'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import clsx from 'clsx';

import Header from '@/components/Header';
import Avatar from '@/components/Avatar';
import { STATE_LABEL, ATTENTION_STATES } from '@/lib/attention';
import { formatDuration, MeetingSettings, ParticipantSummary } from '@/lib/attendance';
import { dateTime, timeOfDay } from '@/lib/client/format';
import { STATE_STYLE } from '@/lib/client/states';

interface Report {
  meeting: {
    id: string;
    title: string;
    hostName: string;
    isHost: boolean;
    createdAt: string;
    endedAt: string | null;
    settings: MeetingSettings;
  };
  window: { startedAt: number | null; endedAt: number | null; durationMs: number; live: boolean };
  participants: ParticipantSummary[];
  timelines: Record<string, Record<string, number>>;
  spans: Record<string, [number, number][]>;
}

const REFRESH_WHILE_LIVE_MS = 10_000;

export default function ReportPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/report`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not load the report.');
        if (cancelled) return;
        setReport(body);
        // A report opened mid-class keeps itself current.
        if (body.window.live) timer = window.setTimeout(load, REFRESH_WHILE_LIVE_MS);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [meetingId]);

  const students = useMemo(() => report?.participants.filter((p) => !p.isHost) ?? [], [report]);
  const measured = students.filter((p) => p.attentionPercent !== null);
  const classAttention = measured.length
    ? Math.round(measured.reduce((s, p) => s + (p.attentionPercent ?? 0), 0) / measured.length)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white">
      <Header />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <Link href="/history" className="text-sm font-medium text-blue-600 hover:underline">
          ← History
        </Link>
        {error && <p className="mt-6 text-red-600">{error}</p>}
        {!report && !error && <p className="mt-6 text-gray-500">Loading…</p>}
        {report && (
          <>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 break-words">{report.meeting.title}</h1>
                <p className="mt-1 text-gray-600">
                  <span className="font-mono text-sm">{report.meeting.id}</span> · hosted by{' '}
                  {report.meeting.hostName} · {dateTime(report.window.startedAt ?? report.meeting.createdAt)}
                  {report.window.live && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Live now
                    </span>
                  )}
                </p>
              </div>
              {report.meeting.isHost && (
                <a
                  href={`/api/meetings/${meetingId}/report?format=csv`}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700"
                >
                  Download CSV
                </a>
              )}
            </div>

            {report.meeting.isHost ? (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Card label="Duration" value={report.window.startedAt ? formatDuration(report.window.durationMs) : '—'} />
                  <Card
                    label="Time"
                    value={`${timeOfDay(report.window.startedAt)} – ${report.window.live ? 'now' : timeOfDay(report.window.endedAt)}`}
                  />
                  <Card label="Joined" value={String(students.length)} />
                  <Card label="Present" value={String(students.filter((p) => p.status === 'present').length)} />
                  <Card label="Late" value={String(students.filter((p) => p.late).length)} />
                  <Card label="Class attention" value={classAttention === null ? '—' : `${classAttention}%`} />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Present means attending at least {report.meeting.settings.presentPercent}% of the meeting; late
                  means joining more than {report.meeting.settings.lateAfterMinutes} minutes after it started.
                  Attention is estimated on each student’s own device and is advisory.
                </p>
                <AttendanceTable people={report.participants} />
                {report.window.startedAt && students.length > 0 && (
                  <Timeline report={report} people={students} />
                )}
              </>
            ) : (
              <OwnRecord person={report.participants[0]} settings={report.meeting.settings} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

const Card = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-white border border-gray-200/80 p-4 shadow-sm">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
  </div>
);

const Status = ({ person }: { person: ParticipantSummary }) => (
  <div className="flex flex-wrap gap-1">
    {person.isHost ? (
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Host</span>
    ) : (
      <span
        className={clsx(
          'rounded-full px-2 py-0.5 text-xs font-semibold',
          person.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
        )}
      >
        {person.status === 'present' ? 'Present' : 'Partial'}
      </span>
    )}
    {person.late && (
      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-900">
        Late {formatDuration(person.lateByMs)}
      </span>
    )}
    {person.inMeeting && (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">in now</span>
    )}
  </div>
);

const AttendanceTable = ({ people }: { people: ParticipantSummary[] }) => (
  <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm">
    <table className="w-full min-w-[56rem] text-left text-sm">
      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="px-4 py-3">Participant</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">First joined</th>
          <th className="px-4 py-3">Last seen</th>
          <th className="px-4 py-3">Present</th>
          <th className="px-4 py-3">Rejoins</th>
          <th className="px-4 py-3">Attention</th>
          <th className="px-4 py-3">Not attentive</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {people.map((p) => {
          const notAttentive = p.attention.away + p.attention.eyes_closed + p.attention.no_face + p.attention.tab_hidden;
          return (
            <tr key={p.userId} className="align-top">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar participant={{ name: p.name, image: p.image ?? undefined }} width={32} />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 truncate">{p.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Status person={p} />
              </td>
              <td className="px-4 py-3 text-gray-700">{timeOfDay(p.firstJoinAt)}</td>
              <td className="px-4 py-3 text-gray-700">{p.inMeeting ? 'now' : timeOfDay(p.lastSeenAt)}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{formatDuration(p.presentMs)}</div>
                <div className="text-xs text-gray-500">{p.percentOfMeeting}% of meeting</div>
              </td>
              <td className="px-4 py-3 text-gray-700">{p.rejoins}</td>
              <td className="px-4 py-3">
                <span className="font-semibold text-gray-900">
                  {p.isHost ? '—' : p.attentionPercent === null ? 'not measured' : `${p.attentionPercent}%`}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {p.isHost ? (
                  '—'
                ) : (
                  <>
                    <div>{formatDuration(notAttentive)} in all</div>
                    {(['away', 'tab_hidden', 'no_face', 'eyes_closed', 'camera_off'] as const)
                      .filter((s) => p.attention[s] >= 30_000)
                      .map((s) => (
                        <div key={s}>
                          {STATE_STYLE[s].short}: {formatDuration(p.attention[s])}
                        </div>
                      ))}
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

/** When each person was in the meeting, and how attentive, minute by minute. */
const Timeline = ({ report, people }: { report: Report; people: ParticipantSummary[] }) => {
  const start = report.window.startedAt!;
  const end = start + Math.max(report.window.durationMs, 60_000);
  const span = end - start;
  const firstMinute = Math.floor(start / 60_000);
  const minutes = Math.max(1, Math.ceil(span / 60_000));
  const pct = (t: number) => `${((Math.min(Math.max(t, start), end) - start) / span) * 100}%`;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-gray-900">Timeline</h2>
      <p className="mt-1 text-sm text-gray-600">
        Light bars show when each person was in the meeting; the colour inside is how attentive they
        were that minute.
      </p>
      <div className="mt-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="mb-2 flex justify-between pl-[9.75rem] text-xs text-gray-400">
          <span>{timeOfDay(start)}</span>
          <span>{timeOfDay(end)}</span>
        </div>
        <ul className="space-y-2">
          {people.map((p) => {
            const series = report.timelines[p.userId] ?? {};
            return (
              <li key={p.userId} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-sm text-gray-700" title={p.name}>
                  {p.name}
                </span>
                <div className="relative h-5 grow rounded bg-gray-100">
                  {(report.spans[p.userId] ?? []).map(([from, to], index) => (
                    <div
                      key={index}
                      className="absolute top-0 h-5 rounded bg-blue-100"
                      style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }}
                    />
                  ))}
                  {Array.from({ length: minutes }, (_, i) => {
                    const value = series[String(firstMinute + i)];
                    if (value === undefined) return null;
                    return (
                      <div
                        key={i}
                        className={clsx(
                          'absolute top-1 h-3',
                          value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-400' : 'bg-rose-500'
                        )}
                        style={{ left: `${(i / minutes) * 100}%`, width: `${100 / minutes}%` }}
                        title={`${timeOfDay((firstMinute + i) * 60_000)} — ${value}% attentive`}
                      />
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-4 pl-[9.75rem] text-xs text-gray-500">
          <Legend className="bg-blue-100" label="In the meeting" />
          <Legend className="bg-emerald-500" label="Attentive (70%+ of the minute)" />
          <Legend className="bg-amber-400" label="Mixed" />
          <Legend className="bg-rose-500" label="Mostly not attentive" />
        </div>
      </div>
    </section>
  );
};

const Legend = ({ className, label }: { className: string; label: string }) => (
  <span className="flex items-center gap-1.5">
    <span className={clsx('h-3 w-3 rounded-sm', className)} />
    {label}
  </span>
);

/** What a student sees: their own record, and nobody else's. */
const OwnRecord = ({ person, settings }: { person?: ParticipantSummary; settings: MeetingSettings }) => {
  if (!person) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white/60 p-8 text-center text-gray-500">
        {settings.attendance
          ? 'No attendance was recorded for you in this meeting.'
          : 'The host did not record attendance for this meeting.'}
      </p>
    );
  }
  return (
    <div className="mt-8 max-w-2xl rounded-2xl bg-white border border-gray-200/80 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">Your record</h2>
      <p className="mt-1 text-sm text-gray-600">
        This is everything the meeting recorded about you. Only you and the host can see it.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <Item label="Status" value={<Status person={person} />} />
        <Item label="Time present" value={`${formatDuration(person.presentMs)} (${person.percentOfMeeting}%)`} />
        <Item label="First joined" value={timeOfDay(person.firstJoinAt)} />
        <Item label="Rejoins" value={String(person.rejoins)} />
        {settings.attention && (
          <Item
            label="Attention"
            value={person.attentionPercent === null ? 'not enough to measure' : `${person.attentionPercent}%`}
          />
        )}
      </dl>
      {settings.attention && (
        <ul className="mt-5 space-y-1 text-sm text-gray-600">
          {ATTENTION_STATES.filter((s) => person.attention[s] > 0).map((s) => (
            <li key={s}>
              {STATE_LABEL[s]}: {formatDuration(person.attention[s])}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Item = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <dt className="text-xs text-gray-500">{label}</dt>
    <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
  </div>
);
