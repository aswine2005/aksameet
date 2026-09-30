'use client';

// A short two-note chime for someone joining or leaving, synthesised here
// rather than borrowed from another product's sound files.
let context: AudioContext | null = null;

export function chime(direction: 'up' | 'down' = 'up') {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const notes = direction === 'up' ? [660, 880] : [880, 660];
    notes.forEach((frequency, index) => {
      const osc = context!.createOscillator();
      const gain = context!.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      const start = now + index * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(gain).connect(context!.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {
    // No audio output is not worth an error.
  }
}
