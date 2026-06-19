"use client";

import { useRef, useState } from "react";
import {
  DRUM_PRESETS,
  INSTRUMENT_PRESETS,
  LOOP_PACKS,
  type LibraryTab,
} from "@/lib/sound-library";
import { previewDrumPattern, previewInstrument, previewLoopPack } from "@/lib/audio-preview";
import { useStudio } from "@/store/project-store";
import type { TrackKind } from "@/types/project";
import { SampleChopperPanel } from "./SampleChopperPanel";

const TABS: Array<{ id: LibraryTab; label: string }> = [
  { id: "sounds", label: "Sounds" },
  { id: "instruments", label: "Instruments" },
  { id: "drums", label: "Drums" },
  { id: "upload", label: "Upload" },
];

export function LibraryPanel() {
  const [tab, setTab] = useState<LibraryTab>("sounds");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    loadTemplateForVibe,
    addTrack,
    importAudioClip,
    state,
  } = useStudio();

  const normalizedQuery = query.trim().toLowerCase();

  const filteredLoops = LOOP_PACKS.filter(
    (item) =>
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.genre.toLowerCase().includes(normalizedQuery),
  );

  const filteredInstruments = INSTRUMENT_PRESETS.filter(
    (item) =>
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.category.toLowerCase().includes(normalizedQuery),
  );

  const filteredDrums = DRUM_PRESETS.filter(
    (item) =>
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.genre.toLowerCase().includes(normalizedQuery),
  );

  const addChannel = (kind: TrackKind, name: string) => {
    addTrack(kind, { name });
  };

  if (collapsed) {
    return (
      <aside className="flex w-10 shrink-0 flex-col border-r border-[var(--sf-border)] bg-[var(--sf-panel)]">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex h-full items-center justify-center text-[var(--sf-text-muted)] hover:text-white"
          title="Show library"
        >
          ›
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--sf-border)] bg-[var(--sf-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--sf-border)] px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-muted)]">
          Library
        </p>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-[var(--sf-text-muted)] hover:text-white"
          title="Hide library"
        >
          ‹
        </button>
      </div>

      <div className="border-b border-[var(--sf-border)] px-2 py-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sounds…"
          className="w-full rounded-md border border-[var(--sf-border)] bg-[var(--sf-panel-2)] px-3 py-2 text-xs text-white outline-none placeholder:text-[var(--sf-text-muted)] focus:border-[var(--sf-accent)]"
        />
      </div>

      <div className="grid grid-cols-4 gap-1 border-b border-[var(--sf-border)] p-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-md px-1 py-1.5 text-[10px] font-semibold ${
              tab === item.id
                ? "bg-[var(--sf-accent-soft)] text-[var(--sf-accent)]"
                : "text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-2)] hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2 daw-scrollbar">
        {tab === "sounds" ? (
          <div className="space-y-2">
            <p className="px-1 text-[11px] text-[var(--sf-text-muted)]">
              Loop packs load a full session bed at the playhead.
            </p>
            {filteredLoops.map((pack) => (
              <div
                key={pack.id}
                className="rounded-lg border border-[var(--sf-border)] bg-[var(--sf-panel-2)] p-3"
              >
                <div className="mb-2 h-10 rounded-md" style={{ background: `${pack.color}33` }} />
                <p className="text-sm font-semibold">{pack.name}</p>
                <p className="mt-0.5 text-[11px] text-[var(--sf-text-muted)]">
                  {pack.genre} · {pack.bpm} BPM
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void previewLoopPack(pack.genre)}
                    className="rounded-md border border-[var(--sf-border)] px-2 py-1 text-[10px] text-[var(--sf-text-muted)] hover:text-white"
                  >
                    ▶ Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadTemplateForVibe(pack.vibe)}
                    className="rounded-md bg-[var(--sf-accent)] px-2 py-1 text-[10px] font-semibold text-white"
                  >
                    Load pack
                  </button>
                </div>
              </div>
            ))}
            <SampleChopperPanel />
          </div>
        ) : null}

        {tab === "instruments" ? (
          <div className="space-y-2">
            {filteredInstruments.map((preset) => (
              <div
                key={preset.id}
                className="rounded-lg border border-[var(--sf-border)] bg-[var(--sf-panel-2)] px-3 py-2.5"
              >
                <p className="text-sm font-semibold">{preset.name}</p>
                <p className="text-[11px] text-[var(--sf-text-muted)]">
                  {preset.category} · {preset.description}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void previewInstrument(preset.preview)}
                    className="rounded-md border border-[var(--sf-border)] px-2 py-1 text-[10px] text-[var(--sf-text-muted)] hover:text-white"
                  >
                    ▶ Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => addTrack("instrument", { instrument: preset.id, name: preset.name })}
                    className="rounded-md bg-[var(--sf-accent)] px-2 py-1 text-[10px] font-semibold text-white"
                  >
                    Add channel
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "drums" ? (
          <div className="space-y-2">
            {filteredDrums.map((preset) => (
              <div
                key={preset.id}
                className="rounded-lg border border-[var(--sf-border)] bg-[var(--sf-panel-2)] px-3 py-2.5"
              >
                <p className="text-sm font-semibold">{preset.name}</p>
                <p className="text-[11px] text-[var(--sf-text-muted)]">
                  {preset.genre} · {preset.description}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void previewDrumPattern(preset.preview)}
                    className="rounded-md border border-[var(--sf-border)] px-2 py-1 text-[10px] text-[var(--sf-text-muted)] hover:text-white"
                  >
                    ▶ Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadTemplateForVibe(preset.vibe)}
                    className="rounded-md bg-[var(--sf-accent)] px-2 py-1 text-[10px] font-semibold text-white"
                  >
                    Load kit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "upload" ? (
          <div className="space-y-3">
            <p className="text-[11px] text-[var(--sf-text-muted)]">
              Import audio to the timeline at the playhead.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImportError(null);
                try {
                  await importAudioClip(file, state.transport.currentBeat);
                } catch {
                  setImportError("Could not import that file.");
                }
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-[var(--sf-border)] bg-[var(--sf-panel-2)] px-3 py-4 text-sm font-medium hover:border-[var(--sf-accent)]"
            >
              Import WAV / MP3
            </button>
            {importError ? <p className="text-xs text-red-300">{importError}</p> : null}

            <div className="border-t border-[var(--sf-border)] pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--sf-text-muted)]">
                Add channel
              </p>
              <div className="grid gap-1.5">
                {(
                  [
                    ["audio", "Audio channel"],
                    ["instrument", "Instrument channel"],
                    ["drums", "Drum channel"],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addChannel(kind, label)}
                    className="rounded-md border border-[var(--sf-border)] bg-[var(--sf-panel-2)] px-3 py-2 text-left text-xs hover:border-[var(--sf-accent)]/40"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
