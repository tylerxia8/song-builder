export type TrackKind = "instrument" | "drums" | "audio";

export type InstrumentProgram =
  | "grand-piano"
  | "electric-piano"
  | "analog-bass"
  | "lead-synth"
  | "pad";

export interface MidiNote {
  id: string;
  pitch: number;
  startBeat: number;
  durationBeat: number;
  velocity: number;
}

export interface DrumPattern {
  kick: boolean[];
  snare: boolean[];
  hihat: boolean[];
  clap: boolean[];
}

export type ClipKind = "midi" | "drums" | "audio";

export type SongKey = "C" | "G" | "D" | "A" | "E" | "F" | "Am" | "Em" | "Dm" | "Bm";

export interface VocalPolishSettings {
  amount: number;
  key: SongKey;
}

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  kind: ClipKind;
  startBeat: number;
  durationBeat: number;
  notes?: MidiNote[];
  pattern?: DrumPattern;
  audioUrl?: string;
  audioAssetId?: string;
  audioOffsetBeat?: number;
  sourceDurationBeat?: number;
  vocalPolish?: VocalPolishSettings;
  color?: string;
}

export interface Track {
  id: string;
  name: string;
  kind: TrackKind;
  color: string;
  instrument: InstrumentProgram;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  clips: Clip[];
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number];
  lengthBars: number;
  loopEnabled: boolean;
  loopStartBar: number;
  loopEndBar: number;
  metronomeEnabled: boolean;
  songKey?: SongKey;
  tracks: Track[];
}

export interface TransportState {
  isPlaying: boolean;
  isRecording: boolean;
  currentBeat: number;
}

export type EditorMode = "piano-roll" | "drum-machine" | "audio";

export type StudioViewMode = "pro" | "guided";

export interface StudioSelection {
  trackId: string | null;
  clipId: string | null;
  editorMode: EditorMode;
}

export const BEATS_PER_BAR = 4;
export const STEPS_PER_PATTERN = 16;

export function beatToTransportTime(beat: number): string {
  const bar = Math.floor(beat / BEATS_PER_BAR);
  const quarter = beat % BEATS_PER_BAR;
  return `${bar}:${quarter}:0`;
}

export function transportTimeToBeat(time: string): number {
  const [bars, quarters] = time.split(":").map(Number);
  return bars * BEATS_PER_BAR + quarters;
}

export function createEmptyDrumPattern(): DrumPattern {
  return {
    kick: Array.from({ length: STEPS_PER_PATTERN }, () => false),
    snare: Array.from({ length: STEPS_PER_PATTERN }, () => false),
    hihat: Array.from({ length: STEPS_PER_PATTERN }, () => false),
    clap: Array.from({ length: STEPS_PER_PATTERN }, () => false),
  };
}

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
