export function measureRms(buffer: AudioBuffer): number {
  let sumSquares = 0;
  let count = 0;

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      sumSquares += data[index] * data[index];
      count += 1;
    }
  }

  return Math.sqrt(sumSquares / Math.max(1, count));
}

export function rmsToLufsApprox(rms: number): number {
  if (rms <= 0) return -Infinity;
  return 20 * Math.log10(rms) - 0.691;
}

export function lufsToGainDelta(currentLufs: number, targetLufs: number): number {
  return 10 ** ((targetLufs - currentLufs) / 20);
}

export async function masterAudioBufferAsync(
  buffer: AudioBuffer,
  targetLufs = -14,
): Promise<AudioBuffer> {
  const rms = measureRms(buffer);
  const currentLufs = rmsToLufsApprox(rms);
  const gain = Number.isFinite(currentLufs) ? lufsToGainDelta(currentLufs, targetLufs) : 1;
  const limitedGain = Math.min(gain, 8);

  if (typeof OfflineAudioContext === "undefined") {
    return applyGainAndLimit(buffer, limitedGain);
  }

  const output = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  );
  const source = output.createBufferSource();
  source.buffer = buffer;

  const compressor = output.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;

  const limiter = output.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.ratio.value = 20;

  const gainNode = output.createGain();
  gainNode.gain.value = limitedGain;

  source.connect(gainNode);
  gainNode.connect(compressor);
  compressor.connect(limiter);
  limiter.connect(output.destination);
  source.start(0);

  return output.startRendering();
}

function applyGainAndLimit(buffer: AudioBuffer, gain: number): AudioBuffer {
  const output = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length,
    sampleRate: buffer.sampleRate,
  });

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const input = buffer.getChannelData(channel);
    const out = output.getChannelData(channel);
    for (let index = 0; index < input.length; index += 1) {
      const sample = input[index] * gain;
      out[index] = Math.tanh(sample * 1.2);
    }
  }

  return output;
}
