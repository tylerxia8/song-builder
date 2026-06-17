"use client";

import { useStudio } from "@/store/project-store";

export function TransportPanel() {
  const {
    project,
    state,
    armedTrack,
    play,
    stop,
    startRecording,
    stopRecording,
    toggleLoop,
    toggleMetronome,
    setBpm,
    exportWav,
    exportMp3,
  } = useStudio();

  const isRecording = state.transport.isRecording;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#12121a] px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={isRecording}
          onClick={() => void play()}
          className="rounded-md border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-40"
        >
          ▶ Play
        </button>
        <button
          type="button"
          onClick={isRecording ? () => void stopRecording() : stop}
          className="rounded-md border border-white/10 bg-[#1a1a24] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-[#232330]"
        >
          ■ {isRecording ? "Save take" : "Stop"}
        </button>
        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            title={
              armedTrack
                ? `Record onto ${armedTrack.name}`
                : "Arm a track for recording first"
            }
            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
              armedTrack
                ? "border-red-400/40 bg-red-600 text-white hover:bg-red-500"
                : "border-white/10 bg-[#1a1a24] text-zinc-400"
            }`}
          >
            ● Record
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stopRecording()}
            className="rounded-md border border-red-400/50 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-100 shadow-[0_0_16px_rgba(239,68,68,0.25)]"
          >
            ● Recording…
          </button>
        )}
        <button
          type="button"
          disabled={isRecording}
          onClick={toggleLoop}
          className={`rounded-md border px-3 py-2 text-xs font-semibold transition disabled:opacity-40 ${
            project.loopEnabled
              ? "border-violet-400/40 bg-violet-500/20 text-violet-200"
              : "border-white/10 bg-[#1a1a24] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Loop
        </button>
        <button
          type="button"
          disabled={isRecording}
          onClick={toggleMetronome}
          className={`rounded-md border px-3 py-2 text-xs font-semibold transition disabled:opacity-40 ${
            project.metronomeEnabled
              ? "border-sky-400/40 bg-sky-500/20 text-sky-200"
              : "border-white/10 bg-[#1a1a24] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Click
        </button>
      </div>

      <div className="hidden h-7 w-px bg-white/10 sm:block" />

      <div className="text-xs text-zinc-400">
        {armedTrack ? (
          <>
            Armed: <span className="font-semibold text-red-300">{armedTrack.name}</span>
          </>
        ) : (
          <span className="text-zinc-500">No track armed for recording</span>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-400">
        BPM
        <input
          type="number"
          min={40}
          max={220}
          value={Math.round(project.bpm)}
          disabled={isRecording}
          onChange={(event) => setBpm(Number(event.target.value))}
          className="w-16 rounded border border-white/10 bg-[#0b0b10] px-2 py-1 font-mono text-sm text-white outline-none focus:border-violet-500/40 disabled:opacity-40"
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled={isRecording}
          onClick={() => void exportWav()}
          className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/5 disabled:opacity-40"
        >
          Export WAV
        </button>
        <button
          type="button"
          disabled={isRecording}
          onClick={() => void exportMp3()}
          className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/5 disabled:opacity-40"
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
