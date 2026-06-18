export interface SampleSlice {
  index: number;
  startSec: number;
  endSec: number;
}

export function computeSlices(durationSec: number, sliceCount: number): SampleSlice[] {
  const count = Math.max(1, sliceCount);
  const sliceDuration = durationSec / count;
  return Array.from({ length: count }, (_, index) => ({
    index,
    startSec: index * sliceDuration,
    endSec: Math.min(durationSec, (index + 1) * sliceDuration),
  }));
}

export function extractSliceBuffer(
  buffer: AudioBuffer,
  slice: SampleSlice,
): AudioBuffer {
  const startSample = Math.floor(slice.startSec * buffer.sampleRate);
  const endSample = Math.floor(slice.endSec * buffer.sampleRate);
  const length = Math.max(1, endSample - startSample);

  const output = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length,
    sampleRate: buffer.sampleRate,
  });

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const input = buffer.getChannelData(channel);
    const out = output.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      out[index] = input[startSample + index] ?? 0;
    }
  }

  return output;
}

export function reverseBuffer(buffer: AudioBuffer): AudioBuffer {
  const output = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length,
    sampleRate: buffer.sampleRate,
  });

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const input = buffer.getChannelData(channel);
    const out = output.getChannelData(channel);
    for (let index = 0; index < buffer.length; index += 1) {
      out[index] = input[buffer.length - 1 - index] ?? 0;
    }
  }

  return output;
}

export async function pitchShiftBuffer(
  buffer: AudioBuffer,
  semitones: number,
): Promise<AudioBuffer> {
  if (Math.abs(semitones) < 0.01) return buffer;

  const playbackRate = 2 ** (semitones / 12);
  const outputLength = Math.floor(buffer.length / playbackRate);
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    outputLength,
    buffer.sampleRate,
  );
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  source.connect(offline.destination);
  source.start(0);
  return offline.startRendering();
}

export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContext();
  try {
    return await context.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await context.close();
  }
}

export async function processChopSlice(
  buffer: AudioBuffer,
  slice: SampleSlice,
  options: { pitchSemitones?: number; reversed?: boolean } = {},
): Promise<AudioBuffer> {
  let sliceBuffer = extractSliceBuffer(buffer, slice);
  if (options.reversed) sliceBuffer = reverseBuffer(sliceBuffer);
  if (options.pitchSemitones) {
    sliceBuffer = await pitchShiftBuffer(sliceBuffer, options.pitchSemitones);
  }
  return sliceBuffer;
}

export function bufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const dataLength = length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  const write = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  write(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataLength, true);

  const channels = Array.from({ length: numChannels }, (_, index) => buffer.getChannelData(index));
  let offset = 44;
  for (let index = 0; index < length; index += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][index]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}
