import type { TrackRecording, TrackType } from "@/lib/types";
import { audioBufferToBlob, decodeAudioBlob } from "./decode";

const TRACK_PAN: Record<TrackType, number> = {
  melody: 0.08,
  harmony: 0.42,
  bass: -0.28,
  drums: 0,
};

const TRACK_GAIN: Record<TrackType, number> = {
  melody: 0.78,
  harmony: 0.62,
  bass: 0.82,
  drums: 0.88,
};

export async function mixProducedTracks(tracks: TrackRecording[]): Promise<AudioBuffer> {
  const readyTracks = tracks.filter((track) => track.producedAudioUrl);
  if (readyTracks.length === 0) {
    throw new Error("No produced tracks to export.");
  }

  const decoded = await Promise.all(
    readyTracks.map(async (track) => ({
      type: track.type,
      buffer: await decodeAudioBlob(
        await fetch(track.producedAudioUrl!).then((response) => response.blob()),
      ),
    })),
  );

  const sampleRate = 44100;
  const maxDuration = Math.max(...decoded.map(({ buffer }) => buffer.duration));
  const offline = new OfflineAudioContext(
    2,
    Math.ceil(maxDuration * sampleRate) + sampleRate,
    sampleRate,
  );

  decoded.forEach(({ type, buffer }) => {
    const source = offline.createBufferSource();
    source.buffer = buffer;

    const gain = offline.createGain();
    gain.gain.value = TRACK_GAIN[type];

    const panner = offline.createStereoPanner();
    panner.pan.value = TRACK_PAN[type];

    source.connect(gain);
    gain.connect(panner);
    panner.connect(offline.destination);
    source.start(0);
  });

  return offline.startRendering();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportSongAsWav(tracks: TrackRecording[]): Promise<void> {
  const mixed = await mixProducedTracks(tracks);
  const blob = audioBufferToBlob(mixed);
  downloadBlob(blob, `songbuilder-${timestamp()}.wav`);
}

export async function exportSongAsMp3(tracks: TrackRecording[]): Promise<void> {
  const mixed = await mixProducedTracks(tracks);
  const blob = await encodeMp3(mixed);
  downloadBlob(blob, `songbuilder-${timestamp()}.mp3`);
}

async function encodeMp3(buffer: AudioBuffer): Promise<Blob> {
  const lamejs = await import("lamejs");
  const sampleRate = buffer.sampleRate;
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const mono = new Float32Array(left.length);

  for (let i = 0; i < left.length; i += 1) {
    mono[i] = (left[i] + right[i]) * 0.5;
  }

  const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 192);
  const blockSize = 1152;
  const mp3Data: Int8Array[] = [];

  for (let i = 0; i < mono.length; i += blockSize) {
    const chunk = mono.subarray(i, i + blockSize);
    const int16 = floatTo16BitPCM(chunk);
    const encoded = mp3Encoder.encodeBuffer(int16);
    if (encoded.length > 0) mp3Data.push(encoded);
  }

  const flushed = mp3Encoder.flush();
  if (flushed.length > 0) mp3Data.push(flushed);

  return new Blob(mp3Data as BlobPart[], { type: "audio/mpeg" });
}

function floatTo16BitPCM(samples: Float32Array): Int16Array {
  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return int16;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
