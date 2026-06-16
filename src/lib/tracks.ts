import type { InstrumentId, TrackDefinition, TrackRecording } from "./types";

export const INSTRUMENT_OPTIONS: { id: InstrumentId; label: string }[] = [
  { id: "original", label: "Original voice" },
  { id: "piano", label: "Piano" },
  { id: "guitar", label: "Guitar" },
  { id: "violin", label: "Violin" },
  { id: "synth", label: "Synth" },
  { id: "brass", label: "Brass" },
  { id: "drum-kit", label: "Drum kit" },
];

export const TRACK_DEFINITIONS: TrackDefinition[] = [
  {
    type: "melody",
    label: "Melody",
    hint: "Hum, sing, or whistle your main idea",
    emoji: "🎵",
    defaultInstrument: "piano",
  },
  {
    type: "bass",
    label: "Bass",
    hint: "Hum a low bass line or groove",
    emoji: "🎸",
    defaultInstrument: "synth",
  },
  {
    type: "drums",
    label: "Drums",
    hint: "Beatbox, clap, or tap a rhythm",
    emoji: "🥁",
    defaultInstrument: "drum-kit",
  },
  {
    type: "harmony",
    label: "Harmony",
    hint: "Sing a harmony or backing vocal",
    emoji: "🎤",
    defaultInstrument: "violin",
  },
];

export function createEmptyTracks(): TrackRecording[] {
  return TRACK_DEFINITIONS.map((track) => ({
    type: track.type,
    audioBlob: null,
    audioUrl: null,
    duration: null,
    status: "empty",
    instrument: track.defaultInstrument,
    syncSettings: null,
    producedAudioUrl: null,
    noteCount: null,
  }));
}

export function getInstrumentOptionsForTrack(type: TrackDefinition["type"]) {
  if (type === "drums") {
    return INSTRUMENT_OPTIONS.filter(
      (option) => option.id === "original" || option.id === "drum-kit",
    );
  }

  return INSTRUMENT_OPTIONS.filter((option) => option.id !== "drum-kit");
}
