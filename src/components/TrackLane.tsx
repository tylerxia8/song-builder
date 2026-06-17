"use client";

import type { InstrumentId, TrackDefinition, TrackRecording, TrackType } from "@/lib/types";
import type { TrackMixSettings } from "@/lib/mix";
import { getInstrumentOptionsForTrack } from "@/lib/tracks";
import { TRACK_COLOR_BG, TRACK_COLORS } from "@/lib/track-colors";
import { AudioWaveform } from "./AudioWaveform";

interface TrackLaneProps {
  definition: TrackDefinition;
  recording: TrackRecording;
  mix: TrackMixSettings;
  isArmed: boolean;
  isRecording: boolean;
  playheadSec: number | null;
  timelineDuration: number;
  onArm: () => void;
  onPlay: () => void;
  onClear: () => void;
  onInstrumentChange: (instrument: InstrumentId) => void;
  onMixChange: (type: TrackType, mix: Partial<TrackMixSettings>) => void;
}

const statusLabels = {
  empty: "Empty",
  recorded: "Raw",
  processing: "Processing",
  ready: "Produced",
} as const;

export function TrackLane({
  definition,
  recording,
  mix,
  isArmed,
  isRecording,
  playheadSec,
  timelineDuration,
  onArm,
  onPlay,
  onClear,
  onInstrumentChange,
  onMixChange,
}: TrackLaneProps) {
  const color = TRACK_COLORS[definition.type];
  const colorBg = TRACK_COLOR_BG[definition.type];
  const instrumentOptions = getInstrumentOptionsForTrack(definition.type);
  const previewUrl =
    recording.status === "ready" && recording.producedAudioUrl
      ? recording.producedAudioUrl
      : recording.audioUrl;

  const playheadPercent =
    playheadSec !== null && timelineDuration > 0
      ? Math.min(100, (playheadSec / timelineDuration) * 100)
      : null;

  return (
    <div
      className={`grid grid-cols-[11rem_1fr] border-b border-white/10 sm:grid-cols-[13rem_1fr] ${
        isArmed ? "bg-white/[0.03]" : "bg-[#101018]"
      }`}
    >
      <div
        className="flex flex-col border-r border-white/10 p-3"
        style={{ boxShadow: `inset 3px 0 0 0 ${color}` }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onArm}
            className={`flex h-7 w-7 items-center justify-center rounded text-[11px] font-bold transition ${
              isArmed
                ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.35)]"
                : "bg-[#1a1a24] text-zinc-400 hover:bg-red-500/20 hover:text-red-200"
            }`}
            title="Arm track for recording"
          >
            R
          </button>
          <button
            type="button"
            onClick={() => onMixChange(definition.type, { muted: !mix.muted })}
            className={`flex h-7 w-7 items-center justify-center rounded text-[11px] font-bold transition ${
              mix.muted
                ? "bg-amber-500/25 text-amber-200"
                : "bg-[#1a1a24] text-zinc-400 hover:bg-amber-500/15 hover:text-amber-100"
            }`}
            title="Mute track"
          >
            M
          </button>
          <button
            type="button"
            onClick={() => onMixChange(definition.type, { solo: !mix.solo })}
            className={`flex h-7 w-7 items-center justify-center rounded text-[11px] font-bold transition ${
              mix.solo
                ? "bg-sky-500/25 text-sky-200"
                : "bg-[#1a1a24] text-zinc-400 hover:bg-sky-500/15 hover:text-sky-100"
            }`}
            title="Solo track"
          >
            S
          </button>
        </div>

        <div className="mt-2 min-w-0">
          <p className="truncate text-sm font-semibold text-white">{definition.label}</p>
          <p className="truncate text-[11px] text-zinc-500">{statusLabels[recording.status]}</p>
        </div>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Vol {Math.round(mix.volume * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={mix.volume}
            onChange={(event) =>
              onMixChange(definition.type, { volume: Number(event.target.value) })
            }
            className="accent-violet-500"
          />
        </label>

        <label className="mt-2 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Pan {mix.pan > 0 ? "R" : mix.pan < 0 ? "L" : "C"}
            {Math.abs(mix.pan) > 0.05 ? Math.round(Math.abs(mix.pan) * 100) : ""}
          </span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={mix.pan}
            onChange={(event) => onMixChange(definition.type, { pan: Number(event.target.value) })}
            className="accent-violet-500"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Instrument</span>
          <select
            value={recording.instrument}
            disabled={recording.status === "processing"}
            onChange={(event) => onInstrumentChange(event.target.value as InstrumentId)}
            className="rounded border border-white/10 bg-[#0b0b10] px-2 py-1.5 text-xs text-white outline-none focus:border-white/20"
          >
            {instrumentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPlay}
            disabled={!recording.audioUrl}
            className="rounded border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300 transition hover:bg-white/10 disabled:opacity-40"
          >
            Audition
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!recording.audioUrl}
            className="rounded border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="relative min-h-[5.5rem] p-2" style={{ backgroundColor: colorBg }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 100%",
          }}
        />

        {playheadPercent !== null && (
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.45)]"
            style={{ left: `${playheadPercent}%` }}
          />
        )}

        {isRecording && isArmed && (
          <div className="absolute left-3 top-2 z-10 flex items-center gap-2 rounded bg-red-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            Input
          </div>
        )}

        {previewUrl ? (
          <AudioWaveform audioUrl={previewUrl} color={color} emptyLabel="No audio" />
        ) : (
          <div className="flex h-full min-h-16 items-center justify-center rounded-sm border border-dashed border-white/10 bg-black/20 px-4 text-center">
            <p className="text-xs text-zinc-500">{definition.hint}</p>
          </div>
        )}

        {recording.duration && (
          <p className="absolute bottom-2 right-3 font-mono text-[10px] text-zinc-500">
            {recording.duration.toFixed(1)}s
            {recording.noteCount !== null && recording.status === "ready"
              ? ` · ${recording.noteCount} notes`
              : ""}
          </p>
        )}
      </div>
    </div>
  );
}
