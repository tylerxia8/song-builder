"use client";

import type { Clip } from "@/types/project";
import { STEPS_PER_PATTERN } from "@/types/project";
import type { DrumPattern } from "@/types/project";
import { useStudio } from "@/store/project-store";

const DRUM_ROWS: Array<{ key: keyof DrumPattern; label: string; color: string }> = [
  { key: "kick", label: "Kick", color: "#ef4444" },
  { key: "snare", label: "Snare", color: "#f59e0b" },
  { key: "hihat", label: "Hi-Hat", color: "#38bdf8" },
  { key: "clap", label: "Clap", color: "#a78bfa" },
];

interface BeatmakerEditorProps {
  clip: Clip;
}

export function BeatmakerEditor({ clip }: BeatmakerEditorProps) {
  const { toggleDrumStep, previewNote } = useStudio();

  if (!clip.pattern) return null;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[var(--sf-text-muted)]">
        16-step beatmaker — click steps to toggle hits.
      </p>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `72px repeat(${STEPS_PER_PATTERN}, minmax(28px, 1fr))` }}
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
            {clip.pattern![row.key].map((active, step) => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  toggleDrumStep(clip.id, row.key, step);
                  const pitchMap = { kick: 36, snare: 38, hihat: 42, clap: 39 };
                  void previewNote(pitchMap[row.key], active ? 0.3 : 0.85);
                }}
                className={`h-8 rounded-md border transition ${
                  active
                    ? "border-transparent text-white"
                    : "border-[var(--sf-border)] bg-[var(--sf-panel-2)] hover:border-white/20"
                }`}
                style={active ? { backgroundColor: row.color } : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
