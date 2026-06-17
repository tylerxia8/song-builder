import type { TrackType } from "./types";

export interface TrackMixSettings {
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

export interface SessionMixSettings {
  masterVolume: number;
  tracks: Record<TrackType, TrackMixSettings>;
}

export const DEFAULT_TRACK_MIX: Record<TrackType, TrackMixSettings> = {
  melody: { volume: 0.85, pan: 0.12, muted: false, solo: false },
  bass: { volume: 0.82, pan: -0.22, muted: false, solo: false },
  drums: { volume: 0.92, pan: 0, muted: false, solo: false },
  harmony: { volume: 0.72, pan: 0.38, muted: false, solo: false },
};

export function createDefaultSessionMix(): SessionMixSettings {
  return {
    masterVolume: 0.9,
    tracks: {
      melody: { ...DEFAULT_TRACK_MIX.melody },
      bass: { ...DEFAULT_TRACK_MIX.bass },
      drums: { ...DEFAULT_TRACK_MIX.drums },
      harmony: { ...DEFAULT_TRACK_MIX.harmony },
    },
  };
}

export function shouldPlayTrack(mix: SessionMixSettings, type: TrackType): boolean {
  const track = mix.tracks[type];
  if (track.muted) return false;

  const anySolo = Object.values(mix.tracks).some((settings) => settings.solo);
  if (anySolo) return track.solo;

  return true;
}

export function getEffectiveTrackMix(
  mix: SessionMixSettings,
  type: TrackType,
): { volume: number; pan: number } | null {
  if (!shouldPlayTrack(mix, type)) return null;

  return {
    volume: mix.tracks[type].volume,
    pan: mix.tracks[type].pan,
  };
}

export const KEY_OPTIONS = [
  "C major",
  "G major",
  "D major",
  "A major",
  "E major",
  "F major",
  "A minor",
  "E minor",
  "D minor",
] as const;

export type KeyOption = (typeof KEY_OPTIONS)[number];

export interface SessionProduceSettings {
  manualBpm: number | null;
  manualKey: KeyOption | null;
  swing: number;
  metronomeEnabled: boolean;
  autotuneEnabled: boolean;
}

export function createDefaultProduceSettings(): SessionProduceSettings {
  return {
    manualBpm: null,
    manualKey: null,
    swing: 0.12,
    metronomeEnabled: true,
    autotuneEnabled: true,
  };
}
