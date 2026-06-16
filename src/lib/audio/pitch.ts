import { PitchDetector } from "pitchy";
import type { NoteEvent } from "@/lib/types";

const MIN_PITCH = 70;
const MAX_PITCH = 1800;
const MIN_CLARITY = 0.82;
const WINDOW_SIZE = 4096;
const HOP_SIZE = 1024;

export function extractNotes(buffer: AudioBuffer): NoteEvent[] {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const detector = PitchDetector.forFloat32Array(WINDOW_SIZE);
  const rawNotes: NoteEvent[] = [];

  for (let i = 0; i < channelData.length - WINDOW_SIZE; i += HOP_SIZE) {
    const slice = channelData.slice(i, i + WINDOW_SIZE);
    const [pitch, clarity] = detector.findPitch(slice, sampleRate);

    if (clarity >= MIN_CLARITY && pitch >= MIN_PITCH && pitch <= MAX_PITCH) {
      rawNotes.push({
        time: i / sampleRate,
        midi: frequencyToMidi(pitch),
        duration: HOP_SIZE / sampleRate,
      });
    }
  }

  return mergeNotes(rawNotes);
}

function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

function mergeNotes(notes: NoteEvent[]): NoteEvent[] {
  if (notes.length === 0) return [];

  const merged: NoteEvent[] = [];
  let current = { ...notes[0] };

  for (let i = 1; i < notes.length; i += 1) {
    const note = notes[i];
    if (note.midi === current.midi && note.time - (current.time + current.duration) < 0.12) {
      current.duration = note.time + note.duration - current.time;
    } else {
      merged.push(current);
      current = { ...note };
    }
  }

  merged.push(current);
  return merged.filter((note) => note.duration >= 0.05);
}

export function shiftNotes(notes: NoteEvent[], trimStartSec: number): NoteEvent[] {
  return notes
    .map((note) => ({
      ...note,
      time: note.time - trimStartSec,
    }))
    .filter((note) => note.time >= 0);
}

export function scaleNoteTimes(notes: NoteEvent[], tempoScale: number): NoteEvent[] {
  return notes.map((note) => ({
    ...note,
    time: note.time / tempoScale,
    duration: note.duration / tempoScale,
  }));
}

export function shiftOnsets(onsets: number[], trimStartSec: number, tempoScale: number): number[] {
  return onsets
    .map((time) => (time - trimStartSec) / tempoScale)
    .filter((time) => time >= 0);
}
