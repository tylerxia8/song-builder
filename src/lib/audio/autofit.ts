import type { SyncSettings, TrackRecording, TrackType } from "@/lib/types";
import { detectOnsets, estimateBpm } from "./onsets";

interface AutofitInput {
  type: TrackType;
  buffer: AudioBuffer;
}

export interface AutofitResult {
  masterBpm: number;
  syncByTrack: Record<TrackType, SyncSettings>;
}

export function computeAutofit(tracks: AutofitInput[]): AutofitResult {
  const onsetsByTrack = new Map(
    tracks.map((track) => [track.type, detectOnsets(track.buffer)] as const),
  );

  const masterType =
    tracks.find((track) => track.type === "drums")?.type ??
    tracks.find((track) => track.type === "melody")?.type ??
    tracks[0].type;

  const masterOnsets = onsetsByTrack.get(masterType) ?? [];
  const masterFirst = masterOnsets[0] ?? 0;
  const masterBpm = estimateBpm(masterOnsets) ?? 120;

  const syncByTrack = {} as Record<TrackType, SyncSettings>;

  for (const track of tracks) {
    const onsets = onsetsByTrack.get(track.type) ?? [];
    const firstOnset = onsets[0] ?? 0;
    const trackBpm = estimateBpm(onsets) ?? masterBpm;
    const delta = firstOnset - masterFirst;

    syncByTrack[track.type] = {
      trimStartSec: delta < 0 ? Math.abs(delta) : 0,
      startDelaySec: delta > 0 ? delta : 0,
      tempoScale: Math.min(1.35, Math.max(0.75, trackBpm / masterBpm)),
    };
  }

  return { masterBpm, syncByTrack };
}

export function applySyncToRecording(
  recording: TrackRecording,
  syncSettings: SyncSettings,
): TrackRecording {
  return {
    ...recording,
    syncSettings,
  };
}
