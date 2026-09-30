// Copy MediaPipe's WASM runtime into public/, so the attention model loads
// from this app's own origin rather than a CDN -- the same rule AksaRank's
// exam proctoring follows. Run before `dev` and `build` (including on
// Vercel), so the files always match the installed package version.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const target = join(root, 'public', 'mediapipe', 'wasm');

if (!existsSync(source)) {
  console.error('copy-vision-assets: @mediapipe/tasks-vision is not installed');
  process.exit(1);
}
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log('copy-vision-assets: MediaPipe WASM copied to public/mediapipe/wasm');
