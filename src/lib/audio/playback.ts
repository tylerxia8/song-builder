import type { TrackRecording } from "@/lib/types";
import { decodeAudioBlob, getEffectiveDuration } from "./decode";

export async function playSyncedTracks(
  tracks: TrackRecording[],
  mode: "raw" | "produced",
): Promise<() => void> {
  const recorded = tracks.filter((track) => track.audioBlob);
  if (recorded.length === 0) {
    return () => {};
  }

  const audioContext = new AudioContext();
  const masterStart = audioContext.currentTime + 0.12;
  const sources: AudioBufferSourceNode[] = [];
  let latestEnd = masterStart;

  await Promise.all(
    recorded.map(async (track) => {
      const useProduced = mode === "produced" && track.producedAudioUrl;
      const blob = useProduced
        ? await fetch(track.producedAudioUrl!).then((response) => response.blob())
        : track.audioBlob!;

      const buffer = await decodeAudioBlob(blob);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);

      const sync = track.syncSettings;
      if (mode === "raw" && sync) {
        source.playbackRate.value = sync.tempoScale;
        source.start(masterStart + sync.startDelaySec, sync.trimStartSec);
        latestEnd = Math.max(
          latestEnd,
          masterStart + sync.startDelaySec + getEffectiveDuration(buffer, sync),
        );
      } else {
        source.start(masterStart);
        latestEnd = Math.max(latestEnd, masterStart + buffer.duration);
      }

      sources.push(source);
    }),
  );

  return () => {
    sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Source may already be stopped.
      }
    });
    void audioContext.close();
  };
}

export async function playSingleTrack(
  track: TrackRecording,
  mode: "raw" | "produced",
): Promise<HTMLAudioElement | null> {
  const url =
    mode === "produced" && track.producedAudioUrl ? track.producedAudioUrl : track.audioUrl;
  if (!url) return null;

  const audio = new Audio(url);
  await audio.play();
  return audio;
}
