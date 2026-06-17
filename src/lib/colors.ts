export const TRACK_PALETTE = [
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ec4899",
  "#10b981",
  "#6366f1",
  "#ef4444",
  "#14b8a6",
] as const;

export function trackColor(index: number): string {
  return TRACK_PALETTE[index % TRACK_PALETTE.length];
}
