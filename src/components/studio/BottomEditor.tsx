"use client";

import { useState } from "react";
import { DEFAULT_VOCAL_POLISH } from "@/lib/vocal-polish";
import { useStudio } from "@/store/project-store";
import type { DrumPattern } from "@/types/project";
import { STEPS_PER_PATTERN } from "@/types/project";

const DRUM_ROWS: Array<{ key: keyof DrumPattern; label: string }> = [
  { key: "kick", label: "Kick" },
  { key: "snare", label: "Snare" },
  { key: "hihat", label: "Hi-Hat" },
  { key: "clap", label: "Clap" },
];

const PIANO_PITCHES = Array.from({ length: 24 }, (_, index) => 60 + (23 - index));

export function BottomEditor() {
  const {
    selectedClip,
    selection,
    setEditorMode,
    toggleDrumStep,
    togglePianoNote,
    polishSelectedVocal,
  } = useStudio();
  const [polishAmount, setPolishAmount] = useState(DEFAULT_VOCAL_POLISH.amount);
  const [polishing, setPolishing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--sf-border)] bg-[var(--sf-panel)] px-3">
        <p className="text-[11px] text-[var(--sf-text-muted)]">
          {selectedClip ? selectedClip.name : "Editor hidden"}
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
    <section className="flex h-64 shrink-0 flex-col border-t border-[var(--sf-border)] bg-[var(--sf-panel)]">
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
          onClick={() => setCollapsed(true)}
          className="ml-auto text-xs text-[var(--sf-text-muted)] hover:text-white"
        >
          Hide
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 daw-scrollbar">
        {!selectedClip && (
          <div className="flex h-full items-center justify-center text-sm text-[var(--sf-text-muted)]">
            Select a clip to edit MIDI, drums, or audio settings.
          </div>
        )}

        {selectedClip && selection.editorMode === "drum-machine" && selectedClip.pattern && (
          <div className="space-y-2">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `80px repeat(${STEPS_PER_PATTERN}, minmax(28px, 1fr))` }}
            >
              <div />
              {Array.from({ length: STEPS_PER_PATTERN }, (_, step) => (
                <div key={step} className="text-center text-[10px] font-mono text-[var(--sf-text-muted)]">
                  {step + 1}
                </div>
              ))}
              {DRUM_ROWS.map((row) => (
                <div key={row.key} className="contents">
                  <div className="flex items-center text-xs font-medium text-white">{row.label}</div>
                  {selectedClip.pattern![row.key].map((active, step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => toggleDrumStep(selectedClip.id, row.key, step)}
                      className={`h-7 rounded border transition ${
                        active
                          ? "border-[var(--sf-accent)] bg-[var(--sf-accent)]"
                          : "border-[var(--sf-border)] bg-[var(--sf-panel-2)] hover:border-[var(--sf-accent)]/40"
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedClip && selection.editorMode === "piano-roll" && selectedClip.notes && (
          <div
            className="grid gap-px rounded-md border border-[var(--sf-border)] bg-[var(--sf-border)]"
            style={{ gridTemplateColumns: "48px 1fr" }}
          >
            {PIANO_PITCHES.map((pitch) => (
              <div key={pitch} className="contents">
                <div className="flex items-center bg-[var(--sf-panel-2)] px-2 text-[10px] font-mono text-[var(--sf-text-muted)]">
                  {pitch}
                </div>
                <button
                  type="button"
                  onClick={() => togglePianoNote(selectedClip.id, pitch, 0)}
                  className={`h-5 bg-[var(--sf-panel)] transition hover:bg-[var(--sf-accent-soft)] ${
                    selectedClip.notes!.some((note) => note.pitch === pitch)
                      ? "bg-[var(--sf-accent-soft)]"
                      : ""
                  }`}
                />
              </div>
            ))}
          </div>
        )}

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
    </section>
  );
}
