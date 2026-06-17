import type { Track } from "@/types/project";

export function isTrackAudible(track: Track, tracks: Track[]): boolean {
  if (track.muted) return false;

  const anySolo = tracks.some((item) => item.solo);
  if (anySolo) return track.solo;

  return true;
}

export function getTrackOutputVolume(track: Track, tracks: Track[]): number {
  if (!isTrackAudible(track, tracks)) return 0.0001;
  return track.volume;
}
