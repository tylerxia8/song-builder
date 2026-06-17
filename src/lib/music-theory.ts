import type { SongKey } from "@/types/project";

export const SONG_KEYS: SongKey[] = ["C", "G", "D", "A", "E", "F", "Am", "Em", "Dm", "Bm"];

const MAJOR_SCALES: Record<string, number[]> = {
  C: [0, 2, 4, 5, 7, 9, 11],
  G: [7, 9, 11, 0, 2, 4, 6],
  D: [2, 4, 6, 7, 9, 11, 1],
  A: [9, 11, 1, 2, 4, 6, 8],
  E: [4, 6, 8, 9, 11, 1, 3],
  F: [5, 7, 9, 10, 0, 2, 4],
  Am: [9, 11, 0, 2, 4, 5, 7],
  Em: [4, 6, 7, 9, 11, 0, 2],
  Dm: [2, 4, 5, 7, 9, 10, 0],
  Bm: [11, 1, 2, 4, 6, 7, 9],
};

export function scaleMidiNotes(key: SongKey, octave = 4): number[] {
  const root = key.endsWith("m") ? key.charAt(0) : key.charAt(0);
  const rootPc = noteNameToPitchClass(root);
  const intervals = MAJOR_SCALES[key] ?? MAJOR_SCALES.Am;
  const base = octave * 12;
  return intervals.map((interval) => base + ((rootPc + interval) % 12) + Math.floor((rootPc + interval) / 12) * 12);
}

function noteNameToPitchClass(name: string): number {
  const map: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return map[name] ?? 0;
}

export function snapFrequencyToKey(frequency: number, key: SongKey): number {
  if (!frequency || frequency <= 0) return frequency;
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const snapped = snapMidiToKey(midi, key);
  return 440 * 2 ** ((snapped - 69) / 12);
}

export function snapMidiToKey(midi: number, key: SongKey): number {
  const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
  const intervals = MAJOR_SCALES[key] ?? MAJOR_SCALES.Am;
  const rootPc = noteNameToPitchClass(key.charAt(0));
  const scalePcs = intervals.map((interval) => (rootPc + interval) % 12);
  let nearest = scalePcs[0];
  let nearestDistance = Infinity;

  for (const pc of scalePcs) {
    const distance = Math.min(Math.abs(pc - pitchClass), 12 - Math.abs(pc - pitchClass));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = pc;
    }
  }

  const octave = Math.floor(midi / 12);
  let candidate = octave * 12 + nearest;
  if (Math.abs(candidate - midi) > 6) {
    candidate += candidate < midi ? 12 : -12;
  }
  return candidate;
}

export function semitoneDeltaToKey(frequency: number, key: SongKey): number {
  if (!frequency || frequency <= 0) return 0;
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const snapped = snapMidiToKey(midi, key);
  return snapped - midi;
}
