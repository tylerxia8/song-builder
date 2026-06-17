import { registerAudioAsset } from "@/lib/audio-assets";
import { secondsToBeats } from "@/lib/audio-clip";
import { createId, type Clip, type Project, type TrackKind } from "@/types/project";

export async function importAudioFile(
  file: File,
  project: Project,
  trackId: string | null,
  startBeat: number,
): Promise<{ clip: Clip; trackId: string } | null> {
  if (!file.type.startsWith("audio/") && !/\.(wav|mp3|m4a|ogg|webm)$/i.test(file.name)) {
    return null;
  }

  const blob = file.slice(0, file.size, file.type || "audio/wav");
  const assetId = createId("audio");
  const audioUrl = registerAudioAsset(assetId, blob);

  const durationSec = await measureAudioDuration(blob);
  const durationBeat = secondsToBeats(durationSec, project.bpm);

  const resolvedTrackId =
    trackId ??
    project.tracks.find((track) => track.kind === "audio")?.id ??
    createId("track");

  const clip: Clip = {
    id: createId("clip"),
    trackId: resolvedTrackId,
    name: file.name.replace(/\.[^.]+$/, ""),
    kind: "audio",
    startBeat,
    durationBeat,
    sourceDurationBeat: durationBeat,
    audioOffsetBeat: 0,
    audioAssetId: assetId,
    audioUrl,
  };

  return { clip, trackId: resolvedTrackId };
}

async function measureAudioDuration(blob: Blob): Promise<number> {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
    return buffer.duration;
  } finally {
    await context.close();
  }
}

export function createAudioTrackForImport(project: Project, name: string) {
  return {
    id: createId("track"),
    name,
    kind: "audio" as TrackKind,
  };
}
