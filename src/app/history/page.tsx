'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

import Header from '@/components/Header';
import { formatDuration } from '@/lib/attendance';
import { dateTime } from '@/lib/client/format';

interface Hosted {
  id: string;
  title: string;
  createdAt: string;
  startedAt: number | null;
  endedAt: number | null;
  durationMs: number;
  live: boolean;
  participantCount: number;
}

interface Attended extends Omit<Hosted, 'participantCount'> {
  hostName: string;
  myPresentMs: number;
  myAttentionPercent: number | null;
}

type Tab = 'hosted' | 'attended';

export default function History() {
  const [data, setData] = useState<{ hosted: Hosted[]; attended: Attended[] } | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('hosted');

  useEffect(() => {
    fetch('/api/history', { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Could not load your history.');
        setData(body);
        if (body.hosted.length === 0 && body.attended.length > 0) setTab('attended');
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const rows = data ? data[tab] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Meeting history</h1>
        <p className="mt-1 text-gray-600">Every meeting you hosted or attended, with its duration.</p>

        <div className="mt-6 inline-flex rounded-xl bg-white p-1 shadow-sm border border-gray-200">
          {(['hosted', 'attended'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx(
                'rounded-lg px-4 py-2 text-sm font-medium capitalize',
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {t} {data && <span className="opacity-70">({data[t].length})</span>}
            </button>
          ))}
        </div>

        {error && <p className="mt-6 text-red-600">{error}</p>}
        {!data && !error && <p className="mt-6 text-gray-500">Loading…</p>}
        {data && rows.length === 0 && (
          <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white/60 p-8 text-center text-gray-500">
            {tab === 'hosted'
              ? 'No meetings hosted yet. Start one from the home page.'
              : 'You have not attended anyone else’s meeting yet.'}
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {rows.map((m) => (
            <li key={m.id}>
              <Link
                href={`/history/${m.id}`}
                className="block rounded-2xl bg-white border border-gray-200/80 p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">{m.title}</h2>
                  {m.live ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Live now
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">{dateTime(m.startedAt ?? m.createdAt)}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
                  <span className="font-mono text-xs text-gray-400 self-center">{m.id}</span>
                  <span>
                    Duration <strong className="text-gray-900">{m.startedAt ? formatDuration(m.durationMs) : 'not started'}</strong>
                  </span>
                  {'participantCount' in m && (
                    <span>
                      <strong className="text-gray-900">{m.participantCount}</strong> joined
                    </span>
                  )}
                  {'myPresentMs' in m && (
                    <>
                      <span>Host: {m.hostName}</span>
                      <span>
                        You: <strong className="text-gray-900">{formatDuration(m.myPresentMs)}</strong>
                        {m.myAttentionPercent !== null && ` · attention ${m.myAttentionPercent}%`}
                      </span>
                    </>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
