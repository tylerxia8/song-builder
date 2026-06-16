export function detectOnsets(buffer: AudioBuffer, threshold = 0.008): number[] {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const frameSize = 1024;
  const hop = 512;
  const onsets: number[] = [];
  let prevEnergy = 0;

  for (let i = 0; i < data.length - frameSize; i += hop) {
    let energy = 0;
    for (let j = 0; j < frameSize; j += 1) {
      energy += data[i + j] ** 2;
    }
    energy /= frameSize;

    const flux = Math.max(0, energy - prevEnergy);
    const time = i / sampleRate;

    if (
      flux > threshold &&
      (onsets.length === 0 || time - onsets[onsets.length - 1] > 0.07)
    ) {
      onsets.push(time);
    }

    prevEnergy = energy * 0.9 + prevEnergy * 0.1;
  }

  return onsets;
}

export function estimateBpm(onsets: number[]): number | null {
  if (onsets.length < 3) return null;

  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i += 1) {
    const interval = onsets[i] - onsets[i - 1];
    if (interval >= 0.2 && interval <= 1.5) {
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) return null;

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  const bpm = 60 / median;

  if (bpm < 60) return bpm * 2;
  if (bpm > 180) return bpm / 2;
  return Math.round(bpm);
}
