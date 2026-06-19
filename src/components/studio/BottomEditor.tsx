"use client";

import { useState } from "react";
import { DEFAULT_VOCAL_POLISH } from "@/lib/vocal-polish";
import { useStudio } from "@/store/project-store";
import { BeatmakerEditor } from "./BeatmakerEditor";
import { MidiKeyboard } from "./MidiKeyboard";
import { PianoRollEditor } from "./PianoRollEditor";
import { TrackFxPanel } from "./TrackFxPanel";

export function BottomEditor() {
  const {
    selectedClip,
    selectedTrack,
    selection,
    setEditorMode,
    polishSelectedVocal,
  } = useStudio();
  const [polishAmount, setPolishAmount] = useState(DEFAULT_VOCAL_POLISH.amount);
  const [polishing, setPolishing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(true);

  if (collapsed) {
    return (
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--sf-border)] bg-[var(--sf-panel)] px-3">
        <p className="text-[11px] text-[var(--sf-text-muted)]">
          {selectedClip ? selectedClip.name : selectedTrack?.name ?? "Editor hidden"}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="text-xs text-[var(--sf-accent)] hover:underline"
        >
          Show editor
        </button>
      </div>
    );
  }

  return (
    <section className="flex h-72 shrink-0 flex-col border-t border-[var(--sf-border)] bg-[var(--sf-panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--sf-border)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sf-text-muted)]">
          Editor
        </p>
        {(["piano-roll", "drum-machine", "audio"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setEditorMode(mode)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
              selection.editorMode === mode
                ? "bg-[var(--sf-accent-soft)] text-[var(--sf-accent)]"
                : "text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-2)] hover:text-white"
            }`}
          >
            {mode.replace("-", " ")}
          </button>
        ))}
        {selectedClip ? (
          <span className="ml-2 truncate text-xs text-[var(--sf-text-muted)]">{selectedClip.name}</span>
        ) : null}
        <button
          type="button"
          onClick={() => setShowKeyboard((value) => !value)}
          className="ml-auto rounded-md px-2 py-1 text-[11px] text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-2)] hover:text-white"
        >
          {showKeyboard ? "Hide keyboard" : "Show keyboard"}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-xs text-[var(--sf-text-muted)] hover:text-white"
        >
          Hide
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-[1fr_280px] daw-scrollbar">
        <div className="min-h-0">
          {!selectedClip && selectedTrack && selectedTrack.kind !== "audio" ? (
            <TrackFxPanel track={selectedTrack} />
          ) : null}

          {!selectedClip && !selectedTrack && (
            <div className="flex h-full items-center justify-center text-sm text-[var(--sf-text-muted)]">
              Select a clip in the timeline, or double-click a channel lane to create one.
            </div>
          )}

          {selectedClip && selection.editorMode === "drum-machine" && selectedClip.pattern ? (
            <BeatmakerEditor clip={selectedClip} />
          ) : null}

          {selectedClip && selection.editorMode === "piano-roll" ? (
            <PianoRollEditor clip={selectedClip} />
          ) : null}

          {selectedClip && selection.editorMode === "audio" && (
            <div className="max-w-md space-y-3">
              <p className="text-sm text-white">{selectedClip.name}</p>
              <p className="text-xs text-[var(--sf-text-muted)]">
                Duration: {selectedClip.durationBeat} beats · Offset: {selectedClip.audioOffsetBeat ?? 0}
              </p>
              <label className="block text-xs text-[var(--sf-text-muted)]">
                Vocal polish amount
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={polishAmount}
                  onChange={(event) => setPolishAmount(Number(event.target.value))}
                  className="mt-2 w-full accent-[var(--sf-accent)]"
                />
              </label>
              <button
                type="button"
                disabled={polishing}
                onClick={async () => {
                  setPolishing(true);
                  try {
                    await polishSelectedVocal(polishAmount);
                  } finally {
                    setPolishing(false);
                  }
                }}
                className="rounded-md bg-[var(--sf-accent)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40"
              >
                {polishing ? "Polishing…" : "Apply vocal polish"}
              </button>
            </div>
          )}
        </div>

        {showKeyboard ? (
          <div className="min-h-0 border-t border-[var(--sf-border)] pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
            <MidiKeyboard />
          </div>
        ) : null}
      </div>
    </section>
  );
}
