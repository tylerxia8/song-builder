import type { SyncSettings, TrackRecording, TrackType } from "@/lib/types";
import {
  clampTempoScale,
  estimateBpmFromIntervals,
  estimateMasterBpm,
  quantizeToGrid,
} from "./beat-grid";
import { detectOnsets } from "./onsets";
import { extractNotes } from "./pitch";

interface AutofitInput {
  type: TrackType;
  buffer: AudioBuffer;
}

export interface AutofitResult {
  masterBpm: number;
  gridOriginSec: number;
  syncByTrack: Record<TrackType, SyncSettings>;
}

function getTrackAnchorSec(buffer: AudioBuffer, type: TrackType): number {
  if (type === "drums") {
    return detectOnsets(buffer)[0] ?? 0;
  }

  const notes = extractNotes(buffer);
  if (notes.length > 0) {
    return notes[0].time;
  }

  return detectOnsets(buffer)[0] ?? 0;
}

export function computeAutofit(tracks: AutofitInput[]): AutofitResult {
  const onsetsByTrack = new Map(
    tracks.map((track) => [track.type, detectOnsets(track.buffer)] as const),
  );

  const anchorsByTrack = new Map(
    tracks.map((track) => [track.type, getTrackAnchorSec(track.buffer, track.type)] as const),
  );

  const masterType =
    tracks.find((track) => track.type === "drums")?.type ??
    tracks.find((track) => track.type === "melody")?.type ??
    tracks[0].type;

  const gridOriginSec = anchorsByTrack.get(masterType) ?? 0;
  const masterBpm = estimateMasterBpm(onsetsByTrack, masterType);
  const syncByTrack = {} as Record<TrackType, SyncSettings>;

  for (const track of tracks) {
    const anchor = anchorsByTrack.get(track.type) ?? 0;
    const onsets = onsetsByTrack.get(track.type) ?? [];
    const trackBpm = estimateBpmFromIntervals(onsets) ?? masterBpm;
    const delta = anchor - gridOriginSec;

    let trimStartSec = 0;
    let startDelaySec = 0;

    if (delta >= 0) {
      startDelaySec = quantizeToGrid(delta, masterBpm, 0, 4);
    } else {
      trimStartSec = quantizeToGrid(Math.abs(delta), masterBpm, 0, 4);
      startDelaySec = 0;
    }

    syncByTrack[track.type] = {
      trimStartSec,
      startDelaySec,
      tempoScale: clampTempoScale(trackBpm, masterBpm),
      gridOriginSec,
    };
  }

  return { masterBpm, gridOriginSec, syncByTrack };
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
