"use client";

import type { Clip } from "@/types/project";
import { BEATS_PER_BAR } from "@/types/project";
import { useStudio } from "@/store/project-store";

const PITCHES = Array.from({ length: 24 }, (_, index) => 72 - index);

interface PianoRollEditorProps {
  clip: Clip;
}

export function PianoRollEditor({ clip }: PianoRollEditorProps) {
  const { togglePianoNote } = useStudio();
  const steps = Math.max(BEATS_PER_BAR, Math.min(32, Math.round(clip.durationBeat)));

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[var(--sf-text-muted)]">
        Click cells to paint notes across {steps} beats.
      </p>
      <div
        className="grid gap-px overflow-auto rounded-md border border-[var(--sf-border)] bg-[var(--sf-border)]"
        style={{ gridTemplateColumns: `48px repeat(${steps}, minmax(22px, 1fr))` }}
      >
        <div className="sticky left-0 bg-[var(--sf-panel-2)]" />
        {Array.from({ length: steps }, (_, step) => (
          <div
            key={step}
            className="bg-[var(--sf-panel-2)] py-1 text-center text-[9px] font-mono text-[var(--sf-text-muted)]"
          >
            {step + 1}
          </div>
        ))}
        {PITCHES.map((pitch) => (
          <div key={pitch} className="contents">
            <div className="sticky left-0 flex items-center bg-[var(--sf-panel-2)] px-2 text-[10px] font-mono text-[var(--sf-text-muted)]">
              {pitch}
            </div>
            {Array.from({ length: steps }, (_, step) => {
              const active = clip.notes?.some(
                (note) => note.pitch === pitch && Math.round(note.startBeat) === step,
              );
              return (
                <button
                  key={`${pitch}-${step}`}
                  type="button"
                  onClick={() => togglePianoNote(clip.id, pitch, step)}
                  className={`h-5 transition ${
                    active
                      ? "bg-[var(--sf-accent)]"
                      : pitch % 12 === 0 || pitch % 12 === 2 || pitch % 12 === 4 || pitch % 12 === 5 || pitch % 12 === 7 || pitch % 12 === 9
                        ? "bg-[var(--sf-panel)] hover:bg-[var(--sf-accent-soft)]"
                        : "bg-[var(--sf-panel-2)] hover:bg-[var(--sf-accent-soft)]"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
