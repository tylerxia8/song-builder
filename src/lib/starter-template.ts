import { createEmptyDrumPattern, createId, type Clip, type Project, type Track } from "@/types/project";
import { trackColor } from "./colors";

/** Minimal 4-track pop starter: Am → F → C → G at 120 BPM. Record vocals on track 4. */
export function createStarterTemplate(): Project {
  const drumTrackId = createId("track");
  const bassTrackId = createId("track");
  const chordTrackId = createId("track");
  const vocalTrackId = createId("track");

  const pattern = createEmptyDrumPattern();
  [0, 8].forEach((step) => {
    pattern.kick[step] = true;
  });
  [4, 12].forEach((step) => {
    pattern.snare[step] = true;
    pattern.clap[step] = true;
  });
  [2, 6, 10, 14].forEach((step) => {
    pattern.hihat[step] = true;
  });

  const drumClip: Clip = {
    id: createId("clip"),
    trackId: drumTrackId,
    name: "Sparse Beat",
    kind: "drums",
    startBeat: 0,
    durationBeat: 16,
    pattern,
  };

  const bassRoots = [
    { pitch: 45, startBeat: 0 },
    { pitch: 41, startBeat: 4 },
    { pitch: 36, startBeat: 8 },
    { pitch: 43, startBeat: 12 },
  ];

  const bassClip: Clip = {
    id: createId("clip"),
    trackId: bassTrackId,
    name: "Am F C G Bass",
    kind: "midi",
    startBeat: 0,
    durationBeat: 16,
    notes: bassRoots.map(({ pitch, startBeat }) => ({
      id: createId("note"),
      pitch,
      startBeat,
      durationBeat: 3.75,
      velocity: 0.82,
    })),
  };

  const chordVoicings = [
    { pitches: [57, 60, 64], startBeat: 0 },
    { pitches: [53, 57, 60], startBeat: 4 },
    { pitches: [48, 52, 55], startBeat: 8 },
    { pitches: [43, 47, 50], startBeat: 12 },
  ];

  const chordClip: Clip = {
    id: createId("clip"),
    trackId: chordTrackId,
    name: "Am F C G Chords",
    kind: "midi",
    startBeat: 0,
    durationBeat: 16,
    notes: chordVoicings.flatMap(({ pitches, startBeat }) =>
      pitches.map((pitch) => ({
        id: createId("note"),
        pitch,
        startBeat,
        durationBeat: 3.5,
        velocity: 0.42,
      })),
    ),
  };

  const tracks: Track[] = [
    {
      id: drumTrackId,
      name: "Drums",
      kind: "drums",
      color: trackColor(0),
      instrument: "grand-piano",
      volume: 0.88,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      clips: [drumClip],
    },
    {
      id: bassTrackId,
      name: "Bass",
      kind: "instrument",
      color: trackColor(1),
      instrument: "analog-bass",
      volume: 0.78,
      pan: -0.1,
      muted: false,
      solo: false,
      armed: false,
      clips: [bassClip],
    },
    {
      id: chordTrackId,
      name: "Chords",
      kind: "instrument",
      color: trackColor(2),
      instrument: "electric-piano",
      volume: 0.55,
      pan: 0.15,
      muted: false,
      solo: false,
      armed: false,
      clips: [chordClip],
    },
    {
      id: vocalTrackId,
      name: "Vocal",
      kind: "audio",
      color: trackColor(3),
      instrument: "grand-piano",
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      armed: true,
      clips: [],
    },
  ];

  return {
    id: createId("project"),
    name: "Minimal Pop Starter",
    bpm: 120,
    timeSignature: [4, 4],
    lengthBars: 16,
    loopEnabled: true,
    loopStartBar: 0,
    loopEndBar: 4,
    metronomeEnabled: false,
    tracks,
  };
}

export const STARTER_TEMPLATE_STEPS = [
  "Press Play and loop the 4-bar Am → F → C → G bed.",
  "Arm the Vocal track, hit Record, and sing a simple hook over bars 1–4.",
  "Duplicate your vocal clip to fill the arrangement, then export WAV.",
] as const;
