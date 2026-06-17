import type { PlaybackHandle, PlaybackMixOptions, TrackRecording } from "@/lib/types";
import { getEffectiveTrackMix } from "@/lib/mix";
import { decodeAudioBlob } from "./decode";

export async function playSyncedTracks(
  tracks: TrackRecording[],
  mode: "raw" | "produced",
  mix: PlaybackMixOptions,
): Promise<PlaybackHandle> {
  const recorded = tracks.filter((track) => track.audioBlob);
  if (recorded.length === 0) {
    const context = new AudioContext();
    return {
      stop: () => void context.close(),
      context,
      masterStart: context.currentTime,
    };
  }

  const audioContext = new AudioContext();
  const masterGain = audioContext.createGain();
  masterGain.gain.value = mix.masterVolume;
  masterGain.connect(audioContext.destination);

  const masterStart = audioContext.currentTime + 0.12;
  const sources: AudioBufferSourceNode[] = [];

  await Promise.all(
    recorded.map(async (track) => {
      const effectiveMix = getEffectiveTrackMix(mix, track.type);
      if (!effectiveMix) return;

      const useProduced = mode === "produced" && track.producedAudioUrl;
      const blob = useProduced
        ? await fetch(track.producedAudioUrl!).then((response) => response.blob())
        : track.audioBlob!;

      const buffer = await decodeAudioBlob(blob);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;

      const gain = audioContext.createGain();
      gain.gain.value = effectiveMix.volume;

      const panner = audioContext.createStereoPanner();
      panner.pan.value = effectiveMix.pan;

      source.connect(gain);
      gain.connect(panner);
      panner.connect(masterGain);

      const sync = track.syncSettings;
      if (mode === "raw" && sync) {
        source.playbackRate.value = sync.tempoScale;
        source.start(masterStart + sync.startDelaySec, sync.trimStartSec);
      } else {
        source.start(masterStart);
      }

      sources.push(source);
    }),
  );

  return {
    context: audioContext,
    masterStart,
    stop: () => {
      sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // Source may already be stopped.
        }
      });
      void audioContext.close();
    },
  };
}

export async function playSingleTrack(
  track: TrackRecording,
  mode: "raw" | "produced",
  mix: PlaybackMixOptions,
): Promise<PlaybackHandle | null> {
  if (!track.audioBlob) return null;

  const soloMix: PlaybackMixOptions = {
    masterVolume: mix.masterVolume,
    tracks: {
      melody: { ...mix.tracks.melody, solo: track.type === "melody", muted: track.type !== "melody" },
      bass: { ...mix.tracks.bass, solo: track.type === "bass", muted: track.type !== "bass" },
      drums: { ...mix.tracks.drums, solo: track.type === "drums", muted: track.type !== "drums" },
      harmony: {
        ...mix.tracks.harmony,
        solo: track.type === "harmony",
        muted: track.type !== "harmony",
      },
    },
  };

  return playSyncedTracks([track], mode, soloMix);
}

export function getPlaybackDuration(
  tracks: TrackRecording[],
  mode: "raw" | "produced",
  mix: PlaybackMixOptions,
): number {
  let maxDuration = 0;

  tracks.forEach((track) => {
    if (!track.audioBlob || !getEffectiveTrackMix(mix, track.type)) return;

    const sync = track.syncSettings;
    let duration = track.duration ?? 0;

    if (mode === "raw" && sync) {
      const trim = sync.trimStartSec ?? 0;
      const scale = sync.tempoScale ?? 1;
      duration = Math.max(0, duration - trim) / scale;
    }

    const end = (sync?.startDelaySec ?? 0) + duration;
    maxDuration = Math.max(maxDuration, end);
  });

  return maxDuration;
}
