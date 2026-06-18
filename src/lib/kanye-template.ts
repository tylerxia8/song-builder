import { registerAudioAsset } from "@/lib/audio-assets";
import { generateSoulSampleLoop } from "@/lib/kanye-soul-sample";
import { secondsToBeats } from "@/lib/audio-clip";
import { trackColor } from "@/lib/colors";
import {
  createEmptyDrumPattern,
  createId,
  type Clip,
  type Project,
  type Track,
} from "@/types/project";

function kanyeDrumPattern() {
  const pattern = createEmptyDrumPattern();
  [0, 6, 10].forEach((step) => {
    pattern.kick[step] = true;
  });
  [4, 12].forEach((step) => {
    pattern.snare[step] = true;
  });
  [2, 3, 6, 7, 10, 11, 14, 15].forEach((step) => {
    pattern.hihat[step] = true;
  });
  [7, 15].forEach((step) => {
    pattern.clap[step] = true;
  });
  return pattern;
}

export async function createKanyeTemplate(): Promise<Project> {
  const bpm = 84;
  const drumTrackId = createId("track");
  const sampleTrackId = createId("track");
  const bassTrackId = createId("track");
  const vocalTrackId = createId("track");

  const soulBlob = await generateSoulSampleLoop(bpm);
  const assetId = createId("audio");
  const audioUrl = registerAudioAsset(assetId, soulBlob);
  const durationBeat = secondsToBeats(4 * 4 * (60 / bpm), bpm);

  const sampleClip: Clip = {
    id: createId("clip"),
    trackId: sampleTrackId,
    name: "Soul Chorus Loop",
    kind: "audio",
    startBeat: 0,
    durationBeat,
    sourceDurationBeat: durationBeat,
    audioOffsetBeat: 0,
    audioAssetId: assetId,
    audioUrl,
    color: "#c4a574",
  };

  const bassClip: Clip = {
    id: createId("clip"),
    trackId: bassTrackId,
    name: "Sub Bass",
    kind: "midi",
    startBeat: 0,
    durationBeat: 16,
    notes: [
      { id: createId("note"), pitch: 36, startBeat: 0, durationBeat: 3.75, velocity: 0.78 },
      { id: createId("note"), pitch: 32, startBeat: 4, durationBeat: 3.75, velocity: 0.75 },
      { id: createId("note"), pitch: 29, startBeat: 8, durationBeat: 3.75, velocity: 0.76 },
      { id: createId("note"), pitch: 31, startBeat: 12, durationBeat: 3.75, velocity: 0.74 },
    ],
  };

  const tracks: Track[] = [
    {
      id: drumTrackId,
      name: "Drums",
      kind: "drums",
      color: trackColor(0),
      instrument: "grand-piano",
      volume: 0.86,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      clips: [
        {
          id: createId("clip"),
          trackId: drumTrackId,
          name: "Boom Bap",
          kind: "drums",
          startBeat: 0,
          durationBeat: 16,
          pattern: kanyeDrumPattern(),
        },
      ],
    },
    {
      id: sampleTrackId,
      name: "Sample",
      kind: "audio",
      color: "#c4a574",
      instrument: "grand-piano",
      volume: 0.72,
      pan: -0.08,
      muted: false,
      solo: false,
      armed: false,
      clips: [sampleClip],
    },
    {
      id: bassTrackId,
      name: "Bass",
      kind: "instrument",
      color: trackColor(2),
      instrument: "analog-bass",
      volume: 0.68,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      clips: [bassClip],
    },
    {
      id: vocalTrackId,
      name: "Vocal",
      kind: "audio",
      color: trackColor(3),
      instrument: "grand-piano",
      volume: 0.92,
      pan: 0.05,
      muted: false,
      solo: false,
      armed: true,
      clips: [],
    },
  ];

  return {
    id: createId("project"),
    name: "Kanye Soul Chop",
    bpm,
    timeSignature: [4, 4],
    lengthBars: 16,
    loopEnabled: true,
    loopStartBar: 0,
    loopEndBar: 4,
    metronomeEnabled: false,
    songKey: "Cm",
    tracks,
  };
}

export const KANYE_WORKFLOW = [
  "Play the soul loop and feel the pocket at 84 BPM.",
  "Open the Sample Chopper — slice the loop into 8 chops.",
  "Flip a chop (reverse + pitch) and place it on beat 1.",
  "Record your rap or sung hook on the Vocal track.",
  "Polish vocal, balance mix, export Release WAV.",
] as const;
