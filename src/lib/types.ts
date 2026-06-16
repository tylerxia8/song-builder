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
  /** Seconds to trim from the start of the track (negative offset alignment). */
  trimStartSec: number;
  /** Delay after the master clock before this track starts. */
  startDelaySec: number;
  /** Playback rate to match the master tempo. */
  tempoScale: number;
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

export interface ProductionResult {
  masterBpm: number;
  tracks: TrackRecording[];
}

export interface NoteEvent {
  time: number;
  midi: number;
  duration: number;
}
