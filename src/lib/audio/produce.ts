import type { ProductionResult, SyncSettings, TrackRecording } from "@/lib/types";
import { computeAutofit } from "./autofit";
import { audioBufferToBlob, decodeAudioBlob, getEffectiveDuration } from "./decode";
import { renderInstrumentTrack, renderOriginalTrack, prependSilence } from "./instruments";
import { detectOnsets } from "./onsets";
import { extractNotes, scaleNoteTimes, shiftNotes, shiftOnsets } from "./pitch";

interface ProduceTrackInput {
  recording: TrackRecording;
  buffer: AudioBuffer;
  syncSettings: SyncSettings;
}

export async function produceSong(tracks: TrackRecording[]): Promise<ProductionResult> {
  const recordedTracks = tracks.filter((track) => track.audioBlob);
  if (recordedTracks.length === 0) {
    return { masterBpm: 120, tracks };
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

  const produced = await Promise.all(
    decoded.map(async ({ recording, buffer }) => {
      const syncSettings = syncByTrack[recording.type];
      return produceTrack({ recording, buffer, syncSettings });
    }),
  );

  const producedByType = new Map(produced.map((track) => [track.type, track]));

  return {
    masterBpm,
    tracks: tracks.map((track) => producedByType.get(track.type) ?? track),
  };
}

async function produceTrack({
  recording,
  buffer,
  syncSettings,
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
    const notes = scaleNoteTimes(
      shiftNotes(extractNotes(buffer), syncSettings.trimStartSec),
      syncSettings.tempoScale,
    );
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

export function revokeProducedUrls(tracks: TrackRecording[]) {
  tracks.forEach((track) => {
    if (track.producedAudioUrl) {
      URL.revokeObjectURL(track.producedAudioUrl);
    }
  });
}
