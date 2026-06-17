"use client";

import type { ReactNode } from "react";

interface TransportBarProps {
  isRecording: boolean;
  isPlaying: boolean;
  isProducing: boolean;
  isExporting: boolean;
  masterBpm: number | null;
  armedTrackLabel: string;
  canPlay: boolean;
  canRecord: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
}

function TransportButton({
  label,
  subtitle,
  children,
  onClick,
  disabled = false,
  active = false,
  variant = "default",
  showLabel = false,
}: {
  label: string;
  subtitle?: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: "default" | "record" | "play";
  showLabel?: boolean;
}) {
  const base =
    "flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  const styles = {
    default: "border-white/10 bg-[#1a1a24] text-zinc-300 hover:bg-[#232330] hover:text-white",
    play: active
      ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
      : "border-white/10 bg-[#1a1a24] text-zinc-300 hover:bg-[#232330] hover:text-white",
    record: active
      ? "border-red-400/50 bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]"
      : "border-white/10 bg-[#1a1a24] text-red-300 hover:bg-red-500/20 hover:text-red-200",
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={subtitle ?? label}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${showLabel ? "h-9 px-3" : "h-9 min-w-9"} ${styles[variant]}`}
    >
      {children}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

export function TransportBar({
  isRecording,
  isPlaying,
  isProducing,
  isExporting,
  masterBpm,
  armedTrackLabel,
  canPlay,
  canRecord,
  onPlay,
  onStop,
  onRecordStart,
  onRecordStop,
}: TransportBarProps) {
  const disabled = isProducing || isExporting;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#12121a] px-4 py-3">
      <div className="flex items-center gap-1.5">
        <TransportButton
          label="Play all"
          subtitle="Play every unmuted track together"
          variant="play"
          active={isPlaying}
          disabled={disabled || !canPlay}
          showLabel
          onClick={onPlay}
        >
          ▶
        </TransportButton>
        <TransportButton
          label="Stop"
          subtitle="Stop playback and recording"
          disabled={disabled}
          showLabel
          onClick={onStop}
        >
          ■
        </TransportButton>
        <TransportButton
          label={isRecording ? "Stop recording" : "Record"}
          subtitle={
            isRecording
              ? "Finish the take on the armed track"
              : `Capture audio on ${armedTrackLabel}`
          }
          variant="record"
          active={isRecording}
          disabled={disabled || !canRecord}
          showLabel
          onClick={isRecording ? onRecordStop : onRecordStart}
        >
          ●
        </TransportButton>
      </div>

      <div className="hidden h-6 w-px bg-white/10 sm:block" />

      <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-wider text-zinc-500">
        <span>
          BPM{" "}
          <span className="text-zinc-200">{masterBpm ?? "—"}</span>
        </span>
        <span>
          Recording on{" "}
          <span className="text-red-300">{armedTrackLabel}</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {isRecording && <span className="animate-pulse text-red-400">Recording</span>}
        {isProducing && <span className="text-violet-300">Producing</span>}
        {!isRecording && !isProducing && <span>Ready</span>}
      </div>
    </div>
  );
}
