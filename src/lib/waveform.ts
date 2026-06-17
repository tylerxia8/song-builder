export async function computeWaveformPeaks(
  source: Blob | string,
  sampleCount = 128,
): Promise<number[]> {
  const arrayBuffer =
    source instanceof Blob
      ? await source.arrayBuffer()
      : await fetch(source).then((response) => response.arrayBuffer());

  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / sampleCount));
    const peaks: number[] = [];

    for (let index = 0; index < sampleCount; index += 1) {
      let max = 0;
      const start = index * blockSize;
      const end = Math.min(channel.length, start + blockSize);
      for (let sample = start; sample < end; sample += 1) {
        max = Math.max(max, Math.abs(channel[sample] ?? 0));
      }
      peaks.push(max);
    }

    return peaks;
  } finally {
    await audioContext.close();
  }
}

export async function getOrComputeWaveformPeaks(
  assetId: string,
  source: Blob | string,
  getCached: (id: string) => number[] | undefined,
  setCached: (id: string, peaks: number[]) => void,
): Promise<number[]> {
  const cached = getCached(assetId);
  if (cached) return cached;

  const peaks = await computeWaveformPeaks(source);
  setCached(assetId, peaks);
  return peaks;
}
