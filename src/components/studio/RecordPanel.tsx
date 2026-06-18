"use client";

import { useStudio } from "@/store/project-store";

export function RecordPanel() {
  const {
    project,
    state,
    armedTrack,
    recordError,
    armTrack,
    recordVocal,
  } = useStudio();

  const isRecording = state.transport.isRecording;
  const audioTracks = project.tracks.filter((track) => track.kind === "audio");

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-white">Record vocal</p>
        <p className="mt-1 text-[11px] text-zinc-500">
          One button — creates a vocal track if needed, then records at the playhead.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void recordVocal()}
        className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition ${
          isRecording
            ? "border border-red-400/50 bg-red-500/20 text-red-100"
            : "bg-red-600 text-white hover:bg-red-500"
        }`}
      >
        {isRecording ? "■ Save take" : "● Record vocal"}
      </button>

      {audioTracks.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {audioTracks.map((track) => (
            <button
              key={track.id}
              type="button"
              disabled={isRecording}
              onClick={() => armTrack(track.id)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition disabled:opacity-40 ${
                armedTrack?.id === track.id
                  ? "border-red-400/50 bg-red-500/15 text-red-200"
                  : "border-white/10 text-zinc-400 hover:border-white/20"
              }`}
            >
              {track.name}
            </button>
          ))}
        </div>
      ) : null}

      {armedTrack && !isRecording ? (
        <p className="text-[10px] text-zinc-500">
          Recording to <span className="text-zinc-300">{armedTrack.name}</span>. Enable Click in
          transport for a metronome.
        </p>
      ) : null}

      {recordError ? (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">
          {recordError}
        </p>
      ) : null}
    </section>
  );
}
