"use client";

import { useStudio } from "@/store/project-store";
import { BEATS_PER_BAR } from "@/types/project";

function barWidth(zoom: number) {
  return 96 * zoom;
}

export function ArrangementView() {
  const {
    project,
    state,
    selectTrack,
    selectClip,
    armTrack,
    addMidiClip,
    addDrumClip,
    setZoom,
  } = useStudio();

  const totalBars = project.lengthBars;
  const timelineWidth = totalBars * barWidth(state.zoom);
  const playheadLeft =
    (state.transport.currentBeat / BEATS_PER_BAR) * barWidth(state.zoom);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0b0b10]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-white">{project.name}</p>
          <p className="text-[11px] text-zinc-500">Arrangement · {totalBars} bars</p>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-zinc-400">
          Zoom
          <input
            type="range"
            min={0.6}
            max={1.8}
            step={0.1}
            value={state.zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-24 accent-violet-500"
          />
        </label>
      </div>

      <div className="flex min-h-0 flex-1 overflow-auto daw-scrollbar">
        <div className="sticky left-0 z-20 w-44 shrink-0 border-r border-white/10 bg-[#101018]">
          <div className="flex h-9 items-center border-b border-white/10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Tracks
          </div>
          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="flex h-16 flex-col justify-center border-b border-white/10 px-3"
              style={{ boxShadow: `inset 3px 0 0 0 ${track.color}` }}
            >
              <button
                type="button"
                onClick={() => selectTrack(track.id)}
                className="truncate text-left text-sm font-semibold text-white"
              >
                {track.name}
              </button>
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => armTrack(track.id)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    track.armed
                      ? "bg-red-500 text-white"
                      : "bg-[#1a1a24] text-zinc-400 hover:text-red-200"
                  }`}
                >
                  Record
                </button>
                <button
                  type="button"
                  onClick={() =>
                    track.kind === "drums"
                      ? addDrumClip(track.id, 0)
                      : addMidiClip(track.id, 0)
                  }
                  className="rounded bg-[#1a1a24] px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-200"
                >
                  + Clip
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            className="sticky top-0 z-10 flex h-9 items-end border-b border-white/10 bg-[#0f0f15]"
            style={{ width: timelineWidth }}
          >
            {Array.from({ length: totalBars }, (_, bar) => (
              <div
                key={bar}
                className="relative shrink-0 border-l border-white/10 px-2 pb-1"
                style={{ width: barWidth(state.zoom) }}
              >
                <span className="text-[10px] font-mono text-zinc-500">{bar + 1}</span>
                <div className="absolute bottom-0 left-0 top-0 flex w-full">
                  {[1, 2, 3].map((beat) => (
                    <div key={beat} className="flex-1 border-l border-white/[0.04]" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {project.loopEnabled && (
            <div
              className="pointer-events-none absolute top-9 z-0 border-x border-violet-400/30 bg-violet-500/5"
              style={{
                left: project.loopStartBar * barWidth(state.zoom),
                width: (project.loopEndBar - project.loopStartBar) * barWidth(state.zoom),
                bottom: 0,
              }}
            />
          )}

          <div className="relative" style={{ width: timelineWidth }}>
            {state.transport.isPlaying && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                style={{ left: playheadLeft }}
              />
            )}

            {project.tracks.map((track) => (
              <div
                key={track.id}
                className="relative h-16 border-b border-white/10 bg-[#101018]/40"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-50"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)",
                    backgroundSize: `${barWidth(state.zoom) / 4}px 100%`,
                  }}
                />

                {track.clips.map((clip) => {
                  const left = (clip.startBeat / BEATS_PER_BAR) * barWidth(state.zoom);
                  const width = Math.max(
                    48,
                    (clip.durationBeat / BEATS_PER_BAR) * barWidth(state.zoom),
                  );

                  return (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => selectClip(clip.id)}
                      className={`absolute top-2 flex h-12 flex-col justify-center rounded-md border px-2 text-left transition ${
                        state.selection.clipId === clip.id
                          ? "border-white/40 ring-2 ring-violet-400/40"
                          : "border-white/10 hover:border-white/25"
                      }`}
                      style={{
                        left,
                        width,
                        backgroundColor: `${track.color}33`,
                        boxShadow: `inset 0 0 0 1px ${track.color}55`,
                      }}
                    >
                      <span className="truncate text-xs font-semibold text-white">
                        {clip.name}
                      </span>
                      <span className="truncate text-[10px] capitalize text-zinc-300/80">
                        {clip.kind}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
