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
  generateChordPad,
  generateHarmonyFromMelody,
  parseKeyLabel,
  quantizeNotes,
  snapNotesToBass,
  snapNotesToHarmony,
} from "./harmony";
import {
  prependSilence,
  renderInstrumentTrack,
  renderOriginalTrack,
  renderSilentTrack,
} from "./instruments";
import { detectOnsets } from "./onsets";
import { extractNotes, scaleNoteTimes, shiftNotes, shiftOnsets } from "./pitch";
import { applyAutotuneToNotes, renderAutotunedVoice } from "./autotune";
import { snapOnsetsToGrid } from "./beat-grid";
import { ensureMinDuration, generateDefaultBeatGrid, safeTrimStart } from "./utils";
import type { ProduceOptions } from "@/lib/types";

interface ProduceContext {
  masterBpm: number;
  harmony: HarmonyAnalysis;
  chordSegments: ChordSegment[];
  melodyNotes: NoteEvent[];
  key: ReturnType<typeof parseKeyLabel>;
  autotuneEnabled: boolean;
}

interface ProduceTrackInput {
  recording: TrackRecording;
  buffer: AudioBuffer;
  syncSettings: SyncSettings;
  context: ProduceContext;
}

export interface ProductionSummary {
  result: ProductionResult;
  warnings: string[];
}

export async function produceSong(tracks: TrackRecording[]): Promise<ProductionResult> {
  return (await produceSongWithSummary(tracks)).result;
}

export async function produceSongWithSummary(
  tracks: TrackRecording[],
  options: ProduceOptions = {},
): Promise<ProductionSummary> {
  const autotuneEnabled = options.autotuneEnabled ?? true;
  const warnings: string[] = [];
  const recordedTracks = tracks.filter((track) => track.audioBlob);

  if (recordedTracks.length === 0) {
    return {
      result: {
        masterBpm: 120,
        harmony: { detectedKey: "C major", chordProgression: [{ time: 0, label: "C" }] },
        tracks,
      },
      warnings,
    };
  }

  const decoded: { recording: TrackRecording; buffer: AudioBuffer }[] = [];

  for (const track of recordedTracks) {
    try {
      decoded.push({
        recording: track,
        buffer: await decodeAudioBlob(track.audioBlob!),
      });
    } catch {
      warnings.push(`${capitalize(track.type)} could not be decoded and was skipped.`);
    }
  }

  if (decoded.length === 0) {
    throw new Error("Could not read any recorded layers.");
  }

  const { masterBpm, syncByTrack } = computeAutofit(
    decoded.map(({ recording, buffer }) => ({ type: recording.type, buffer })),
  );

  const melodyTrack = decoded.find(({ recording }) => recording.type === "melody");
  const melodySync = syncByTrack.melody ?? {
    trimStartSec: 0,
    startDelaySec: 0,
    tempoScale: 1,
    gridOriginSec: 0,
  };

  let melodyNotes = melodyTrack
    ? prepareMelodyNotes(melodyTrack.buffer, melodySync, masterBpm)
    : [];

  if (melodyNotes.length === 0) {
    const fallback = decoded.find(({ recording }) => recording.type !== "drums");
    if (fallback) {
      melodyNotes = alignNotesToBeatGrid(
        fallback.buffer,
        syncByTrack[fallback.recording.type],
        masterBpm,
      );
    }
  }

  const maxDuration = Math.max(
    ensureMinDuration(
      decoded.reduce((longest, { buffer, recording }) => {
        const duration = getEffectiveDuration(buffer, syncByTrack[recording.type]);
        return Math.max(longest, duration);
      }, 0),
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
    autotuneEnabled,
  };

  const produced: TrackRecording[] = [];

  for (const { recording, buffer } of decoded) {
    const syncSettings = syncByTrack[recording.type];
    const { track, warning } = await produceTrackSafely({
      recording,
      buffer,
      syncSettings,
      context,
    });
    produced.push(track);
    if (warning) warnings.push(warning);
  }

  const producedByType = new Map(produced.map((track) => [track.type, track]));

  return {
    result: {
      masterBpm,
      harmony,
      tracks: tracks.map((track) => producedByType.get(track.type) ?? track),
    },
    warnings,
  };
}

function prepareMelodyNotes(
  buffer: AudioBuffer,
  syncSettings: SyncSettings,
  masterBpm: number,
): NoteEvent[] {
  return alignNotesToBeatGrid(buffer, syncSettings, masterBpm);
}

function chordLabelToRoot(label: string): number {
  const match = label.match(/^(C#|D#|F#|G#|A#|[A-G])/);
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "A", "A#", "B"];
  return match ? names.indexOf(match[1]) : 0;
}

async function produceTrackSafely(
  input: ProduceTrackInput,
): Promise<{ track: TrackRecording; warning?: string }> {
  try {
    const track = await produceTrack(input);
    return { track };
  } catch {
    try {
      const track = await produceTrackFallback(input);
      return {
        track,
        warning: `${capitalize(input.recording.type)} used a simplified fallback mix.`,
      };
    } catch {
      throw new Error(`Could not produce ${input.recording.type} layer.`);
    }
  }
}

async function produceTrack({
  recording,
  buffer,
  syncSettings,
  context,
}: ProduceTrackInput): Promise<TrackRecording> {
  const duration = ensureMinDuration(getEffectiveDuration(buffer, syncSettings));
  let renderedBuffer: AudioBuffer;
  let noteCount: number | null = null;

  if (recording.instrument === "original") {
    if (context.autotuneEnabled && recording.type !== "drums") {
      renderedBuffer = await renderAutotunedOriginal(buffer, recording.type, syncSettings, context);
      noteCount = null;
    } else {
      renderedBuffer = await renderOriginalTrack(
        buffer,
        safeTrimStart(syncSettings.trimStartSec, buffer.duration),
        syncSettings.tempoScale,
      );
    }
  } else if (recording.instrument === "drum-kit") {
    const onsets = resolveDrumOnsets(buffer, syncSettings, context.masterBpm, duration);
    noteCount = onsets.length;
    renderedBuffer = await renderInstrumentTrack([], onsets, "drum-kit", duration);
  } else {
    const notes = resolveMusicalNotes(recording.type, buffer, syncSettings, context);
    noteCount = notes.length;

    if (notes.length === 0) {
      renderedBuffer = await renderOriginalTrack(
        buffer,
        safeTrimStart(syncSettings.trimStartSec, buffer.duration),
        syncSettings.tempoScale,
      );
    } else {
      renderedBuffer = await renderInstrumentTrack(notes, [], recording.instrument, duration);
    }
  }

  renderedBuffer = await prependSilence(renderedBuffer, syncSettings.startDelaySec);
  return finalizeTrack(recording, syncSettings, renderedBuffer, noteCount);
}

async function produceTrackFallback({
  recording,
  buffer,
  syncSettings,
}: ProduceTrackInput): Promise<TrackRecording> {
  const duration = ensureMinDuration(getEffectiveDuration(buffer, syncSettings));
  let renderedBuffer: AudioBuffer;

  try {
    renderedBuffer = await renderOriginalTrack(
      buffer,
      safeTrimStart(syncSettings.trimStartSec, buffer.duration),
      syncSettings.tempoScale,
    );
  } catch {
    renderedBuffer = await renderSilentTrack(duration);
  }

  renderedBuffer = await prependSilence(renderedBuffer, syncSettings.startDelaySec);
  return finalizeTrack(recording, syncSettings, renderedBuffer, 0);
}

function resolveDrumOnsets(
  buffer: AudioBuffer,
  syncSettings: SyncSettings,
  bpm: number,
  duration: number,
): number[] {
  const shifted = shiftOnsets(
    detectOnsets(buffer),
    syncSettings.trimStartSec,
    syncSettings.tempoScale,
  );

  if (shifted.length === 0) {
    return snapOnsetsToGrid(generateDefaultBeatGrid(bpm, duration), bpm, 0, 4);
  }

  return snapOnsetsToGrid(shifted, bpm, 0, 4);
}

function alignNotesToBeatGrid(
  buffer: AudioBuffer,
  syncSettings: SyncSettings,
  bpm: number,
): NoteEvent[] {
  return quantizeNotes(
    scaleNoteTimes(
      shiftNotes(extractNotes(buffer), syncSettings.trimStartSec),
      syncSettings.tempoScale,
    ),
    bpm,
    4,
    0,
  );
}

function resolveMusicalNotes(
  type: TrackType,
  buffer: AudioBuffer,
  syncSettings: SyncSettings,
  context: ProduceContext,
): NoteEvent[] {
  const rawNotes = alignNotesToBeatGrid(buffer, syncSettings, context.masterBpm);

  if (type === "melody") {
    const notes = quantizeNotes(
      rawNotes.length > 0 ? rawNotes : generateChordPad(context.chordSegments, context.masterBpm),
      context.masterBpm,
      4,
      0,
    );
    return maybeAutotuneNotes(type, notes, context);
  }

  if (type === "harmony") {
    const notes =
      rawNotes.length >= 2
        ? snapNotesToHarmony(rawNotes, context.chordSegments, context.key)
        : generateHarmonyFromMelody(
            context.melodyNotes,
            context.chordSegments,
            context.key,
          );
    return maybeAutotuneNotes(
      type,
      quantizeNotes(
        notes.length > 0 ? notes : generateChordPad(context.chordSegments, context.masterBpm),
        context.masterBpm,
        4,
        0,
      ),
      context,
    );
  }

  if (type === "bass") {
    const notes =
      rawNotes.length >= 2
        ? snapNotesToBass(rawNotes, context.chordSegments)
        : generateBassLine(context.chordSegments, context.masterBpm);
    return maybeAutotuneNotes(
      type,
      quantizeNotes(notes, context.masterBpm, 4, 0),
      context,
    );
  }

  return rawNotes;
}

async function renderAutotunedOriginal(
  buffer: AudioBuffer,
  type: TrackType,
  syncSettings: SyncSettings,
  context: ProduceContext,
): Promise<AudioBuffer> {
  const rawNotes = quantizeNotes(
    scaleNoteTimes(
      shiftNotes(extractNotes(buffer), syncSettings.trimStartSec),
      syncSettings.tempoScale,
    ),
    context.masterBpm,
    4,
    0,
  );

  if (rawNotes.length === 0) {
    return renderOriginalTrack(
      buffer,
      safeTrimStart(syncSettings.trimStartSec, buffer.duration),
      syncSettings.tempoScale,
    );
  }

  const tunedNotes = applyAutotuneToNotes(
    type as "melody" | "harmony" | "bass",
    rawNotes,
    context.key,
    context.chordSegments,
  );

  const autotuned = await renderAutotunedVoice(
    buffer,
    rawNotes,
    tunedNotes,
    safeTrimStart(syncSettings.trimStartSec, buffer.duration),
    syncSettings.tempoScale,
  );

  return renderOriginalTrack(autotuned, 0, 1);
}

function maybeAutotuneNotes(
  type: TrackType,
  notes: NoteEvent[],
  context: ProduceContext,
): NoteEvent[] {
  if (!context.autotuneEnabled || type === "drums" || notes.length === 0) {
    return notes;
  }

  return applyAutotuneToNotes(
    type as "melody" | "harmony" | "bass",
    notes,
    context.key,
    context.chordSegments,
  );
}

function finalizeTrack(
  recording: TrackRecording,
  syncSettings: SyncSettings,
  renderedBuffer: AudioBuffer,
  noteCount: number | null,
): TrackRecording {
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function revokeProducedUrls(tracks: TrackRecording[]) {
  tracks.forEach((track) => {
    if (track.producedAudioUrl) {
      URL.revokeObjectURL(track.producedAudioUrl);
    }
  });
}
