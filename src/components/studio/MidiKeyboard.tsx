"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStudio } from "@/store/project-store";

const KEY_MAP: Record<string, number> = {
  a: 60,
  w: 61,
  s: 62,
  e: 63,
  d: 64,
  f: 65,
  t: 66,
  g: 67,
  y: 68,
  h: 69,
  u: 70,
  j: 71,
  k: 72,
};

const WHITE_KEYS = [
  { label: "A", pitch: 60 },
  { label: "S", pitch: 62 },
  { label: "D", pitch: 64 },
  { label: "F", pitch: 65 },
  { label: "G", pitch: 67 },
  { label: "H", pitch: 69 },
  { label: "J", pitch: 71 },
  { label: "K", pitch: 72 },
];

export function MidiKeyboard() {
  const { previewNote, selectedTrack } = useStudio();
  const held = useRef(new Set<number>());

  const play = useCallback(
    (pitch: number) => {
      if (held.current.has(pitch)) return;
      held.current.add(pitch);
      void previewNote(pitch);
    },
    [previewNote],
  );

  const release = useCallback((pitch: number) => {
    held.current.delete(pitch);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.repeat) return;
      const pitch = KEY_MAP[event.key.toLowerCase()];
      if (pitch) {
        event.preventDefault();
        play(pitch);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const pitch = KEY_MAP[event.key.toLowerCase()];
      if (pitch) release(pitch);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [play, release]);

  if (!selectedTrack || selectedTrack.kind === "audio") {
    return (
      <p className="text-xs text-[var(--sf-text-muted)]">
        Select an instrument or drum channel to play the keyboard.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[var(--sf-text-muted)]">
        Click keys or use A–K (W/E/T/Y/U for sharps) on{" "}
        <span className="text-white">{selectedTrack.name}</span>.
      </p>
      <div className="flex gap-1">
        {WHITE_KEYS.map((key) => (
          <button
            key={key.pitch}
            type="button"
            onMouseDown={() => play(key.pitch)}
            onMouseUp={() => release(key.pitch)}
            onMouseLeave={() => release(key.pitch)}
            className="flex h-24 flex-1 flex-col justify-end rounded-b-md border border-[var(--sf-border)] bg-white pb-2 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
