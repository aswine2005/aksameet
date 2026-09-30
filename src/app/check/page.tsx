'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

import Header from '@/components/Header';
import {
  AttentionState,
  FaceReading,
  STATE_LABEL,
  classifyFrame,
  startTracker,
  step,
} from '@/lib/attention';
import { FaceAnalyzer, loadFaceAnalyzer } from '@/lib/client/faceAnalyzer';
import { STATE_STYLE } from '@/lib/client/states';

type Status = 'idle' | 'starting' | 'running' | 'denied' | 'failed';

const degrees = (radians: number | null) =>
  radians === null ? '—' : `${Math.round((radians * 180) / Math.PI)}°`;

/**
 * "Check your camera": the attention model, on your own screen.
 *
 * The same model and the same rules a meeting uses, shown to the person they
 * are about. A student can find the camera angle that reads them correctly
 * before class -- and can see for themselves that nothing here is more than
 * a face-direction estimate, worked out in their own browser.
 */
export default function CameraCheck() {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [state, setState] = useState<AttentionState | null>(null);
  const [face, setFace] = useState<FaceReading | null>(null);
  const [faces, setFaces] = useState(0);
  const [delegate, setDelegate] = useState('');
  // Separate from `status`: the effect below sets the status, and if it also
  // depended on it, reaching "running" would re-run the effect -- and its
  // cleanup would stop the camera the instant it started.
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    setStatus('starting');
    let stream: MediaStream | null = null;
    let analyzer: FaceAnalyzer | null = null;
    let timer: number | undefined;
    let cancelled = false;
    const tracker = startTracker(Date.now());

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      } catch {
        if (!cancelled) setStatus('denied');
        return;
      }
      try {
        const element = video.current!;
        element.srcObject = stream;
        await element.play();
        analyzer = await loadFaceAnalyzer();
        if (cancelled) return;
        setDelegate(analyzer.delegate);
        setStatus('running');
        const tick = () => {
          let readings;
          try {
            readings = analyzer!.analyze(element);
          } catch {
            return; // one unreadable frame; the next one is half a second away
          }
          const raw = classifyFrame({
            cameraOn: element.videoWidth > 0,
            tabHidden: document.visibilityState === 'hidden',
            faces: readings,
          });
          step(tracker, raw, Date.now());
          setState(tracker.state);
          setFaces(readings.length);
          setFace(readings[0] ?? null);
        };
        timer = window.setInterval(tick, 500);
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      analyzer?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [started]);

  const eyesOpen = face?.blendshapes
    ? Math.round((1 - ((face.blendshapes.eyeBlinkLeft ?? 0) + (face.blendshapes.eyeBlinkRight ?? 0)) / 2) * 100)
    : null;
  const style = state ? STATE_STYLE[state] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Check your camera</h1>
        <p className="mt-1 max-w-2xl text-gray-600">
          See what AksaMeet’s attention insights see. Everything on this page runs in your browser;
          nothing is sent anywhere.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gray-900 shadow-xl">
            <video ref={video} muted playsInline className="h-full w-full object-cover -scale-x-100" />
            {status !== 'running' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
                {status === 'idle' && (
                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    className="rounded-xl bg-white px-6 py-3 font-semibold text-gray-900 shadow-lg hover:bg-blue-50"
                  >
                    Start camera check
                  </button>
                )}
                {status === 'starting' && <p>Starting camera and loading the model…</p>}
                {status === 'denied' && (
                  <p>Camera access was refused. Allow it in your browser’s address bar and reload.</p>
                )}
                {status === 'failed' && <p>The attention model could not start on this device.</p>}
              </div>
            )}
            {status === 'running' && style && (
              <div
                className={clsx(
                  'absolute left-4 top-4 flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold',
                  style.chip
                )}
              >
                <span className={clsx('h-2.5 w-2.5 rounded-full', style.dot)} />
                {STATE_LABEL[state!]}
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900">What the model reads</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Reading label="Faces in view" value={status === 'running' ? String(faces) : '—'} />
              <Reading label="Head turned (left/right)" value={degrees(face?.yaw ?? null)} hint="within ±26° counts as facing" />
              <Reading label="Head tilted (down/up)" value={degrees(face?.pitch ?? null)} hint="down to 34°, up to 26°" />
              <Reading label="Eyes open" value={eyesOpen === null ? '—' : `${eyesOpen}%`} />
              <Reading label="Running on" value={delegate || '—'} />
            </dl>
            <h3 className="mt-6 font-semibold text-gray-900">For a correct reading</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
              <li>Sit so your whole face is in the frame, at arm’s length.</li>
              <li>Light your face from the front; a window behind you hides it.</li>
              <li>Put the camera level with your eyes if you can.</li>
              <li>A glance away for a few seconds is not counted — only a sustained one.</li>
            </ul>
            <Link href="/" className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:underline">
              ← Back to AksaMeet
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

const Reading = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-gray-600">
      {label}
      {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
    </dt>
    <dd className="font-semibold text-gray-900 tabular-nums">{value}</dd>
  </div>
);
