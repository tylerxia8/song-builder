"use client";

import { useState } from "react";
import { SONG_VIBES } from "@/lib/song-templates";
import { useStudio } from "@/store/project-store";
import type { TrackKind } from "@/types/project";
import { AiAssistPanel } from "./AssistPanels";
import { ImportPanel } from "./AssistPanels";
import { RecordPanel } from "./RecordPanel";
import { SampleChopperPanel } from "./SampleChopperPanel";

const instruments = [
  { id: "grand-piano", label: "Grand Piano" },
  { id: "electric-piano", label: "Electric Piano" },
  { id: "analog-bass", label: "Analog Bass" },
  { id: "lead-synth", label: "Lead Synth" },
  { id: "pad", label: "Warm Pad" },
] as const;

const TABS = [
  { id: "start", label: "Start" },
  { id: "record", label: "Record" },
  { id: "chop", label: "Chop" },
  { id: "tracks", label: "Tracks" },
] as const;

type ProducerTab = (typeof TABS)[number]["id"];

export function ProducerPanel() {
  const [tab, setTab] = useState<ProducerTab>("start");
  const {
    addTrack,
    loadTemplateForVibe,
    setTrackInstrument,
    selectedTrack,
    newProject,
  } = useStudio();

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#101018]">
      <div className="border-b border-white/10 px-2 py-2">
        <div className="grid grid-cols-4 gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${
                tab === item.id
                  ? "bg-violet-500/20 text-violet-100"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 daw-scrollbar">
        {tab === "start" ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">Pick a bed, then record, chop, and export — all from Pro.</p>
            <div className="grid gap-2">
              {SONG_VIBES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadTemplateForVibe(item.id)}
                  className="rounded-lg border border-white/10 bg-[#12121a] px-3 py-2.5 text-left transition hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">{item.description}</p>
                </button>
              ))}
            </div>
            <ImportPanel />
            <button
              type="button"
              onClick={newProject}
              className="w-full rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/5"
            >
              Blank session
            </button>
            <AiAssistPanel />
          </div>
        ) : null}

        {tab === "record" ? <RecordPanel /> : null}
        {tab === "chop" ? <SampleChopperPanel /> : null}

        {tab === "tracks" ? (
          <div className="space-y-4">
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Add track
              </p>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ["audio", "Voice / Audio"],
                    ["instrument", "Instrument"],
                    ["drums", "Drums"],
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
                Instrument
              </p>
              <div className="flex flex-col gap-1">
                {instruments.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={
                      !selectedTrack ||
                      selectedTrack.kind === "drums" ||
                      selectedTrack.kind === "audio"
                    }
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
        ) : null}
      </div>
    </aside>
  );
}
