"use client";

import { useStudio } from "@/store/project-store";
import { BEATS_PER_BAR } from "@/types/project";

function formatTime(beat: number, bpm: number) {
  const bar = Math.floor(beat / BEATS_PER_BAR) + 1;
  const beatInBar = Math.floor(beat % BEATS_PER_BAR) + 1;
  const seconds = (beat * 60) / bpm;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return {
    musical: `${bar}.${beatInBar}.1`,
    clock: `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`,
  };
}

export function TransportPanel() {
  const {
    project,
    state,
    play,
    stop,
    toggleLoop,
    toggleMetronome,
    setBpm,
    exportWav,
    exportMp3,
  } = useStudio();

  const time = formatTime(state.transport.currentBeat, project.bpm);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#12121a] px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void play()}
          className="rounded-md border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
        >
          ▶ Play
        </button>
        <button
          type="button"
          onClick={stop}
          className="rounded-md border border-white/10 bg-[#1a1a24] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-[#232330]"
        >
          ■ Stop
        </button>
        <button
          type="button"
          onClick={toggleLoop}
          className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
            project.loopEnabled
              ? "border-violet-400/40 bg-violet-500/20 text-violet-200"
              : "border-white/10 bg-[#1a1a24] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Loop
        </button>
        <button
          type="button"
          onClick={toggleMetronome}
          className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
            project.metronomeEnabled
              ? "border-sky-400/40 bg-sky-500/20 text-sky-200"
              : "border-white/10 bg-[#1a1a24] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Click
        </button>
      </div>

      <div className="hidden h-7 w-px bg-white/10 sm:block" />

      <label className="flex items-center gap-2 text-xs text-zinc-400">
        BPM
        <input
          type="number"
          min={40}
          max={220}
          value={Math.round(project.bpm)}
          onChange={(event) => setBpm(Number(event.target.value))}
          className="w-16 rounded border border-white/10 bg-[#0b0b10] px-2 py-1 font-mono text-sm text-white outline-none focus:border-violet-500/40"
        />
      </label>

      <div className="font-mono text-xs text-zinc-300">
        <span className="text-zinc-500">Position </span>
        {time.musical}
        <span className="mx-2 text-zinc-600">|</span>
        {time.clock}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => void exportWav()}
          className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/5"
        >
          Export WAV
        </button>
        <button
          type="button"
          onClick={() => void exportMp3()}
          className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/5"
        >
          Export MP3
        </button>
        {state.transport.isPlaying && (
          <span className="animate-pulse text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Playing
          </span>
        )}
      </div>
    </div>
  );
}
