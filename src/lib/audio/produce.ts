import type {
  ChordSegment,
  HarmonyAnalysis,
  NoteEvent,
  ProductionResult,
  SyncSettings,
  TrackRecording,
  TrackType,
} from "@/lib/types";
import { computeAutofit } from "./autofit";
import { audioBufferToBlob, decodeAudioBlob, getEffectiveDuration } from "./decode";
import {
  analyzeHarmony,
  generateBassLine,
  generateHarmonyFromMelody,
  parseKeyLabel,
  quantizeNotes,
  snapNotesToBass,
  snapNotesToHarmony,
} from "./harmony";
import { renderInstrumentTrack, renderOriginalTrack, prependSilence } from "./instruments";
import { detectOnsets } from "./onsets";
import { extractNotes, scaleNoteTimes, shiftNotes, shiftOnsets } from "./pitch";

interface ProduceContext {
  masterBpm: number;
  harmony: HarmonyAnalysis;
  chordSegments: ChordSegment[];
  melodyNotes: NoteEvent[];
  key: ReturnType<typeof parseKeyLabel>;
}

interface ProduceTrackInput {
  recording: TrackRecording;
  buffer: AudioBuffer;
  syncSettings: SyncSettings;
  context: ProduceContext;
}

export async function produceSong(tracks: TrackRecording[]): Promise<ProductionResult> {
  const recordedTracks = tracks.filter((track) => track.audioBlob);
  if (recordedTracks.length === 0) {
    return {
      masterBpm: 120,
      harmony: { detectedKey: "C major", chordProgression: [{ time: 0, label: "C" }] },
      tracks,
    };
  }

  const decoded = await Promise.all(
    recordedTracks.map(async (track) => ({
      recording: track,
      buffer: await decodeAudioBlob(track.audioBlob!),
    })),
  );

  const { masterBpm, syncByTrack } = computeAutofit(
    decoded.map(({ recording, buffer }) => ({ type: recording.type, buffer })),
  );

  const melodyTrack = decoded.find(({ recording }) => recording.type === "melody");
  const melodySync = syncByTrack.melody ?? {
    trimStartSec: 0,
    startDelaySec: 0,
    tempoScale: 1,
  };

  let melodyNotes = melodyTrack
    ? prepareMelodyNotes(melodyTrack.buffer, melodySync, masterBpm)
    : [];

  if (melodyNotes.length === 0) {
    const fallback = decoded.find(({ recording }) => recording.type !== "drums");
    if (fallback) {
      const fallbackSync = syncByTrack[fallback.recording.type];
      melodyNotes = quantizeNotes(
        scaleNoteTimes(
          shiftNotes(extractNotes(fallback.buffer), fallbackSync.trimStartSec),
          fallbackSync.tempoScale,
        ),
        masterBpm,
      );
    }
  }

  const maxDuration = Math.max(
    ...decoded.map(({ buffer, recording }) =>
      getEffectiveDuration(buffer, syncByTrack[recording.type]),
    ),
  );

  const harmony = analyzeHarmony(melodyNotes, masterBpm, maxDuration);
  const key = parseKeyLabel(harmony.detectedKey);
  const chordSegments: ChordSegment[] = harmony.chordProgression.map((chord) => ({
    time: chord.time,
    label: chord.label,
    rootPc: chordLabelToRoot(chord.label),
  }));

  const context: ProduceContext = {
    masterBpm,
    harmony,
    chordSegments,
    melodyNotes,
    key,
  };

  const produced = await Promise.all(
    decoded.map(async ({ recording, buffer }) => {
      const syncSettings = syncByTrack[recording.type];
      return produceTrack({ recording, buffer, syncSettings, context });
    }),
  );

  const producedByType = new Map(produced.map((track) => [track.type, track]));

  return {
    masterBpm,
    harmony,
    tracks: tracks.map((track) => producedByType.get(track.type) ?? track),
  };
}

function prepareMelodyNotes(
  buffer: AudioBuffer,
  syncSettings: SyncSettings,
  masterBpm: number,
): NoteEvent[] {
  const notes = scaleNoteTimes(
    shiftNotes(extractNotes(buffer), syncSettings.trimStartSec),
    syncSettings.tempoScale,
  );
  return quantizeNotes(notes, masterBpm);
}

function chordLabelToRoot(label: string): number {
  const match = label.match(/^(C#|D#|F#|G#|A#|[A-G])/);
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "A", "A#", "B"];
  return match ? names.indexOf(match[1]) : 0;
}

async function produceTrack({
  recording,
  buffer,
  syncSettings,
  context,
}: ProduceTrackInput): Promise<TrackRecording> {
  const { instrument } = recording;
  let renderedBuffer: AudioBuffer;
  let noteCount: number | null = null;

  if (instrument === "original") {
    renderedBuffer = await renderOriginalTrack(
      buffer,
      syncSettings.trimStartSec,
      syncSettings.tempoScale,
    );
  } else if (instrument === "drum-kit") {
    const onsets = shiftOnsets(
      detectOnsets(buffer),
      syncSettings.trimStartSec,
      syncSettings.tempoScale,
    );
    noteCount = onsets.length;
    const duration = getEffectiveDuration(buffer, syncSettings);
    renderedBuffer = await renderInstrumentTrack([], onsets, "drum-kit", duration);
  } else {
    const notes = buildMusicalNotes(recording.type, buffer, syncSettings, context);
    noteCount = notes.length;
    const duration = getEffectiveDuration(buffer, syncSettings);
    renderedBuffer = await renderInstrumentTrack(notes, [], instrument, duration);
  }

  renderedBuffer = await prependSilence(renderedBuffer, syncSettings.startDelaySec);

  const producedBlob = audioBufferToBlob(renderedBuffer);
  const producedAudioUrl = URL.createObjectURL(producedBlob);

  return {
    ...recording,
    syncSettings,
    producedAudioUrl,
    noteCount,
    status: "ready",
  };
}

function buildMusicalNotes(
  type: TrackType,
  buffer: AudioBuffer,
  syncSettings: SyncSettings,
  context: ProduceContext,
): NoteEvent[] {
  const rawNotes = scaleNoteTimes(
    shiftNotes(extractNotes(buffer), syncSettings.trimStartSec),
    syncSettings.tempoScale,
  );

  if (type === "melody") {
    return quantizeNotes(rawNotes, context.masterBpm);
  }

  if (type === "harmony") {
    const notes =
      rawNotes.length >= 3
        ? snapNotesToHarmony(rawNotes, context.chordSegments, context.key)
        : generateHarmonyFromMelody(
            context.melodyNotes,
            context.chordSegments,
            context.key,
          );
    return quantizeNotes(notes, context.masterBpm);
  }

  if (type === "bass") {
    const notes =
      rawNotes.length >= 3
        ? snapNotesToBass(rawNotes, context.chordSegments)
        : generateBassLine(context.chordSegments, context.masterBpm);
    return quantizeNotes(notes, context.masterBpm);
  }

  return quantizeNotes(rawNotes, context.masterBpm);
}

export function revokeProducedUrls(tracks: TrackRecording[]) {
  tracks.forEach((track) => {
    if (track.producedAudioUrl) {
      URL.revokeObjectURL(track.producedAudioUrl);
    }
  });
}
