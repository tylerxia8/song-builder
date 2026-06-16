import type { TrackType } from "./types";

export const TRACK_COLORS: Record<TrackType, string> = {
  melody: "#3b82f6",
  bass: "#f59e0b",
  drums: "#ef4444",
  harmony: "#a855f7",
};

export const TRACK_COLOR_BG: Record<TrackType, string> = {
  melody: "rgba(59, 130, 246, 0.12)",
  bass: "rgba(245, 158, 11, 0.12)",
  drums: "rgba(239, 68, 68, 0.12)",
  harmony: "rgba(168, 85, 247, 0.12)",
};
