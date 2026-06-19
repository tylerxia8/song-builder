"use client";

import { resolveTrackFx } from "@/lib/track-fx";
import type { Track } from "@/types/project";
import { useStudio } from "@/store/project-store";

interface TrackFxPanelProps {
  track: Track;
}

export function TrackFxPanel({ track }: TrackFxPanelProps) {
  const { updateTrackFx } = useStudio();
  const fx = resolveTrackFx(track.fx);

  if (track.kind === "audio") return null;

  return (
    <div className="mt-1 space-y-2 rounded-md border border-[var(--sf-border)] bg-[var(--sf-panel-2)] p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sf-text-muted)]">
        FX
      </p>

      <label className="flex items-center justify-between gap-2 text-[10px] text-[var(--sf-text-muted)]">
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fx.reverb.enabled}
            onChange={(event) =>
              updateTrackFx(track.id, { reverb: { ...fx.reverb, enabled: event.target.checked } })
            }
          />
          Reverb
        </span>
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.01}
          value={fx.reverb.wet}
          disabled={!fx.reverb.enabled}
          onChange={(event) =>
            updateTrackFx(track.id, { reverb: { ...fx.reverb, wet: Number(event.target.value) } })
          }
          className="w-20 accent-[var(--sf-accent)]"
        />
      </label>

      <label className="flex items-center justify-between gap-2 text-[10px] text-[var(--sf-text-muted)]">
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fx.delay.enabled}
            onChange={(event) =>
              updateTrackFx(track.id, { delay: { ...fx.delay, enabled: event.target.checked } })
            }
          />
          Delay
        </span>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={fx.delay.wet}
          disabled={!fx.delay.enabled}
          onChange={(event) =>
            updateTrackFx(track.id, { delay: { ...fx.delay, wet: Number(event.target.value) } })
          }
          className="w-20 accent-[var(--sf-accent)]"
        />
      </label>

      <label className="flex items-center justify-between gap-2 text-[10px] text-[var(--sf-text-muted)]">
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fx.filter.enabled}
            onChange={(event) =>
              updateTrackFx(track.id, { filter: { ...fx.filter, enabled: event.target.checked } })
            }
          />
          Filter
        </span>
        <input
          type="range"
          min={200}
          max={12000}
          step={50}
          value={fx.filter.frequency}
          disabled={!fx.filter.enabled}
          onChange={(event) =>
            updateTrackFx(track.id, {
              filter: { ...fx.filter, frequency: Number(event.target.value) },
            })
          }
          className="w-20 accent-[var(--sf-accent)]"
        />
      </label>
    </div>
  );
}
