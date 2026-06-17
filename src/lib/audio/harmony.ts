import type { ChordSegment, HarmonyAnalysis, NoteEvent } from "@/lib/types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

const DIATONIC_MAJOR = [
  { degree: 0, quality: "maj", intervals: [0, 4, 7] },
  { degree: 2, quality: "min", intervals: [0, 3, 7] },
  { degree: 4, quality: "min", intervals: [0, 3, 7] },
  { degree: 5, quality: "maj", intervals: [0, 4, 7] },
  { degree: 7, quality: "maj", intervals: [0, 4, 7] },
  { degree: 9, quality: "min", intervals: [0, 3, 7] },
  { degree: 11, quality: "dim", intervals: [0, 3, 6] },
];

const DIATONIC_MINOR = [
  { degree: 0, quality: "min", intervals: [0, 3, 7] },
  { degree: 2, quality: "dim", intervals: [0, 3, 6] },
  { degree: 3, quality: "maj", intervals: [0, 4, 7] },
  { degree: 5, quality: "min", intervals: [0, 3, 7] },
  { degree: 7, quality: "min", intervals: [0, 3, 7] },
  { degree: 8, quality: "maj", intervals: [0, 4, 7] },
  { degree: 10, quality: "maj", intervals: [0, 4, 7] },
];

export function analyzeHarmony(
  melodyNotes: NoteEvent[],
  masterBpm: number,
  duration: number,
): HarmonyAnalysis {
  if (melodyNotes.length === 0) {
    return {
      detectedKey: "C major",
      chordProgression: [{ time: 0, label: "C" }],
    };
  }

  const key = detectKey(melodyNotes);
  const chords = inferChordProgression(melodyNotes, key, masterBpm, duration);
  const keyLabel = `${NOTE_NAMES[key.root]} ${key.mode}`;

  return {
    detectedKey: keyLabel,
    chordProgression: chords.map((chord) => ({
      time: chord.time,
      label: chord.label,
    })),
  };
}

function detectKey(notes: NoteEvent[]): { root: number; mode: "major" | "minor" } {
  let best: { root: number; mode: "major" | "minor"; score: number } = {
    root: 0,
    mode: "major",
    score: -1,
  };

  for (let root = 0; root < 12; root += 1) {
    for (const mode of ["major", "minor"] as const) {
      const scale = mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
      const scalePcs = scale.map((step) => (root + step) % 12);
      let score = 0;

      notes.forEach((note) => {
        if (scalePcs.includes(note.midi % 12)) {
          score += note.duration;
        }
      });

      if (score > best.score) {
        best = { root, mode, score };
      }
    }
  }

  return { root: best.root, mode: best.mode };
}

function inferChordProgression(
  notes: NoteEvent[],
  key: { root: number; mode: "major" | "minor" },
  bpm: number,
  duration: number,
): ChordSegment[] {
  const safeDuration = Math.max(60 / bpm, duration);
  const beatDuration = 60 / bpm;
  const segmentDuration = beatDuration * 4;
  const diatonic = key.mode === "major" ? DIATONIC_MAJOR : DIATONIC_MINOR;
  const chords: ChordSegment[] = [];

  for (let time = 0; time < safeDuration; time += segmentDuration) {
    const segmentNotes = notes.filter(
      (note) => note.time >= time && note.time < time + segmentDuration,
    );
    const pitchClasses = segmentNotes.map((note) => note.midi % 12);

    let best: { label: string; score: number } = { label: NOTE_NAMES[key.root], score: -1 };

    diatonic.forEach((chord) => {
      const rootPc = (key.root + chord.degree) % 12;
      const chordPcs = chord.intervals.map((interval) => (rootPc + interval) % 12);
      let score = 0;

      pitchClasses.forEach((pc) => {
        if (chordPcs.includes(pc)) score += 1;
      });

      const suffix = chord.quality === "maj" ? "" : chord.quality === "min" ? "m" : "dim";
      const label = `${NOTE_NAMES[rootPc]}${suffix}`;

      if (score > best.score) {
        best = { label, score };
      }
    });

    chords.push({ time, label: best.label, rootPc: labelToRootPc(best.label) });
  }

  return dedupeAdjacentChords(chords.length > 0 ? chords : [{ time: 0, label: NOTE_NAMES[key.root], rootPc: key.root }]);
}

function dedupeAdjacentChords(chords: ChordSegment[]): ChordSegment[] {
  if (chords.length === 0) return [];
  const deduped: ChordSegment[] = [chords[0]];

  for (let i = 1; i < chords.length; i += 1) {
    if (chords[i].label !== deduped[deduped.length - 1].label) {
      deduped.push(chords[i]);
    }
  }

  return deduped;
}

function labelToRootPc(label: string): number {
  const match = label.match(/^(C#|D#|F#|G#|A#|[A-G])/);
  if (!match) return 0;
  return NOTE_NAMES.indexOf(match[1] as (typeof NOTE_NAMES)[number]);
}

export function getChordAtTime(chords: ChordSegment[], time: number): ChordSegment {
  if (chords.length === 0) {
    return { time: 0, label: "C", rootPc: 0 };
  }

  let current = chords[0];
  for (const chord of chords) {
    if (chord.time <= time) current = chord;
    else break;
  }
  return current;
}

export function quantizeNotes(
  notes: NoteEvent[],
  bpm: number,
  division = 4,
  gridOriginSec = 0,
  swing = 0,
): NoteEvent[] {
  const grid = 60 / bpm / division;

  return notes.map((note) => {
    const gridIndex = Math.round((note.time - gridOriginSec) / grid);
    let time = gridOriginSec + gridIndex * grid;

    if (swing > 0 && gridIndex % 2 === 1) {
      time += grid * swing;
    }

    return {
      ...note,
      time,
      duration: Math.max(grid, Math.round(note.duration / grid) * grid),
    };
  });
}

export function snapNotesToHarmony(
  notes: NoteEvent[],
  chords: ChordSegment[],
  key: { root: number; mode: "major" | "minor" },
): NoteEvent[] {
  const diatonic = key.mode === "major" ? DIATONIC_MAJOR : DIATONIC_MINOR;

  return notes.map((note) => {
    const chord = getChordAtTime(chords, note.time);
    const diatonicChord = diatonic.find((item) => {
      const rootPc = (key.root + item.degree) % 12;
      return rootPc === chord.rootPc;
    }) ?? diatonic[0];

    const rootPc = (key.root + diatonicChord.degree) % 12;
    const candidates: number[] = [];

    for (let octave = -1; octave <= 2; octave += 1) {
      diatonicChord.intervals.forEach((interval, index) => {
        const midi = rootPc + interval + 12 * (octave + 4);
        candidates.push(midi);
        if (index === 2) candidates.push(midi + 12);
      });
    }

    const snapped = findNearestMidi(candidates, note.midi);
    return { ...note, midi: snapped };
  });
}

export function generateHarmonyFromMelody(
  melodyNotes: NoteEvent[],
  chords: ChordSegment[],
  key: { root: number; mode: "major" | "minor" },
): NoteEvent[] {
  if (melodyNotes.length === 0) {
    return generateChordPad(chords, 120);
  }

  const diatonic = key.mode === "major" ? DIATONIC_MAJOR : DIATONIC_MINOR;

  return melodyNotes.map((note) => {
    const chord = getChordAtTime(chords, note.time);
    const diatonicChord = diatonic.find((item) => {
      const rootPc = (key.root + item.degree) % 12;
      return rootPc === chord.rootPc;
    }) ?? diatonic[0];

    const rootPc = (key.root + diatonicChord.degree) % 12;
    const third = rootPc + diatonicChord.intervals[1] + 12 * Math.floor(note.midi / 12);
    const harmonyMidi = third >= note.midi ? third : third + 12;

    return {
      time: note.time,
      midi: harmonyMidi,
      duration: note.duration * 0.9,
    };
  });
}

export function snapNotesToBass(
  notes: NoteEvent[],
  chords: ChordSegment[],
): NoteEvent[] {
  return notes.map((note) => {
    const chord = getChordAtTime(chords, note.time);
    const rootMidi = chord.rootPc + 12 * 2;
    const fifthMidi = rootMidi + 7;
    const candidates = [rootMidi - 12, rootMidi, fifthMidi - 12, fifthMidi];
    return { ...note, midi: findNearestMidi(candidates, note.midi) };
  });
}

export function generateBassLine(chords: ChordSegment[], bpm: number): NoteEvent[] {
  const safeChords = chords.length > 0 ? chords : [{ time: 0, label: "C", rootPc: 0 }];
  const beatDuration = 60 / bpm;
  const notes: NoteEvent[] = [];

  safeChords.forEach((chord) => {
    const rootMidi = chord.rootPc + 12 * 2;
    notes.push({
      time: chord.time,
      midi: rootMidi,
      duration: beatDuration * 1.75,
    });
    notes.push({
      time: chord.time + beatDuration,
      midi: rootMidi + 7,
      duration: beatDuration * 0.75,
    });
  });

  return notes;
}

export function generateChordPad(chords: ChordSegment[], bpm: number): NoteEvent[] {
  const safeChords = chords.length > 0 ? chords : [{ time: 0, label: "C", rootPc: 0 }];
  const beatDuration = 60 / bpm;

  return safeChords.map((chord) => ({
    time: chord.time,
    midi: chord.rootPc + 55,
    duration: Math.max(beatDuration, beatDuration * 1.8),
  }));
}

function findNearestMidi(candidates: number[], target: number): number {
  return candidates.reduce((nearest, candidate) =>
    Math.abs(candidate - target) < Math.abs(nearest - target) ? candidate : nearest,
  );
}

export function parseKeyLabel(label: string): { root: number; mode: "major" | "minor" } {
  const [noteName, modeName] = label.split(" ");
  const root = NOTE_NAMES.indexOf(noteName as (typeof NOTE_NAMES)[number]);
  return { root: root >= 0 ? root : 0, mode: modeName === "minor" ? "minor" : "major" };
}
