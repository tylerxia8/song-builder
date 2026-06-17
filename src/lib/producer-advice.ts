import type { TrackRecording, TrackType } from "./types";

export function getProducerSuggestions(
  tracks: TrackRecording[],
  isProduced: boolean,
): string[] {
  const suggestions: string[] = [];
  const byType = Object.fromEntries(tracks.map((track) => [track.type, track])) as Record<
    TrackType,
    TrackRecording
  >;

  const hasDrums = Boolean(byType.drums?.audioBlob);
  const hasMelody = Boolean(byType.melody?.audioBlob);
  const hasBass = Boolean(byType.bass?.audioBlob);
  const hasHarmony = Boolean(byType.harmony?.audioBlob);
  const recordedCount = tracks.filter((track) => track.audioBlob).length;

  if (!hasDrums) {
    suggestions.push("Start with drums — beatbox or claps set the groove for every other layer.");
  }

  if (hasDrums && !hasMelody) {
    suggestions.push("Layer a melody next so SongBuilder can detect key and chord movement.");
  }

  if (hasMelody && !hasBass) {
    suggestions.push("Add a bass hum to anchor the low end and tighten the production.");
  }

  if (hasMelody && !hasHarmony) {
    suggestions.push("Try a harmony layer — autotune will snap it to chord tones after mixdown.");
  }

  if (recordedCount >= 2 && !isProduced) {
    suggestions.push("Run Mix & Produce to quantize timing, render instruments, and lock the grid.");
  }

  if (isProduced && !hasHarmony) {
    suggestions.push("Your mix is ready — add harmony on a second pass for a fuller arrangement.");
  }

  if (isProduced) {
    suggestions.push("Use mute and solo to audition parts, then export WAV for the highest quality.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Arm a track, enable the metronome, and capture a 5–15 second take.");
  }

  return suggestions.slice(0, 4);
}
