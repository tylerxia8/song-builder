"use client";

import type { Track } from "@/types/project";
import { useStudio } from "@/store/project-store";

interface TrackChannelStripProps {
  track: Track;
  selected: boolean;
  onSelect: () => void;
}

export function TrackChannelStrip({ track, selected, onSelect }: TrackChannelStripProps) {
  const { updateTrackMix, armTrack } = useStudio();

  return (
    <div
      className={`flex h-[72px] shrink-0 flex-col border-b border-[var(--sf-border)] px-2 py-1.5 ${
        selected ? "bg-[var(--sf-accent-soft)]" : "bg-[var(--sf-panel)]"
      }`}
      style={{ boxShadow: `inset 3px 0 0 0 ${track.color}` }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="truncate text-left text-xs font-semibold text-white"
      >
        {track.name}
      </button>

      <div className="mt-1 flex min-h-0 flex-1 items-end gap-1.5">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => updateTrackMix(track.id, { solo: !track.solo })}
            className={`h-5 w-5 rounded text-[9px] font-bold ${
              track.solo
                ? "bg-[var(--sf-accent)] text-white"
                : "bg-[var(--sf-panel-3)] text-[var(--sf-text-muted)] hover:text-white"
            }`}
            title="Solo"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => updateTrackMix(track.id, { muted: !track.muted })}
            className={`h-5 w-5 rounded text-[9px] font-bold ${
              track.muted
                ? "bg-amber-500/80 text-white"
                : "bg-[var(--sf-panel-3)] text-[var(--sf-text-muted)] hover:text-white"
            }`}
            title="Mute"
          >
            M
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          onChange={(event) => updateTrackMix(track.id, { volume: Number(event.target.value) })}
          className="sf-fader h-10 w-4 shrink-0"
          title={`Volume ${Math.round(track.volume * 100)}%`}
        />

        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={track.pan}
          onChange={(event) => updateTrackMix(track.id, { pan: Number(event.target.value) })}
          className="h-1 w-10 shrink-0 accent-[var(--sf-accent)]"
          title="Pan"
        />

        {track.kind === "audio" ? (
          <button
            type="button"
            onClick={() => armTrack(track.id)}
            className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold ${
              track.armed
                ? "bg-[var(--sf-danger)] text-white"
                : "bg-[var(--sf-panel-3)] text-[var(--sf-text-muted)]"
            }`}
            title="Arm for recording"
          >
            R
          </button>
        ) : null}
      </div>
    </div>
  );
}
