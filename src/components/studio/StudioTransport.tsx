"use client";

import { beatToTransportTime } from "@/types/project";
import { useStudio } from "@/store/project-store";

export function StudioTransport() {
  const {
    project,
    state,
    play,
    stop,
    recordVocal,
    stopRecording,
    toggleLoop,
    toggleMetronome,
    setBpm,
    setMixBalance,
    polishSelectedVocal,
    selectedClip,
    duplicateSelectedClip,
    splitSelectedClip,
    deleteSelectedClip,
  } = useStudio();

  const isRecording = state.transport.isRecording;
  const canPolish = selectedClip?.kind === "audio";
  const splitBeat = state.transport.currentBeat;
  const canSplit =
    selectedClip != null &&
    splitBeat > selectedClip.startBeat + 1 &&
    splitBeat < selectedClip.startBeat + selectedClip.durationBeat - 1;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--sf-border)] bg-[var(--sf-panel-2)] px-3 py-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isRecording}
          onClick={() => void play()}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--sf-success)] text-sm font-bold text-white hover:brightness-110 disabled:opacity-40"
          title="Play"
        >
          ▶
        </button>
        <button
          type="button"
          onClick={isRecording ? () => void stopRecording() : stop}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--sf-border)] bg-[var(--sf-panel)] text-sm text-[var(--sf-text-muted)] hover:text-white"
          title={isRecording ? "Save take" : "Stop"}
        >
          ■
        </button>
        <button
          type="button"
          onClick={() => void recordVocal()}
          className={`flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold ${
            isRecording
              ? "bg-[var(--sf-danger)]/20 text-red-200 ring-1 ring-red-400/40"
              : "bg-[var(--sf-danger)] text-white hover:brightness-110"
          }`}
          title="Record audio"
        >
          {isRecording ? "● Rec" : "●"}
        </button>
      </div>

      <div className="mx-1 hidden h-7 w-px bg-[var(--sf-border)] sm:block" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isRecording}
          onClick={toggleLoop}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
            project.loopEnabled
              ? "bg-[var(--sf-accent-soft)] text-[var(--sf-accent)]"
              : "text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-3)] hover:text-white"
          }`}
        >
          Loop
        </button>
        <button
          type="button"
          disabled={isRecording}
          onClick={toggleMetronome}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
            project.metronomeEnabled
              ? "bg-[var(--sf-accent-soft)] text-[var(--sf-accent)]"
              : "text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-3)] hover:text-white"
          }`}
        >
          Click
        </button>
      </div>

      <div className="mx-1 hidden h-7 w-px bg-[var(--sf-border)] md:block" />

      <div className="flex items-center gap-2 rounded-md border border-[var(--sf-border)] bg-[var(--sf-panel)] px-2 py-1">
        <span className="font-mono text-xs text-white">
          {beatToTransportTime(state.transport.currentBeat)}
        </span>
        <span className="text-[var(--sf-text-muted)]">/</span>
        <label className="flex items-center gap-1 text-xs text-[var(--sf-text-muted)]">
          BPM
          <input
            type="number"
            min={40}
            max={220}
            value={Math.round(project.bpm)}
            disabled={isRecording}
            onChange={(event) => setBpm(Number(event.target.value))}
            className="w-12 rounded border border-[var(--sf-border)] bg-[var(--sf-bg)] px-1 py-0.5 font-mono text-xs text-white outline-none focus:border-[var(--sf-accent)] disabled:opacity-40"
          />
        </label>
      </div>

      <div className="mx-1 hidden h-7 w-px bg-[var(--sf-border)] lg:block" />

      <div className="hidden items-center gap-1 lg:flex">
        <button
          type="button"
          disabled={!selectedClip || isRecording}
          onClick={duplicateSelectedClip}
          className="rounded-md px-2 py-1.5 text-xs text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-3)] hover:text-white disabled:opacity-40"
          title="Duplicate clip"
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={!canSplit || isRecording}
          onClick={() => splitSelectedClip(splitBeat)}
          className="rounded-md px-2 py-1.5 text-xs text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-3)] hover:text-white disabled:opacity-40"
          title="Split at playhead"
        >
          Split
        </button>
        <button
          type="button"
          disabled={!selectedClip || isRecording}
          onClick={deleteSelectedClip}
          className="rounded-md px-2 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40"
          title="Delete clip"
        >
          Delete
        </button>
        <button
          type="button"
          disabled={isRecording || !canPolish}
          onClick={() => void polishSelectedVocal()}
          className="rounded-md px-2 py-1.5 text-xs text-[var(--sf-accent)] hover:bg-[var(--sf-accent-soft)] disabled:opacity-40"
        >
          Polish
        </button>
      </div>

      <label className="ml-auto hidden items-center gap-2 text-xs text-[var(--sf-text-muted)] md:flex">
        Mix
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.55}
          disabled={isRecording}
          onChange={(event) => setMixBalance(Number(event.target.value))}
          className="w-20 accent-[var(--sf-accent)]"
        />
      </label>

      {state.transport.isPlaying ? (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sf-success)]">
          Playing
        </span>
      ) : null}
    </div>
  );
}
