"use client";

import { useStudio } from "@/store/project-store";

export function RecordPanel() {
  const {
    project,
    state,
    armedTrack,
    recordError,
    setupRecordingTrack,
    startRecording,
    stopRecording,
  } = useStudio();

  const isRecording = state.transport.isRecording;
  const step1Done = project.tracks.some((track) => track.kind === "audio" || track.armed);
  const step2Done = Boolean(armedTrack);
  const step3Active = isRecording;

  return (
    <section className="rounded-lg border border-red-500/20 bg-gradient-to-b from-red-500/10 to-[#0d0d14] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300">
            Record your part
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">
            Sing, hum, or beatbox into an audio lane. Your take appears as a clip on the timeline.
          </p>
        </div>
        {isRecording && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            Live
          </span>
        )}
      </div>

      <ol className="mt-3 space-y-2 text-[11px] text-zinc-400">
        <li className={step1Done ? "text-emerald-300" : ""}>
          <span className="font-semibold text-zinc-200">1.</span> Add a voice lane (or use an
          existing audio track)
        </li>
        <li className={step2Done ? "text-emerald-300" : ""}>
          <span className="font-semibold text-zinc-200">2.</span> Arm the track you want to record on
        </li>
        <li className={step3Active ? "text-red-200" : ""}>
          <span className="font-semibold text-zinc-200">3.</span> Press Record, perform, then Stop
        </li>
      </ol>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          disabled={isRecording}
          onClick={() => setupRecordingTrack("My Voice")}
          className="rounded-md border border-white/10 bg-[#15151f] px-3 py-2 text-left text-xs font-semibold text-zinc-100 transition hover:border-red-400/30 hover:bg-red-500/10 disabled:opacity-40"
        >
          + Set up voice track
          <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">
            Creates an audio lane and arms it for you
          </span>
        </button>

        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="rounded-md bg-red-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-red-500"
          >
            ● Start recording
            {armedTrack ? (
              <span className="mt-0.5 block text-[10px] font-normal text-red-100/90">
                On track: {armedTrack.name}
              </span>
            ) : (
              <span className="mt-0.5 block text-[10px] font-normal text-red-100/90">
                Arm a track first
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stopRecording()}
            className="rounded-md border border-red-400/40 bg-red-500/20 px-3 py-2.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/30"
          >
            ■ Stop &amp; save take
          </button>
        )}
      </div>

      {armedTrack && !isRecording && (
        <p className="mt-2 text-[10px] text-zinc-500">
          Tip: enable <span className="text-zinc-300">Click</span> in the transport bar for a
          metronome while you record.
        </p>
      )}

      {recordError && (
        <p className="mt-2 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">
          {recordError}
        </p>
      )}
    </section>
  );
}
