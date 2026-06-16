export type TrackType = "melody" | "bass" | "drums" | "harmony";

export type TrackStatus = "empty" | "recorded" | "processing" | "ready";

export interface TrackDefinition {
  type: TrackType;
  label: string;
  hint: string;
  emoji: string;
}

export interface TrackRecording {
  type: TrackType;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number | null;
  status: TrackStatus;
}
