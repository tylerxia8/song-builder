import type { PlaybackMixOptions, TrackRecording } from "@/lib/types";
import { getEffectiveTrackMix } from "@/lib/mix";
import { audioBufferToBlob, decodeAudioBlob } from "./decode";

export async function mixProducedTracks(
  tracks: TrackRecording[],
  mix: PlaybackMixOptions,
): Promise<AudioBuffer> {
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

  const masterGain = offline.createGain();
  masterGain.gain.value = mix.masterVolume;
  masterGain.connect(offline.destination);

  decoded.forEach(({ type, buffer }) => {
    const effectiveMix = getEffectiveTrackMix(mix, type);
    if (!effectiveMix) return;

    const source = offline.createBufferSource();
    source.buffer = buffer;

    const gain = offline.createGain();
    gain.gain.value = effectiveMix.volume;

    const panner = offline.createStereoPanner();
    panner.pan.value = effectiveMix.pan;

    source.connect(gain);
    gain.connect(panner);
    panner.connect(masterGain);
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

export async function exportSongAsWav(
  tracks: TrackRecording[],
  mix: PlaybackMixOptions,
): Promise<void> {
  const mixed = await mixProducedTracks(tracks, mix);
  const blob = audioBufferToBlob(mixed);
  downloadBlob(blob, `songbuilder-${timestamp()}.wav`);
}

export async function exportSongAsMp3(
  tracks: TrackRecording[],
  mix: PlaybackMixOptions,
): Promise<void> {
  const mixed = await mixProducedTracks(tracks, mix);
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
