"use client";

import { useCallback, useRef } from "react";
import { pixelsToBeats, snapBeat } from "@/lib/clip-editing";
import { useStudio } from "@/store/project-store";
import { BEATS_PER_BAR } from "@/types/project";
import { ClipBlock } from "./ClipBlock";
import { ClipKeyboardShortcuts } from "./ClipKeyboardShortcuts";
import { TrackChannelStrip } from "./TrackChannelStrip";

function barWidth(zoom: number) {
  return 96 * zoom;
}

export function ArrangementView() {
  const {
    project,
    state,
    selectTrack,
    selectClip,
    addTrack,
    setZoom,
    setCurrentBeat,
    moveClip,
    resizeClip,
    setMasterVolume,
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
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--sf-bg)]">
      <ClipKeyboardShortcuts />

      <div className="flex items-center justify-between gap-3 border-b border-[var(--sf-border)] px-3 py-1.5">
        <button
          type="button"
          onClick={() => addTrack("instrument")}
          className="rounded-md border border-[var(--sf-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sf-text-muted)] hover:border-[var(--sf-accent)]/40 hover:text-white"
        >
          + Add channel
        </button>
        <label className="flex shrink-0 items-center gap-2 text-[11px] text-[var(--sf-text-muted)]">
          Zoom
          <input
            type="range"
            min={0.6}
            max={1.8}
            step={0.1}
            value={state.zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-24 accent-[var(--sf-accent)]"
          />
        </label>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 overflow-auto daw-scrollbar">
        <div className="sticky left-0 z-20 w-[184px] shrink-0 border-r border-[var(--sf-border)] bg-[var(--sf-panel)]">
          <div className="flex h-8 items-center justify-between border-b border-[var(--sf-border)] px-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sf-text-muted)]">
              Channels
            </span>
            <span className="text-[10px] text-[var(--sf-text-muted)]">S · M</span>
          </div>

          <div className="border-b border-[var(--sf-border)] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--sf-text-muted)]">Master</p>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.masterVolume}
              onChange={(event) => setMasterVolume(Number(event.target.value))}
              className="mt-1 w-full accent-[var(--sf-accent)]"
            />
          </div>

          {project.tracks.map((track) => (
            <TrackChannelStrip
              key={track.id}
              track={track}
              selected={state.selection.trackId === track.id}
              onSelect={() => selectTrack(track.id)}
            />
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            className="sticky top-0 z-10 flex h-8 items-end border-b border-[var(--sf-border)] bg-[var(--sf-panel-2)]"
            style={{ width: timelineWidth }}
          >
            {Array.from({ length: totalBars }, (_, bar) => (
              <div
                key={bar}
                className="relative shrink-0 border-l border-[var(--sf-border)] px-2 pb-1"
                style={{ width: barWidthPx }}
              >
                <span className="text-[10px] font-mono text-[var(--sf-text-muted)]">{bar + 1}</span>
                <div className="absolute bottom-0 left-0 top-0 flex w-full">
                  {[1, 2, 3].map((beat) => (
                    <div key={beat} className="flex-1 border-l border-white/[0.03]" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {project.loopEnabled && (
            <div
              className="pointer-events-none absolute top-8 z-0 border-x border-[var(--sf-accent)]/30 bg-[var(--sf-accent-soft)]"
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
              className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              style={{ left: playheadLeft }}
            />

            {project.tracks.map((track, trackIndex) => (
              <div
                key={track.id}
                className={`relative h-[72px] border-b border-[var(--sf-border)] ${
                  track.armed ? "bg-red-500/[0.05]" : "bg-[var(--sf-panel)]/20"
                }`}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)",
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
    </section>
  );
}
