import { describe, expect, it } from 'vitest';

import {
  CONFIRM_MS,
  EYES_CLOSED_CONFIRM_MS,
  attentionPercent,
  classifyFrame,
  drain,
  emptyTotals,
  poseFromMatrix,
  startTracker,
  step,
} from './attention';

const facing = { yaw: 0.05, pitch: 0.15, blendshapes: {} };

describe('one frame', () => {
  it('reads a student facing the screen as attentive', () => {
    expect(classifyFrame({ cameraOn: true, tabHidden: false, faces: [facing] })).toBe('attentive');
  });

  it('allows a laptop camera’s natural downward look at the screen', () => {
    // The lens is above the screen: reading it is a slight nod.
    const reading = { ...facing, pitch: 0.4 };
    expect(classifyFrame({ cameraOn: true, tabHidden: false, faces: [reading] })).toBe('attentive');
  });

  it('reads a head turned to one side as away', () => {
    expect(
      classifyFrame({ cameraOn: true, tabHidden: false, faces: [{ ...facing, yaw: -0.7 }] })
    ).toBe('away');
  });

  it('reads the chin down at the desk as away', () => {
    expect(
      classifyFrame({ cameraOn: true, tabHidden: false, faces: [{ ...facing, pitch: 0.8 }] })
    ).toBe('away');
  });

  it('reads both eyes turned to one side as away, with the head still facing', () => {
    const blendshapes = { eyeLookOutLeft: 0.8, eyeLookInRight: 0.75 };
    expect(
      classifyFrame({ cameraOn: true, tabHidden: false, faces: [{ ...facing, blendshapes }] })
    ).toBe('away');
  });

  it('does not read one eye alone as a look away', () => {
    // A squint or a lazy eye moves one iris; a look moves both.
    const blendshapes = { eyeLookOutLeft: 0.9, eyeLookInRight: 0.1 };
    expect(
      classifyFrame({ cameraOn: true, tabHidden: false, faces: [{ ...facing, blendshapes }] })
    ).toBe('attentive');
  });

  it('reads eyes looking down into a lap as away', () => {
    const blendshapes = { eyeLookDownLeft: 0.8, eyeLookDownRight: 0.8 };
    expect(
      classifyFrame({ cameraOn: true, tabHidden: false, faces: [{ ...facing, blendshapes }] })
    ).toBe('away');
  });

  it('separates closed eyes, an empty seat, a camera turned off and a hidden tab', () => {
    const closed = { ...facing, blendshapes: { eyeBlinkLeft: 0.9, eyeBlinkRight: 0.8 } };
    expect(classifyFrame({ cameraOn: true, tabHidden: false, faces: [closed] })).toBe('eyes_closed');
    expect(classifyFrame({ cameraOn: true, tabHidden: false, faces: [] })).toBe('no_face');
    expect(classifyFrame({ cameraOn: false, tabHidden: false, faces: [] })).toBe('camera_off');
    // Checked first: a face watching another tab is not watching the class.
    expect(classifyFrame({ cameraOn: true, tabHidden: true, faces: [facing] })).toBe('tab_hidden');
  });
});

describe('smoothing over time', () => {
  it('ignores a glance shorter than the confirmation window', () => {
    const t = startTracker(0);
    step(t, 'away', 500);
    step(t, 'away', 1000);
    step(t, 'attentive', 1400);
    expect(t.state).toBe('attentive');
  });

  it('believes a look away that holds', () => {
    const t = startTracker(0);
    for (let now = 500; now <= 500 + CONFIRM_MS; now += 500) step(t, 'away', now);
    expect(t.state).toBe('away');
    // Dated from when it began, not from when it was confirmed.
    expect(t.since).toBe(500);
  });

  it('treats a blink as nothing and a long close as eyes closed', () => {
    const t = startTracker(0);
    step(t, 'eyes_closed', 500);
    step(t, 'attentive', 800);
    expect(t.state).toBe('attentive');
    for (let now = 1000; now <= 1000 + EYES_CLOSED_CONFIRM_MS; now += 500) step(t, 'eyes_closed', now);
    expect(t.state).toBe('eyes_closed');
  });

  it('believes a hidden tab at once', () => {
    const t = startTracker(0);
    step(t, 'tab_hidden', 500);
    expect(t.state).toBe('tab_hidden');
  });

  it('counts time in the confirmed state and hands it over once', () => {
    const t = startTracker(0);
    for (let now = 500; now <= 10_000; now += 500) step(t, 'attentive', now);
    const first = drain(t);
    expect(first.attentive).toBe(10_000);
    expect(drain(t).attentive).toBe(0);
  });

  it('does not count a laptop asleep for ten minutes', () => {
    const t = startTracker(0);
    step(t, 'attentive', 600_000);
    expect(drain(t).attentive).toBeLessThanOrEqual(5000);
  });
});

describe('attention percent', () => {
  it('leaves camera-off time out of both sides', () => {
    const totals = { ...emptyTotals(), attentive: 60_000, away: 20_000, camera_off: 600_000 };
    expect(attentionPercent(totals)).toBe(75);
  });

  it('says nothing about a student barely observed', () => {
    expect(attentionPercent({ ...emptyTotals(), attentive: 10_000 })).toBeNull();
  });
});

describe('head pose from the transformation matrix', () => {
  // Column-major rotation matrices, the layout MediaPipe emits.
  const aboutY = (a: number) => [
    Math.cos(a), 0, -Math.sin(a), 0,
    0, 1, 0, 0,
    Math.sin(a), 0, Math.cos(a), 0,
    0, 0, 0, 1,
  ];
  const aboutX = (a: number) => [
    1, 0, 0, 0,
    0, Math.cos(a), Math.sin(a), 0,
    0, -Math.sin(a), Math.cos(a), 0,
    0, 0, 0, 1,
  ];

  it('reads a turn as yaw and a nod as pitch', () => {
    const turn = poseFromMatrix(aboutY(0.5))!;
    expect(turn.yaw).toBeCloseTo(0.5, 5);
    expect(turn.pitch).toBeCloseTo(0, 5);
    const nod = poseFromMatrix(aboutX(0.4))!;
    expect(nod.pitch).toBeCloseTo(0.4, 5);
    expect(nod.yaw).toBeCloseTo(0, 5);
  });
});
