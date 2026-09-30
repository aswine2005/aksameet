'use client';

// A timer that keeps time in a background tab.
//
// Chrome throttles a hidden tab's timers to once a second, and after five
// minutes to once a minute. The heartbeat is every 15 seconds and a stay is
// over after 45 without one -- so a student who switched to their notes for
// five minutes would be marked as having left the meeting. Timers inside a
// dedicated worker are not throttled that way, and the message it posts wakes
// the page on schedule.

export function steadyInterval(callback: () => void, ms: number): () => void {
  if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const source = `setInterval(() => postMessage(0), ${Math.max(50, Math.round(ms))});`;
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      const worker = new Worker(url);
      worker.onmessage = () => callback();
      return () => {
        worker.terminate();
        URL.revokeObjectURL(url);
      };
    } catch {
      // A strict Content-Security-Policy can refuse blob: workers.
    }
  }
  const id = window.setInterval(callback, ms);
  return () => window.clearInterval(id);
}

/** A random id for one tab's stay in a meeting. */
export function newSessionId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
}
