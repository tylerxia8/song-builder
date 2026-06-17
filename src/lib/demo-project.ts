import { createEmptyDrumPattern, createId, type Clip, type Project, type Track } from "@/types/project";
import { trackColor } from "./colors";

function drumClip(trackId: string, startBeat: number, name: string): Clip {
  const pattern = createEmptyDrumPattern();
  [0, 4, 8, 12].forEach((step) => {
    pattern.kick[step] = true;
  });
  [4, 12].forEach((step) => {
    pattern.snare[step] = true;
  });
  for (let i = 0; i < 16; i += 1) {
    if (i % 2 === 0) pattern.hihat[i] = true;
  }
  [6, 14].forEach((step) => {
    pattern.clap[step] = true;
  });

  return {
    id: createId("clip"),
    trackId,
    name,
    kind: "drums",
    startBeat,
    durationBeat: 16,
    pattern,
  };
}

function bassClip(trackId: string, startBeat: number): Clip {
  const notes = [36, 36, 43, 41, 36, 36, 38, 41].map((pitch, index) => ({
    id: createId("note"),
    pitch,
    startBeat: index * 2,
    durationBeat: 1.75,
    velocity: 0.85,
  }));

  return {
    id: createId("clip"),
    trackId,
    name: "Bass Line",
    kind: "midi",
    startBeat,
    durationBeat: 16,
    notes,
  };
}

function chordClip(trackId: string, startBeat: number): Clip {
  const chords = [
    [60, 64, 67],
    [55, 59, 62],
    [53, 57, 60],
    [48, 52, 55],
  ];

  const notes = chords.flatMap((chord, bar) =>
    chord.map((pitch) => ({
      id: createId("note"),
      pitch,
      startBeat: bar * 4,
      durationBeat: 3.5,
      velocity: 0.55,
    })),
  );

  return {
    id: createId("clip"),
    trackId,
    name: "Chords",
    kind: "midi",
    startBeat,
    durationBeat: 16,
    notes,
  };
}

function leadClip(trackId: string, startBeat: number): Clip {
  const melody = [72, 74, 76, 74, 72, 69, 67, 72];
  const notes = melody.map((pitch, index) => ({
    id: createId("note"),
    pitch,
    startBeat: index * 2,
    durationBeat: 1.5,
    velocity: 0.75,
  }));

  return {
    id: createId("clip"),
    trackId,
    name: "Lead",
    kind: "midi",
    startBeat,
    durationBeat: 16,
    notes,
  };
}

export function createDemoProject(): Project {
  const drumTrackId = createId("track");
  const bassTrackId = createId("track");
  const chordTrackId = createId("track");
  const leadTrackId = createId("track");

  const tracks: Track[] = [
    {
      id: drumTrackId,
      name: "Drums",
      kind: "drums",
      color: trackColor(0),
      instrument: "grand-piano",
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      clips: [drumClip(drumTrackId, 0, "Main Groove")],
    },
    {
      id: bassTrackId,
      name: "Bass",
      kind: "instrument",
      color: trackColor(1),
      instrument: "analog-bass",
      volume: 0.82,
      pan: -0.15,
      muted: false,
      solo: false,
      armed: false,
      clips: [bassClip(bassTrackId, 0)],
    },
    {
      id: chordTrackId,
      name: "Keys",
      kind: "instrument",
      color: trackColor(2),
      instrument: "electric-piano",
      volume: 0.68,
      pan: 0.2,
      muted: false,
      solo: false,
      armed: false,
      clips: [chordClip(chordTrackId, 0)],
    },
    {
      id: leadTrackId,
      name: "Lead",
      kind: "instrument",
      color: trackColor(3),
      instrument: "lead-synth",
      volume: 0.72,
      pan: 0.35,
      muted: false,
      solo: false,
      armed: false,
      clips: [leadClip(leadTrackId, 0)],
    },
  ];

  return {
    id: createId("project"),
    name: "Untitled Session",
    bpm: 118,
    timeSignature: [4, 4],
    lengthBars: 32,
    loopEnabled: true,
    loopStartBar: 0,
    loopEndBar: 4,
    metronomeEnabled: true,
    tracks,
  };
}
