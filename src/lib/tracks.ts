import type { TrackDefinition, TrackRecording } from "./types";

export const TRACK_DEFINITIONS: TrackDefinition[] = [
  {
    type: "melody",
    label: "Melody",
    hint: "Hum, sing, or whistle your main idea",
    emoji: "🎵",
  },
  {
    type: "bass",
    label: "Bass",
    hint: "Hum a low bass line or groove",
    emoji: "🎸",
  },
  {
    type: "drums",
    label: "Drums",
    hint: "Beatbox, clap, or tap a rhythm",
    emoji: "🥁",
  },
  {
    type: "harmony",
    label: "Harmony",
    hint: "Sing a harmony or backing vocal",
    emoji: "🎤",
  },
];

export function createEmptyTracks(): TrackRecording[] {
  return TRACK_DEFINITIONS.map((track) => ({
    type: track.type,
    audioBlob: null,
    audioUrl: null,
    duration: null,
    status: "empty",
  }));
}
