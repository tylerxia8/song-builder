import type { Clip } from "@/types/project";

export function beatToSeconds(beat: number, bpm: number): number {
  return (beat * 60) / bpm;
}

export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}

export function getClipSourceDurationBeat(clip: Clip): number {
  return clip.sourceDurationBeat ?? clip.durationBeat;
}

export function getClipAudioOffsetBeat(clip: Clip): number {
  return clip.audioOffsetBeat ?? 0;
}

export function maxAudioDurationBeat(clip: Clip): number {
  return getClipSourceDurationBeat(clip) - getClipAudioOffsetBeat(clip);
}

export function clampAudioDurationBeat(clip: Clip, durationBeat: number): number {
  return Math.max(0.25, Math.min(durationBeat, maxAudioDurationBeat(clip)));
}
