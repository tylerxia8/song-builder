export type FilterType = "lowpass" | "highpass";

export interface TrackFxSettings {
  reverb: { enabled: boolean; wet: number };
  delay: { enabled: boolean; wet: number; time: number };
  filter: { enabled: boolean; frequency: number; type: FilterType };
}

export const DEFAULT_TRACK_FX: TrackFxSettings = {
  reverb: { enabled: false, wet: 0.22 },
  delay: { enabled: false, wet: 0.18, time: 0.35 },
  filter: { enabled: false, frequency: 8000, type: "lowpass" },
};

export function resolveTrackFx(fx?: TrackFxSettings): TrackFxSettings {
  if (!fx) return DEFAULT_TRACK_FX;
  return {
    reverb: { ...DEFAULT_TRACK_FX.reverb, ...fx.reverb },
    delay: { ...DEFAULT_TRACK_FX.delay, ...fx.delay },
    filter: { ...DEFAULT_TRACK_FX.filter, ...fx.filter },
  };
}
