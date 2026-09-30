'use client';

import { FaceReading, poseFromMatrix } from '@/lib/attention';

const WASM_PATH = '/mediapipe/wasm';
const MODEL_PATH = '/models/face_landmarker.task';

type Landmarker = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => {
    faceLandmarks: unknown[];
    faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
    facialTransformationMatrixes?: { data: number[] }[];
  };
  close: () => void;
};

export interface FaceAnalyzer {
  /** Faces in the video's current frame. Throws on a frame it cannot read. */
  analyze: (video: HTMLVideoElement) => FaceReading[];
  delegate: 'GPU' | 'CPU';
  close: () => void;
}

/**
 * MediaPipe's face landmarker, served from this app's own origin.
 *
 * One model for both the meeting and the camera check, so what a student
 * sees on the check page is exactly what is measured in class.
 */
export async function loadFaceAnalyzer(): Promise<FaceAnalyzer> {
  const vision = await import('@mediapipe/tasks-vision');
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_PATH);
  const create = (delegate: 'GPU' | 'CPU') =>
    vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: 'VIDEO',
      numFaces: 2,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    }).then((landmarker) => ({ landmarker: landmarker as unknown as Landmarker, delegate }));

  // Some laptops expose no usable WebGL; the CPU path is slower but works.
  const { landmarker, delegate } = await create('GPU').catch(() => create('CPU'));
  let last = 0;
  return {
    delegate,
    analyze(video) {
      // The landmarker insists on strictly increasing timestamps.
      last = Math.max(last + 1, performance.now());
      const result = landmarker.detectForVideo(video, last);
      return result.faceLandmarks.map((_, index) => {
        const matrix = result.facialTransformationMatrixes?.[index];
        const pose = matrix ? poseFromMatrix(matrix.data) : null;
        const categories = result.faceBlendshapes?.[index]?.categories;
        return {
          yaw: pose?.yaw ?? null,
          pitch: pose?.pitch ?? null,
          blendshapes: categories
            ? Object.fromEntries(categories.map((c) => [c.categoryName, c.score]))
            : null,
        };
      });
    },
    close: () => landmarker.close(),
  };
}
