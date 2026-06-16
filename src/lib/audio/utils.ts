export const MIN_RENDER_DURATION_SEC = 0.5;

export function ensureMinDuration(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return MIN_RENDER_DURATION_SEC;
  }
  return Math.max(MIN_RENDER_DURATION_SEC, duration);
}

export function safeTrimStart(trimStartSec: number, bufferDuration: number): number {
  if (bufferDuration <= 0.05) return 0;
  return Math.min(Math.max(0, trimStartSec), bufferDuration - 0.05);
}

export function generateDefaultBeatGrid(bpm: number, duration: number): number[] {
  const beatDuration = 60 / bpm;
  const onsets: number[] = [];

  for (let time = 0; time < duration; time += beatDuration / 2) {
    onsets.push(time);
  }

  return onsets.length > 0 ? onsets : [0];
}
