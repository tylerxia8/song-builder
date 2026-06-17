import type { Project } from "@/types/project";
import { SONG_KEYS, snapMidiToKey } from "@/lib/music-theory";
import type { SongKey } from "@/types/project";

export function detectKeyFromProject(project: Project): SongKey {
  const pitches: number[] = [];

  for (const track of project.tracks) {
    for (const clip of track.clips) {
      clip.notes?.forEach((note) => pitches.push(note.pitch));
    }
  }

  if (pitches.length === 0) return "Am";

  let bestKey: SongKey = "Am";
  let bestScore = -Infinity;

  for (const key of SONG_KEYS) {
    const score = pitches.reduce((total, pitch) => {
      const snapped = snapMidiToKey(pitch, key);
      return total - Math.abs(snapped - pitch);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestKey;
}

const LYRIC_TEMPLATES: Record<string, string[]> = {
  pop: [
    "We don't need the lights to feel alive tonight",
    "Every little moment turns to gold in time",
    "Say my name and I'll be running back to you",
    "Hearts on repeat, we move in perfect time",
  ],
  trap: [
    "Late night, city glow, I'm on my own lane",
    "Count it up, level up, never fold under pain",
    "They talk loud, I move quiet, let the work explain",
    "New wave, same vision, built a throne from the rain",
  ],
  acoustic: [
    "Coffee steam and morning light across the floor",
    "I wrote your name in every song I ever swore",
    "Bare feet, open windows, humming something true",
    "If home is where the quiet lives, I'm home with you",
  ],
};

export function suggestLyrics(vibe: keyof typeof LYRIC_TEMPLATES, key: SongKey): string[] {
  const base = LYRIC_TEMPLATES[vibe] ?? LYRIC_TEMPLATES.pop;
  return base.map((line) => `${line} · key ${key}`);
}

export function suggestHookMelody(key: SongKey): number[] {
  const roots: Record<SongKey, number[]> = {
    C: [60, 62, 64, 65, 64, 62, 60, 59],
    G: [67, 69, 71, 72, 71, 69, 67, 66],
    D: [62, 64, 66, 67, 66, 64, 62, 61],
    A: [69, 71, 73, 74, 73, 71, 69, 68],
    E: [64, 66, 68, 69, 68, 66, 64, 63],
    F: [65, 67, 69, 70, 69, 67, 65, 64],
    Am: [69, 71, 72, 74, 72, 71, 69, 67],
    Em: [64, 66, 67, 69, 67, 66, 64, 62],
    Dm: [62, 64, 65, 67, 65, 64, 62, 60],
    Bm: [71, 73, 74, 76, 74, 73, 71, 69],
  };

  return (roots[key] ?? roots.Am).map((pitch) => snapMidiToKey(pitch, key));
}

export function melodyToNoteString(notes: number[]): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return notes
    .map((pitch) => {
      const name = names[pitch % 12];
      const octave = Math.floor(pitch / 12) - 1;
      return `${name}${octave}`;
    })
    .join(" · ");
}
