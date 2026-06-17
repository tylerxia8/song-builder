"use client";

import { useStudio } from "@/store/project-store";
import type { TrackKind } from "@/types/project";

const instruments = [
  { id: "grand-piano", label: "Grand Piano" },
  { id: "electric-piano", label: "Electric Piano" },
  { id: "analog-bass", label: "Analog Bass" },
  { id: "lead-synth", label: "Lead Synth" },
  { id: "pad", label: "Warm Pad" },
] as const;

export function BrowserPanel() {
  const { addTrack, setTrackInstrument, selectedTrack } = useStudio();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#101018]">
      <div className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Browser
      </div>

      <div className="space-y-4 p-3">
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Add Track
          </p>
          <div className="flex flex-col gap-1.5">
            {(
              [
                ["instrument", "Instrument"],
                ["drums", "Drums"],
                ["audio", "Audio"],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => addTrack(kind as TrackKind)}
                className="rounded-md border border-white/10 bg-[#15151f] px-3 py-2 text-left text-xs font-medium text-zinc-200 transition hover:border-violet-500/30 hover:bg-violet-500/10"
              >
                + {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Instruments
          </p>
          <div className="flex flex-col gap-1">
            {instruments.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!selectedTrack || selectedTrack.kind === "drums"}
                onClick={() =>
                  selectedTrack && setTrackInstrument(selectedTrack.id, item.id)
                }
                className="rounded px-2 py-1.5 text-left text-xs text-zinc-300 transition hover:bg-white/5 disabled:opacity-40"
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#0d0d14] p-3 text-xs leading-relaxed text-zinc-400">
          <p className="font-semibold text-zinc-200">Quick start</p>
          <p className="mt-2">
            Press Play to hear the demo arrangement. Select a clip below to edit drums or
            notes, then export your mix.
          </p>
        </section>
      </div>
    </aside>
  );
}
