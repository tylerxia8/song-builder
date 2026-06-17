"use client";

import { useRef, useState } from "react";
import {
  canPlaceClipOnTrack,
  pixelsToBeats,
  resizeClipFromLeft,
  resizeClipFromRight,
  snapBeat,
} from "@/lib/clip-editing";
import type { Clip, Track } from "@/types/project";
import { BEATS_PER_BAR } from "@/types/project";

type DragMode = "move" | "resize-left" | "resize-right";

interface ClipBlockProps {
  clip: Clip;
  track: Track;
  barWidthPx: number;
  selected: boolean;
  trackIds: string[];
  trackIndex: number;
  getTrackAtIndex: (index: number) => Track | undefined;
  onSelect: () => void;
  onMove: (clipId: string, trackId: string, startBeat: number) => void;
  onResize: (clipId: string, startBeat: number, durationBeat: number) => void;
}

export function ClipBlock({
  clip,
  track,
  barWidthPx,
  selected,
  trackIds,
  trackIndex,
  getTrackAtIndex,
  onSelect,
  onMove,
  onResize,
}: ClipBlockProps) {
  const [preview, setPreview] = useState<{ startBeat: number; durationBeat: number } | null>(
    null,
  );
  const previewRef = useRef<{ startBeat: number; durationBeat: number } | null>(null);
  const dragRef = useRef<{
    mode: DragMode;
    originX: number;
    originY: number;
    startBeat: number;
    durationBeat: number;
    trackId: string;
    trackIndex: number;
  } | null>(null);

  const startBeat = preview?.startBeat ?? clip.startBeat;
  const durationBeat = preview?.durationBeat ?? clip.durationBeat;
  const left = (startBeat / BEATS_PER_BAR) * barWidthPx;
  const width = Math.max(48, (durationBeat / BEATS_PER_BAR) * barWidthPx);

  const beginDrag = (mode: DragMode) => (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();

    dragRef.current = {
      mode,
      originX: event.clientX,
      originY: event.clientY,
      startBeat: clip.startBeat,
      durationBeat: clip.durationBeat,
      trackId: track.id,
      trackIndex,
    };
    setPreview(null);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const deltaBeat = pixelsToBeats(moveEvent.clientX - drag.originX, barWidthPx);
      const rowDelta = Math.round((moveEvent.clientY - drag.originY) / 64);
      const targetIndex = Math.max(
        0,
        Math.min(trackIds.length - 1, drag.trackIndex + rowDelta),
      );
      const targetTrack = getTrackAtIndex(targetIndex);

      if (drag.mode === "move") {
        if (targetTrack && canPlaceClipOnTrack(clip.kind, targetTrack.kind)) {
          dragRef.current = { ...drag, trackId: targetTrack.id, trackIndex: targetIndex };
        }

        setPreview({
          startBeat: snapBeat(Math.max(0, drag.startBeat + deltaBeat)),
          durationBeat: drag.durationBeat,
        });
        previewRef.current = {
          startBeat: snapBeat(Math.max(0, drag.startBeat + deltaBeat)),
          durationBeat: drag.durationBeat,
        };
        return;
      }

      if (drag.mode === "resize-left") {
        const next = resizeClipFromLeft(
          { ...clip, startBeat: drag.startBeat, durationBeat: drag.durationBeat },
          deltaBeat,
        );
        if (next) {
          setPreview({ startBeat: next.startBeat, durationBeat: next.durationBeat });
          previewRef.current = { startBeat: next.startBeat, durationBeat: next.durationBeat };
        }
        return;
      }

      const next = resizeClipFromRight(
        { ...clip, startBeat: drag.startBeat, durationBeat: drag.durationBeat },
        deltaBeat,
      );
      if (next) {
        setPreview({ startBeat: next.startBeat, durationBeat: next.durationBeat });
        previewRef.current = { startBeat: next.startBeat, durationBeat: next.durationBeat };
      }
    };

    const onPointerUp = () => {
      const drag = dragRef.current;
      const current = previewRef.current;

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      if (drag && current) {
        if (drag.mode === "move") {
          onMove(clip.id, drag.trackId, current.startBeat);
        } else {
          onResize(clip.id, current.startBeat, current.durationBeat);
        }
      }

      dragRef.current = null;
      previewRef.current = null;
      setPreview(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      className={`absolute top-2 flex h-12 select-none rounded-md border text-left transition-shadow ${
        selected
          ? "z-20 border-white/40 ring-2 ring-violet-400/40"
          : "z-10 border-white/10 hover:border-white/25"
      } ${preview ? "opacity-90" : ""}`}
      style={{
        left,
        width,
        backgroundColor: `${track.color}33`,
        boxShadow: `inset 0 0 0 1px ${track.color}55`,
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).dataset.handle) return;
        beginDrag("move")(event);
      }}
    >
      <div
        data-handle="left"
        className="absolute bottom-0 left-0 top-0 z-10 w-2 cursor-ew-resize rounded-l-md bg-white/10 hover:bg-white/25"
        onPointerDown={beginDrag("resize-left")}
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-1">
        <span className="truncate text-xs font-semibold text-white">{clip.name}</span>
        <span className="truncate text-[10px] capitalize text-zinc-300/80">
          {clip.kind} · {durationBeat} beats
        </span>
      </div>

      <div
        data-handle="right"
        className="absolute bottom-0 right-0 top-0 z-10 w-2 cursor-ew-resize rounded-r-md bg-white/10 hover:bg-white/25"
        onPointerDown={beginDrag("resize-right")}
      />
    </div>
  );
}
