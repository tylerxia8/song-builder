"use client";

import type { HarmonyAnalysis } from "@/lib/types";

interface ChordSuggestionsProps {
  harmony: HarmonyAnalysis;
  masterBpm: number;
}

export function ChordSuggestions({ harmony, masterBpm }: ChordSuggestionsProps) {
  const uniqueChords = [...new Set(harmony.chordProgression.map((chord) => chord.label))];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0f0f15] px-4 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Analysis
      </span>
      <span className="rounded border border-white/10 bg-[#1a1a24] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
        {harmony.detectedKey}
      </span>
      <span className="rounded border border-white/10 bg-[#1a1a24] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
        {masterBpm} BPM
      </span>
      {uniqueChords.map((label) => (
        <span
          key={label}
          className="rounded border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 font-mono text-[11px] text-violet-100"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
