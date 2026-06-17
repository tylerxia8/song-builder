const blobs = new Map<string, Blob>();
const urls = new Map<string, string>();
const waveformCache = new Map<string, number[]>();

export function registerAudioAsset(assetId: string, blob: Blob): string {
  const existingUrl = urls.get(assetId);
  if (existingUrl) {
    blobs.set(assetId, blob);
    return existingUrl;
  }

  blobs.set(assetId, blob);
  const url = URL.createObjectURL(blob);
  urls.set(assetId, url);
  return url;
}

export function getAudioBlob(assetId: string): Blob | undefined {
  return blobs.get(assetId);
}

export function getAudioUrl(assetId: string): string | undefined {
  return urls.get(assetId);
}

export function cacheWaveformPeaks(assetId: string, peaks: number[]): void {
  waveformCache.set(assetId, peaks);
}

export function getWaveformPeaks(assetId: string): number[] | undefined {
  return waveformCache.get(assetId);
}

export function clearWaveformPeaks(assetId: string): void {
  waveformCache.delete(assetId);
}

export async function ensureAudioUrl(
  assetId: string,
  blob?: Blob,
): Promise<string | undefined> {
  const existing = urls.get(assetId);
  if (existing) return existing;
  if (!blob) return undefined;
  return registerAudioAsset(assetId, blob);
}

export function revokeProjectAudioUrls(projectAssetIds: Iterable<string>): void {
  for (const assetId of projectAssetIds) {
    const url = urls.get(assetId);
    if (url) URL.revokeObjectURL(url);
    urls.delete(assetId);
    blobs.delete(assetId);
    waveformCache.delete(assetId);
  }
}

export function collectProjectAssetIds(
  tracks: Array<{ clips: Array<{ audioAssetId?: string }> }>,
): Set<string> {
  const ids = new Set<string>();
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (clip.audioAssetId) ids.add(clip.audioAssetId);
    }
  }
  return ids;
}
