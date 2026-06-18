import { createStarterTemplate } from "@/lib/starter-template";
import { createId, type Project } from "@/types/project";

export type SongVibe = "kanye" | "pop" | "trap" | "acoustic";

export const SONG_VIBES: Array<{ id: SongVibe; label: string; description: string; bpm: number }> =
  [
    { id: "kanye", label: "Kanye Soul", description: "Sample chop, boom bap, 84 BPM", bpm: 84 },
    { id: "pop", label: "Minimal Pop", description: "Sparse drums, Am–F–C–G", bpm: 120 },
    { id: "trap", label: "Trap", description: "808-style bed, dark chords", bpm: 140 },
    { id: "acoustic", label: "Acoustic", description: "Soft kit, warm chords", bpm: 96 },
  ];

export function createTemplateForVibe(vibe: SongVibe): Project {
  if (vibe === "kanye") {
    throw new Error("Use createKanyeTemplate() for async Kanye template load.");
  }

  const base = createStarterTemplate();

  if (vibe === "pop") {
    return { ...base, name: "Minimal Pop Starter", songKey: "Am" };
  }

  if (vibe === "trap") {
    const pattern = base.tracks[0]?.clips[0]?.pattern;
    if (pattern) {
      pattern.kick.fill(false);
      pattern.snare.fill(false);
      pattern.hihat.fill(false);
      [0, 3, 6, 10].forEach((step) => {
        pattern.kick[step] = true;
      });
      [4, 12].forEach((step) => {
        pattern.snare[step] = true;
      });
      for (let step = 0; step < 16; step += 1) {
        if (step % 2 === 0) pattern.hihat[step] = true;
      }
    }

    return {
      ...base,
      id: createId("project"),
      name: "Trap Starter",
      bpm: 140,
      songKey: "Dm",
      loopEndBar: 4,
      tracks: base.tracks.map((track) => ({
        ...track,
        volume: track.kind === "drums" ? 0.95 : track.kind === "audio" ? 0.92 : track.volume * 0.9,
      })),
    };
  }

  return {
    ...base,
    id: createId("project"),
    name: "Acoustic Starter",
    bpm: 96,
    songKey: "G",
    metronomeEnabled: false,
    tracks: base.tracks.map((track) => ({
      ...track,
      instrument: track.kind === "instrument" && track.name === "Chords" ? "pad" : track.instrument,
      volume: track.kind === "drums" ? 0.72 : track.volume * 0.85,
    })),
  };
}

export const WIZARD_STEPS = [
  { id: "vibe", title: "Pick a vibe", detail: "Choose a genre bed to start from." },
  { id: "listen", title: "Listen", detail: "Press play and feel the loop." },
  { id: "chop", title: "Chop the sample", detail: "Slice, flip, and place soul chops on the grid." },
  { id: "record", title: "Record your hook", detail: "Rap or sing your hook over the beat." },
  { id: "polish", title: "Polish vocal", detail: "Tune and balance your take." },
  { id: "balance", title: "Balance mix", detail: "Set vocal vs beat levels." },
  { id: "export", title: "Master & export", detail: "Download your finished song." },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];
