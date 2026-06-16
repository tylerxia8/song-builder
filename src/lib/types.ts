export type TrackType = "melody" | "bass" | "drums" | "harmony";

export type TrackStatus = "empty" | "recorded" | "processing" | "ready";

export type InstrumentId =
  | "original"
  | "piano"
  | "guitar"
  | "violin"
  | "synth"
  | "brass"
  | "drum-kit";

export interface TrackDefinition {
  type: TrackType;
  label: string;
  hint: string;
  emoji: string;
  defaultInstrument: InstrumentId;
}

export interface SyncSettings {
  trimStartSec: number;
  startDelaySec: number;
  tempoScale: number;
}

export interface ChordSegment {
  time: number;
  label: string;
  rootPc: number;
}

export interface ChordSuggestion {
  time: number;
  label: string;
}

export interface HarmonyAnalysis {
  detectedKey: string;
  chordProgression: ChordSuggestion[];
}

export interface TrackRecording {
  type: TrackType;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number | null;
  status: TrackStatus;
  instrument: InstrumentId;
  syncSettings: SyncSettings | null;
  producedAudioUrl: string | null;
  noteCount: number | null;
}

export interface ProduceOptions {
  autotuneEnabled?: boolean;
}

export interface ProductionResult {
  masterBpm: number;
  harmony: HarmonyAnalysis;
  tracks: TrackRecording[];
}

export interface NoteEvent {
  time: number;
  midi: number;
  duration: number;
}

export type ExportFormat = "wav" | "mp3";
