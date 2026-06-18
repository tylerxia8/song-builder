import { PitchDetector } from "pitchy";
import { semitoneDeltaToKey } from "@/lib/music-theory";
import { registerAudioAsset } from "@/lib/audio-assets";
import { createId, type SongKey, type VocalPolishSettings } from "@/types/project";

export type { VocalPolishSettings };

export const DEFAULT_VOCAL_POLISH: VocalPolishSettings = {
  amount: 0.65,
  key: "Am",
};

async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContext();
  try {
    return await context.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await context.close();
  }
}

function detectMedianPitch(buffer: AudioBuffer): number | null {
  const detector = PitchDetector.forFloat32Array(buffer.length);
  const channel = buffer.getChannelData(0);
  const windowSize = 4096;
  const pitches: number[] = [];

  for (let index = 0; index + windowSize < channel.length; index += windowSize) {
    const slice = channel.subarray(index, index + windowSize);
    const [pitch, clarity] = detector.findPitch(slice, buffer.sampleRate);
    if (clarity > 0.85 && pitch > 60 && pitch < 1000) {
      pitches.push(pitch);
    }
  }

  if (pitches.length === 0) return null;
  pitches.sort((a, b) => a - b);
  return pitches[Math.floor(pitches.length / 2)];
}

async function renderWithTonePitchShift(
  buffer: AudioBuffer,
  semitones: number,
): Promise<AudioBuffer> {
  const Tone = await import("tone");
  const duration = buffer.duration;

  const rendered = await Tone.Offline(async () => {
    const player = new Tone.Player(buffer);
    const pitchShift = new Tone.PitchShift({
      pitch: semitones,
      windowSize: 0.08,
      delayTime: 0.02,
    });
    player.chain(pitchShift, Tone.Destination);
    player.start(0);
  }, duration + 0.1);

  return rendered.get() as AudioBuffer;
}

async function processChain(buffer: AudioBuffer, amount: number): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  );
  const source = offline.createBufferSource();
  source.buffer = buffer;

  const highPass = offline.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 90;

  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = -22 + amount * 6;
  compressor.ratio.value = 3 + amount * 2;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.12;

  const deEss = offline.createBiquadFilter();
  deEss.type = "peaking";
  deEss.frequency.value = 6500;
  deEss.Q.value = 1.2;
  deEss.gain.value = -2.5 * amount;

  const reverb = offline.createConvolver();
  reverb.buffer = createShortReverbImpulse(offline, 0.25 + amount * 0.15);

  const dry = offline.createGain();
  const wet = offline.createGain();
  dry.gain.value = 1;
  wet.gain.value = 0.08 + amount * 0.1;

  const master = offline.createGain();
  master.gain.value = 1.05 + amount * 0.15;

  source.connect(highPass);
  highPass.connect(compressor);
  compressor.connect(deEss);

  deEss.connect(dry);
  deEss.connect(reverb);
  reverb.connect(wet);

  dry.connect(master);
  wet.connect(master);
  master.connect(offline.destination);
  source.start(0);

  return offline.startRendering();
}

function createShortReverbImpulse(context: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 2;
    }
  }
  return impulse;
}

export async function polishVocalBlob(
  blob: Blob,
  settings: VocalPolishSettings,
): Promise<{ blob: Blob; assetId: string; audioUrl: string }> {
  let buffer = await decodeBlob(blob);
  const amount = Math.max(0, Math.min(1, settings.amount));

  const medianPitch = detectMedianPitch(buffer);
  if (medianPitch && amount > 0.05) {
    const semitones = semitoneDeltaToKey(medianPitch, settings.key) * amount;
    if (Math.abs(semitones) > 0.05) {
      buffer = await renderWithTonePitchShift(buffer, semitones);
    }
  }

  buffer = await processChain(buffer, amount);

  const wavBlob = audioBufferToWavBlob(buffer);
  const assetId = createId("audio");
  const audioUrl = registerAudioAsset(assetId, wavBlob);
  return { blob: wavBlob, assetId, audioUrl };
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const dataLength = length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
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

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export async function detectVocalKey(blob: Blob): Promise<SongKey | null> {
  const buffer = await decodeBlob(blob);
  const median = detectMedianPitch(buffer);
  if (!median) return null;

  const keys: SongKey[] = ["C", "G", "D", "A", "E", "F", "Am", "Em", "Dm", "Bm", "Cm"];
  let best: SongKey = "Am";
  let bestError = Infinity;

  for (const key of keys) {
    const error = Math.abs(semitoneDeltaToKey(median, key));
    if (error < bestError) {
      bestError = error;
      best = key;
    }
  }

  return best;
}
