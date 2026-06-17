"use client";

import { useCallback, useRef } from "react";
import { pixelsToBeats, snapBeat } from "@/lib/clip-editing";
import { useStudio } from "@/store/project-store";
import { BEATS_PER_BAR } from "@/types/project";
import { ClipBlock } from "./ClipBlock";
import { ClipKeyboardShortcuts } from "./ClipKeyboardShortcuts";
import { ClipToolbar } from "./ClipToolbar";

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
    setCurrentBeat,
    moveClip,
    resizeClip,
  } = useStudio();

  const totalBars = project.lengthBars;
  const barWidthPx = barWidth(state.zoom);
  const timelineWidth = totalBars * barWidthPx;
  const playheadLeft = (state.transport.currentBeat / BEATS_PER_BAR) * barWidthPx;
  const trackIds = project.tracks.map((track) => track.id);

  const getTrackAtIndex = useCallback(
    (index: number) => project.tracks[index],
    [project.tracks],
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-clip-block]")) return;
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left + scrollLeft;
    const beat = snapBeat(pixelsToBeats(x, barWidthPx));
    setCurrentBeat(Math.max(0, beat));
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0b0b10]">
      <ClipKeyboardShortcuts />

      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <ClipToolbar />
        <label className="flex shrink-0 items-center gap-2 text-[11px] text-zinc-400">
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

      <div ref={scrollRef} className="flex min-h-0 flex-1 overflow-auto daw-scrollbar">
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
                      ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.35)]"
                      : "bg-[#1a1a24] text-zinc-400 hover:text-red-200"
                  }`}
                  title="Select this track for your next recording"
                >
                  {track.armed ? "Armed" : "Arm"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    track.kind === "drums"
                      ? addDrumClip(track.id, state.transport.currentBeat)
                      : addMidiClip(track.id, state.transport.currentBeat)
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
                style={{ width: barWidthPx }}
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
                left: project.loopStartBar * barWidthPx,
                width: (project.loopEndBar - project.loopStartBar) * barWidthPx,
                bottom: 0,
              }}
            />
          )}

          <div
            className="relative"
            style={{ width: timelineWidth }}
            onClick={handleTimelineClick}
          >
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]"
              style={{ left: playheadLeft }}
            />

            {project.tracks.map((track, trackIndex) => (
              <div
                key={track.id}
                className={`relative h-16 border-b border-white/10 ${
                  track.armed ? "bg-red-500/[0.06]" : "bg-[#101018]/40"
                }`}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-50"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)",
                    backgroundSize: `${barWidthPx / 4}px 100%`,
                  }}
                />

                {track.clips.map((clip) => (
                  <div key={clip.id} data-clip-block="">
                    <ClipBlock
                      clip={clip}
                      track={track}
                      barWidthPx={barWidthPx}
                      selected={state.selection.clipId === clip.id}
                      trackIds={trackIds}
                      trackIndex={trackIndex}
                      getTrackAtIndex={getTrackAtIndex}
                      onSelect={() => selectClip(clip.id)}
                      onMove={moveClip}
                      onResize={resizeClip}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="border-t border-white/10 px-3 py-1.5 text-[10px] text-zinc-600">
        Drag clips to move · edge handles to trim · click timeline to set playhead ·{" "}
        <kbd className="rounded bg-white/10 px-1">Del</kbd> delete ·{" "}
        <kbd className="rounded bg-white/10 px-1">Ctrl+D</kbd> duplicate ·{" "}
        <kbd className="rounded bg-white/10 px-1">S</kbd> split at playhead
      </p>
    </section>
  );
}
