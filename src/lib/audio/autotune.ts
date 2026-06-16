import type { ChordSegment, NoteEvent } from "@/lib/types";
import { getChordAtTime, parseKeyLabel } from "./harmony";

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function autotuneNotesToKey(
  notes: NoteEvent[],
  key: { root: number; mode: "major" | "minor" },
): NoteEvent[] {
  return notes.map((note) => ({
    ...note,
    midi: snapMidiToKey(note.midi, key),
  }));
}

export function autotuneNotesToChords(
  notes: NoteEvent[],
  chords: ChordSegment[],
  key: { root: number; mode: "major" | "minor" },
): NoteEvent[] {
  const scale = key.mode === "major" ? MAJOR_SCALE : MINOR_SCALE;

  return notes.map((note) => {
    const chord = getChordAtTime(chords, note.time);
    const candidates = buildChordMidis(chord.rootPc, scale, note.midi);
    return {
      ...note,
      midi: findNearestMidi(candidates, note.midi),
    };
  });
}

export function autotuneBassNotes(
  notes: NoteEvent[],
  chords: ChordSegment[],
): NoteEvent[] {
  return notes.map((note) => {
    const chord = getChordAtTime(chords, note.time);
    const rootMidi = chord.rootPc + 12 * Math.round(note.midi / 12 - 1);
    const candidates = [rootMidi - 12, rootMidi, rootMidi + 7, rootMidi + 7 - 12];
    return {
      ...note,
      midi: findNearestMidi(candidates, note.midi),
    };
  });
}

function snapMidiToKey(midi: number, key: { root: number; mode: "major" | "minor" }): number {
  const scale = key.mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
  const candidates = buildScaleMidis(key.root, scale, midi);
  return findNearestMidi(candidates, midi);
}

function buildScaleMidis(root: number, scale: number[], centerMidi: number): number[] {
  const centerOctave = Math.floor(centerMidi / 12);
  const candidates: number[] = [];

  for (let octave = centerOctave - 1; octave <= centerOctave + 1; octave += 1) {
    scale.forEach((step) => {
      candidates.push(root + step + octave * 12);
    });
  }

  return candidates;
}

function buildChordMidis(rootPc: number, scale: number[], centerMidi: number): number[] {
  const centerOctave = Math.floor(centerMidi / 12);
  const triad = [0, scale[2] ?? 4, scale[4] ?? 7];
  const candidates: number[] = [];

  for (let octave = centerOctave - 1; octave <= centerOctave + 1; octave += 1) {
    triad.forEach((step) => {
      candidates.push(rootPc + step + octave * 12);
    });
  }

  return candidates;
}

function findNearestMidi(candidates: number[], target: number): number {
  return candidates.reduce((nearest, candidate) =>
    Math.abs(candidate - target) < Math.abs(nearest - target) ? candidate : nearest,
  );
}

export async function renderAutotunedVoice(
  buffer: AudioBuffer,
  rawNotes: NoteEvent[],
  tunedNotes: NoteEvent[],
  trimStartSec: number,
  tempoScale: number,
): Promise<AudioBuffer> {
  if (rawNotes.length === 0 || tunedNotes.length === 0) {
    return buffer;
  }

  const sampleRate = buffer.sampleRate;
  const channel = buffer.getChannelData(0);
  const scaledTrim = trimStartSec;
  const outputDuration = Math.max(
    buffer.duration,
    ...tunedNotes.map((note) => note.time + note.duration),
  );
  const outputLength = Math.ceil(outputDuration * sampleRate);
  const output = new Float32Array(outputLength);

  const pairCount = Math.min(rawNotes.length, tunedNotes.length);

  for (let index = 0; index < pairCount; index += 1) {
    const raw = rawNotes[index];
    const tuned = tunedNotes[index];

    if (Math.abs(raw.midi - tuned.midi) < 0.5) {
      mixSegment(output, channel, raw.time, raw.duration, sampleRate, scaledTrim, tempoScale, 1);
      continue;
    }

    const ratio = midiToFrequency(tuned.midi) / midiToFrequency(raw.midi);
    mixSegment(output, channel, raw.time, raw.duration, sampleRate, scaledTrim, tempoScale, ratio);
  }

  const offline = new OfflineAudioContext(1, outputLength, sampleRate);
  const rendered = offline.createBuffer(1, outputLength, sampleRate);
  rendered.copyToChannel(output, 0);
  return rendered;
}

function mixSegment(
  output: Float32Array,
  source: Float32Array,
  time: number,
  duration: number,
  sampleRate: number,
  trimStartSec: number,
  tempoScale: number,
  pitchRatio: number,
) {
  const startSec = time * tempoScale + trimStartSec;
  const endSec = startSec + duration * tempoScale;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(source.length, Math.floor(endSec * sampleRate));

  if (endSample <= startSample) return;

  const outStart = Math.max(0, Math.floor(time * sampleRate));
  const sourceLength = endSample - startSample;
  const outputLength = Math.floor(sourceLength / pitchRatio);

  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = startSample + Math.floor(i * pitchRatio);
    if (sourceIndex >= endSample) break;
    const outIndex = outStart + i;
    if (outIndex >= output.length) break;
    output[outIndex] += source[sourceIndex] * 0.95;
  }
}

export function applyAutotuneToNotes(
  type: "melody" | "harmony" | "bass",
  notes: NoteEvent[],
  key: ReturnType<typeof parseKeyLabel>,
  chords: ChordSegment[],
): NoteEvent[] {
  if (notes.length === 0) return notes;

  if (type === "melody") {
    return autotuneNotesToKey(notes, key);
  }

  if (type === "harmony") {
    return autotuneNotesToChords(notes, chords, key);
  }

  return autotuneBassNotes(notes, chords);
}
