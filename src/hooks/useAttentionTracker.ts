'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCallStateHooks } from '@stream-io/video-react-sdk';

import {
  AttentionTotals,
  FaceReading,
  Tracker,
  classifyFrame,
  drain,
  startTracker,
  step,
} from '@/lib/attention';
import { FaceAnalyzer, loadFaceAnalyzer } from '@/lib/client/faceAnalyzer';
import { steadyInterval } from '@/lib/client/steadyInterval';

/**
 * Two frames a second. Attention changes over seconds, not milliseconds, and
 * this runs on the student's own laptop alongside the call -- a cost nobody
 * should notice: one pass of a 3.7 MB face landmarker per frame, a few
 * milliseconds on a GPU.
 */
const FRAME_MS = 500;

export type TrackerStatus = 'off' | 'loading' | 'running' | 'unavailable';

/**
 * Watches the student's own camera, on their own device, and keeps count of
 * how long they spend in each attention state.
 *
 * Nothing it sees is sent anywhere. `takeTotals` hands over the minutes, and
 * that is all the heartbeat carries.
 */
export function useAttentionTracker(enabled: boolean) {
  const { useCameraState } = useCallStateHooks();
  const { mediaStream, optimisticIsMute } = useCameraState();
  const [status, setStatus] = useState<TrackerStatus>('off');
  const tracker = useRef<Tracker>(startTracker(Date.now()));
  const video = useRef<HTMLVideoElement | null>(null);
  const cameraOn = useRef(false);

  // A video element fed from the local camera, kept in the page but out of
  // sight. In the page rather than detached: Chrome decodes a detached video
  // happily, Safari is not so obliging, and a video with no frames reads as
  // a student who is not there.
  useEffect(() => {
    if (!video.current) {
      const element = document.createElement('video');
      element.muted = true;
      element.playsInline = true;
      element.autoplay = true;
      element.setAttribute('aria-hidden', 'true');
      Object.assign(element.style, {
        position: 'fixed',
        right: '0',
        bottom: '0',
        width: '2px',
        height: '2px',
        opacity: '0.01',
        pointerEvents: 'none',
      });
      document.body.appendChild(element);
      video.current = element;
    }
    const element = video.current;
    cameraOn.current = !optimisticIsMute && !!mediaStream;
    if (cameraOn.current && element.srcObject !== mediaStream) {
      element.srcObject = mediaStream ?? null;
      element.play().catch(() => undefined);
    } else if (!cameraOn.current) {
      element.srcObject = null;
    }
  }, [mediaStream, optimisticIsMute]);

  // Out of the page when the meeting page goes.
  useEffect(
    () => () => {
      const element = video.current;
      if (element) {
        element.srcObject = null;
        element.remove();
        video.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return;
    }
    let cancelled = false;
    let stop: (() => void) | null = null;
    let analyzer: FaceAnalyzer | null = null;

    const tick = () => {
      const now = Date.now();
      const element = video.current;
      const tabHidden = document.visibilityState === 'hidden';
      const on =
        cameraOn.current && !!element && element.readyState >= 2 && element.videoWidth > 0;
      let faces: FaceReading[] = [];
      if (on && !tabHidden && analyzer && element) {
        try {
          faces = analyzer.analyze(element);
        } catch {
          // A frame the model could not read is not a verdict on anybody.
          return;
        }
      }
      step(tracker.current, classifyFrame({ cameraOn: on, tabHidden, faces }), now);
    };

    const onVisibility = () => tick();

    setStatus('loading');
    loadFaceAnalyzer()
      .then((loaded) => {
        if (cancelled) {
          loaded.close();
          return;
        }
        analyzer = loaded;
        tracker.current = startTracker(Date.now());
        stop = steadyInterval(tick, FRAME_MS);
        document.addEventListener('visibilitychange', onVisibility);
        setStatus('running');
      })
      .catch((error) => {
        console.error('Attention model failed to load', error);
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
      stop?.();
      document.removeEventListener('visibilitychange', onVisibility);
      analyzer?.close();
    };
  }, [enabled]);

  /** Minutes counted since the last call, and the current confirmed state. */
  const takeTotals = useCallback((): {
    totals: AttentionTotals | null;
    live: { state: Tracker['state']; since: number } | null;
  } => {
    if (status !== 'running') return { totals: null, live: null };
    const t = tracker.current;
    // Count up to this instant before handing over.
    step(t, t.candidate ?? t.state, Date.now());
    return { totals: drain(t), live: { state: t.state, since: t.since } };
  }, [status]);

  return { status, takeTotals };
}
