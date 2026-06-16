"use client";

import type { HarmonyAnalysis } from "@/lib/types";

interface ChordSuggestionsProps {
  harmony: HarmonyAnalysis;
  masterBpm: number;
}

export function ChordSuggestions({ harmony, masterBpm }: ChordSuggestionsProps) {
  const uniqueChords = [...new Set(harmony.chordProgression.map((chord) => chord.label))];

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            Harmony analysis
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Key: <span className="font-semibold text-white">{harmony.detectedKey}</span>
            <span className="mx-2 text-zinc-600">·</span>
            ~{masterBpm} BPM
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          Harmony and bass layers snap to these chord tones when produced.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {uniqueChords.map((label) => (
          <span
            key={label}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white"
          >
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
