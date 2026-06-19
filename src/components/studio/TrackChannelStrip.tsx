"use client";

import type { Track } from "@/types/project";
import { INSTRUMENT_PRESETS } from "@/lib/sound-library";
import { useStudio } from "@/store/project-store";

interface TrackChannelStripProps {
  track: Track;
  selected: boolean;
  onSelect: () => void;
}

export function TrackChannelStrip({ track, selected, onSelect }: TrackChannelStripProps) {
  const { updateTrackMix, armTrack, addMidiClip, addDrumClip, setTrackInstrument, state } =
    useStudio();

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
        />

        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={track.pan}
          onChange={(event) => updateTrackMix(track.id, { pan: Number(event.target.value) })}
          className="h-1 w-10 shrink-0 accent-[var(--sf-accent)]"
        />

        {track.kind === "instrument" ? (
          <select
            value={track.instrument}
            onChange={(event) =>
              setTrackInstrument(track.id, event.target.value as Track["instrument"])
            }
            className="ml-auto max-w-[72px] rounded border border-[var(--sf-border)] bg-[var(--sf-panel-2)] px-1 py-0.5 text-[9px] text-white"
          >
            {INSTRUMENT_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        ) : null}

        {track.kind === "audio" ? (
          <button
            type="button"
            onClick={() => armTrack(track.id)}
            className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold ${
              track.armed ? "bg-[var(--sf-danger)] text-white" : "bg-[var(--sf-panel-3)] text-[var(--sf-text-muted)]"
            }`}
          >
            R
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              track.kind === "drums"
                ? addDrumClip(track.id, state.transport.currentBeat)
                : addMidiClip(track.id, state.transport.currentBeat)
            }
            className="ml-auto rounded bg-[var(--sf-panel-3)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--sf-text-muted)] hover:text-white"
            title="Add clip at playhead"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
