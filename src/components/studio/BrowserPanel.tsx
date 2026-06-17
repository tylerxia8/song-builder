"use client";

import { STARTER_TEMPLATE_STEPS } from "@/lib/starter-template";
import { useStudio } from "@/store/project-store";
import type { TrackKind } from "@/types/project";
import { RecordPanel } from "./RecordPanel";

const instruments = [
  { id: "grand-piano", label: "Grand Piano" },
  { id: "electric-piano", label: "Electric Piano" },
  { id: "analog-bass", label: "Analog Bass" },
  { id: "lead-synth", label: "Lead Synth" },
  { id: "pad", label: "Warm Pad" },
] as const;

export function BrowserPanel() {
  const { addTrack, loadStarterTemplate, setTrackInstrument, selectedTrack } = useStudio();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#101018]">
      <div className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Browser
      </div>

      <div className="space-y-4 overflow-auto p-3 daw-scrollbar">
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Starter Template
          </p>
          <button
            type="button"
            onClick={loadStarterTemplate}
            className="w-full rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-left text-xs font-medium text-violet-100 transition hover:border-violet-400/50 hover:bg-violet-500/15"
          >
            Minimal Pop Starter
            <span className="mt-0.5 block text-[10px] font-normal text-zinc-400">
              120 BPM · Am F C G · drums, bass, chords, vocal
            </span>
          </button>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px] leading-relaxed text-zinc-500">
            {STARTER_TEMPLATE_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <RecordPanel />

        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Add Track
          </p>
          <div className="flex flex-col gap-1.5">
            {(
              [
                ["audio", "Voice / Audio", "Record vocals, hums, or instruments"],
                ["instrument", "Instrument", "MIDI clips and synth playback"],
                ["drums", "Drums", "Step sequencer patterns"],
              ] as const
            ).map(([kind, label, hint]) => (
              <button
                key={kind}
                type="button"
                onClick={() => addTrack(kind as TrackKind)}
                className="rounded-md border border-white/10 bg-[#15151f] px-3 py-2 text-left text-xs font-medium text-zinc-200 transition hover:border-violet-500/30 hover:bg-violet-500/10"
              >
                + {label}
                <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">{hint}</span>
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
                disabled={!selectedTrack || selectedTrack.kind === "drums" || selectedTrack.kind === "audio"}
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
      </div>
    </aside>
  );
}
