"use client";

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
  const { selectedClip, selection, setEditorMode, toggleDrumStep, togglePianoNote } =
    useStudio();

  return (
    <section className="flex h-72 shrink-0 flex-col border-t border-white/10 bg-[#101018]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Editor
        </p>
        {(["piano-roll", "drum-machine", "audio"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setEditorMode(mode)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
              selection.editorMode === mode
                ? "bg-violet-500/20 text-violet-200"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            {mode.replace("-", " ")}
          </button>
        ))}
        {selectedClip && (
          <span className="ml-auto truncate text-xs text-zinc-400">{selectedClip.name}</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 daw-scrollbar">
        {!selectedClip && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Select a clip in the arrangement to edit notes or drums.
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
                <div
                  key={step}
                  className="text-center text-[10px] font-mono text-zinc-500"
                >
                  {step + 1}
                </div>
              ))}
              {DRUM_ROWS.map((row) => (
                <div key={row.key} className="contents">
                  <div className="flex items-center text-xs font-medium text-zinc-300">
                    {row.label}
                  </div>
                  {selectedClip.pattern![row.key].map((active, step) => (
                    <button
                      key={`${row.key}-${step}`}
                      type="button"
                      onClick={() => toggleDrumStep(selectedClip.id, row.key, step)}
                      className={`h-8 rounded border transition ${
                        active
                          ? "border-violet-300/50 bg-violet-500/70"
                          : "border-white/10 bg-[#0b0b10] hover:border-white/20"
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
            className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10"
            style={{
              gridTemplateColumns: `56px repeat(${selectedClip.durationBeat}, minmax(18px, 1fr))`,
            }}
          >
            {PIANO_PITCHES.map((pitch) => (
              <div key={pitch} className="contents">
                <div className="flex items-center bg-[#0d0d14] px-2 text-[10px] font-mono text-zinc-500">
                  {pitch}
                </div>
                {Array.from({ length: selectedClip.durationBeat }, (_, step) => {
                  const active = selectedClip.notes!.some(
                    (note) =>
                      note.pitch === pitch &&
                      Math.floor(note.startBeat) === step,
                  );
                  const darkRow = [1, 3, 5, 7, 8, 10, 12].includes(pitch % 12);

                  return (
                    <button
                      key={`${pitch}-${step}`}
                      type="button"
                      onClick={() => togglePianoNote(selectedClip.id, pitch, step)}
                      className={`h-5 border-r border-b border-white/[0.04] transition ${
                        active
                          ? "bg-violet-500/80"
                          : darkRow
                            ? "bg-[#12121a] hover:bg-[#181824]"
                            : "bg-[#0f0f15] hover:bg-[#15151f]"
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {selectedClip && selection.editorMode === "audio" && (
          <div className="flex h-full flex-col gap-3">
            {selectedClip.audioUrl ? (
              <>
                <p className="text-sm text-zinc-200">{selectedClip.name}</p>
                <p className="text-xs text-zinc-500">
                  Recorded take · {selectedClip.durationBeat.toFixed(1)} beats on the timeline
                </p>
                <audio
                  controls
                  src={selectedClip.audioUrl}
                  className="w-full max-w-md"
                />
                <p className="text-xs text-zinc-500">
                  Press Play in the transport bar to hear it in the full mix, or use the preview
                  above.
                </p>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-400">
                <p>No audio clip selected</p>
                <p className="max-w-sm text-center text-xs text-zinc-500">
                  Use Set up voice track in the browser, arm a lane, then press Record in the
                  transport bar.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
