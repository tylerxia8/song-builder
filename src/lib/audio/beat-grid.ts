export function beatDuration(bpm: number): number {
  return 60 / bpm;
}

export function gridDuration(bpm: number, division = 4): number {
  return beatDuration(bpm) / division;
}

export function quantizeToGrid(
  timeSec: number,
  bpm: number,
  gridOriginSec = 0,
  division = 4,
): number {
  const grid = gridDuration(bpm, division);
  const relative = timeSec - gridOriginSec;
  return gridOriginSec + Math.round(relative / grid) * grid;
}

export function snapOnsetsToGrid(
  onsets: number[],
  bpm: number,
  gridOriginSec = 0,
  division = 4,
): number[] {
  const grid = gridDuration(bpm, division);
  const snapped = onsets.map((time) => quantizeToGrid(time, bpm, gridOriginSec, division));
  const deduped: number[] = [];

  snapped
    .sort((a, b) => a - b)
    .forEach((time) => {
      if (time < 0) return;
      if (deduped.length === 0 || time - deduped[deduped.length - 1] >= grid * 0.45) {
        deduped.push(time);
      }
    });

  return deduped;
}

export function estimateBpmFromIntervals(onsets: number[]): number | null {
  if (onsets.length < 2) return null;

  const votes = new Map<number, number>();

  for (let i = 1; i < onsets.length; i += 1) {
    const interval = onsets[i] - onsets[i - 1];
    if (interval < 0.12 || interval > 2) continue;

    [1, 2, 0.5].forEach((multiplier) => {
      const bpm = Math.round(60 / (interval * multiplier));
      if (bpm >= 60 && bpm <= 180) {
        votes.set(bpm, (votes.get(bpm) ?? 0) + 1);
      }
    });
  }

  if (votes.size === 0) return null;

  let bestBpm = 120;
  let bestScore = -1;
  votes.forEach((score, bpm) => {
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  });

  return bestBpm;
}

export function estimateMasterBpm(
  onsetsByTrack: Map<string, number[]>,
  preferredType: string,
): number {
  const weighted: number[] = [];

  onsetsByTrack.forEach((onsets, type) => {
    const bpm = estimateBpmFromIntervals(onsets);
    if (!bpm) return;

    const weight = type === preferredType ? 4 : type === "melody" ? 2 : 1;
    for (let i = 0; i < weight; i += 1) {
      weighted.push(bpm);
    }
  });

  if (weighted.length === 0) return 120;

  weighted.sort((a, b) => a - b);
  return weighted[Math.floor(weighted.length / 2)];
}

export function clampTempoScale(trackBpm: number, masterBpm: number): number {
  const ratio = trackBpm / masterBpm;
  if (Math.abs(ratio - 1) < 0.06) return 1;
  return Math.min(1.12, Math.max(0.88, ratio));
}
