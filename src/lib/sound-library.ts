import type { InstrumentProgram } from "@/types/project";
import type { SongVibe } from "@/lib/song-templates";

export type LibraryTab = "sounds" | "instruments" | "drums" | "upload";

export interface LoopPack {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  vibe: SongVibe;
  color: string;
}

export interface InstrumentPreset {
  id: InstrumentProgram;
  name: string;
  category: string;
  description: string;
}

export interface DrumPreset {
  id: string;
  name: string;
  genre: string;
  description: string;
  vibe: SongVibe;
}

export const LOOP_PACKS: LoopPack[] = [
  {
    id: "kanye-soul",
    name: "Soul Chop Session",
    genre: "Hip Hop",
    bpm: 84,
    vibe: "kanye",
    color: "#f59e0b",
  },
  {
    id: "minimal-pop",
    name: "Minimal Pop Bed",
    genre: "Pop",
    bpm: 120,
    vibe: "pop",
    color: "#38bdf8",
  },
  {
    id: "trap-night",
    name: "Trap Night",
    genre: "Trap",
    bpm: 140,
    vibe: "trap",
    color: "#a78bfa",
  },
  {
    id: "acoustic-warm",
    name: "Acoustic Warmth",
    genre: "Acoustic",
    bpm: 96,
    vibe: "acoustic",
    color: "#34d399",
  },
];

export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  {
    id: "grand-piano",
    name: "Grand Piano",
    category: "Keys",
    description: "Classic piano for chords and melodies",
  },
  {
    id: "electric-piano",
    name: "Electric Piano",
    category: "Keys",
    description: "Warm Rhodes-style keys",
  },
  {
    id: "analog-bass",
    name: "Analog Bass",
    category: "Bass",
    description: "Deep sub bass for low end",
  },
  {
    id: "lead-synth",
    name: "Lead Synth",
    category: "Synth",
    description: "Bright lead lines and hooks",
  },
  {
    id: "pad",
    name: "Warm Pad",
    category: "Synth",
    description: "Atmospheric background layers",
  },
];

export const DRUM_PRESETS: DrumPreset[] = [
  {
    id: "boom-bap",
    name: "Boom Bap",
    genre: "Hip Hop",
    description: "Swingy kick and snare pocket",
    vibe: "kanye",
  },
  {
    id: "pop-sparse",
    name: "Sparse Pop",
    genre: "Pop",
    description: "Light kick, snare, and hats",
    vibe: "pop",
  },
  {
    id: "trap-808",
    name: "808 Trap",
    genre: "Trap",
    description: "Hard kicks and rolling hats",
    vibe: "trap",
  },
  {
    id: "acoustic-kit",
    name: "Acoustic Kit",
    genre: "Acoustic",
    description: "Soft, organic drum feel",
    vibe: "acoustic",
  },
];
