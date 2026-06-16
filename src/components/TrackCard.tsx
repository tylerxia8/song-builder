"use client";

import type { InstrumentId, TrackDefinition, TrackRecording } from "@/lib/types";
import { getInstrumentOptionsForTrack } from "@/lib/tracks";
import { AudioWaveform } from "./AudioWaveform";

interface TrackCardProps {
  definition: TrackDefinition;
  recording: TrackRecording;
  isActive: boolean;
  isRecording: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onClear: () => void;
  onInstrumentChange: (instrument: InstrumentId) => void;
}

const statusLabels = {
  empty: "Ready to record",
  recorded: "Recorded",
  processing: "Processing",
  ready: "Polished",
} as const;

export function TrackCard({
  definition,
  recording,
  isActive,
  isRecording,
  onSelect,
  onPlay,
  onClear,
  onInstrumentChange,
}: TrackCardProps) {
  const hasAudio = Boolean(recording.audioUrl);
  const instrumentOptions = getInstrumentOptionsForTrack(definition.type);
  const previewUrl =
    recording.status === "ready" && recording.producedAudioUrl
      ? recording.producedAudioUrl
      : recording.audioUrl;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        isActive
          ? "border-violet-400/70 bg-violet-500/10 shadow-[0_0_30px_rgba(168,85,247,0.15)]"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">
            {definition.emoji}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">{definition.label}</h3>
              {isRecording && isActive && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
                  Recording
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-400">{definition.hint}</p>
          </div>
        </div>

        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300">
          {statusLabels[recording.status]}
        </span>
      </div>

      {hasAudio && previewUrl && (
        <div className="mt-4 space-y-3" onClick={(event) => event.stopPropagation()}>
          <AudioWaveform audioUrl={previewUrl} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-400">Instrument sound</span>
              <select
                value={recording.instrument}
                disabled={recording.status === "processing"}
                onChange={(event) =>
                  onInstrumentChange(event.target.value as InstrumentId)
                }
                className="rounded-lg border border-white/10 bg-[#0b0b10] px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
              >
                {instrumentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col items-start gap-1 sm:items-end">
              <p className="text-xs text-zinc-500">
                {recording.duration ? `${recording.duration.toFixed(1)}s captured` : "Audio captured"}
                {recording.noteCount !== null && recording.status === "ready"
                  ? ` · ${recording.noteCount} hits/notes`
                  : ""}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onPlay}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                >
                  {recording.status === "ready" ? "Play polished" : "Play raw"}
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </button>
  );
}
