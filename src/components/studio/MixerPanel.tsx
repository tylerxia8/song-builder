"use client";

import { useStudio } from "@/store/project-store";

export function MixerPanel() {
  const { project, updateTrackMix, setMasterVolume, state } = useStudio();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-white/10 bg-[#101018]">
      <div className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Mixer
      </div>

      <div className="flex-1 overflow-auto p-3 daw-scrollbar">
        <div className="mb-4 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-violet-300">Master</p>
          <label className="mt-2 block text-[11px] text-zinc-400">
            Volume {Math.round(state.masterVolume * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.masterVolume}
              onChange={(event) => setMasterVolume(Number(event.target.value))}
              className="mt-2 w-full accent-violet-500"
            />
          </label>
        </div>

        <div className="space-y-3">
          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="rounded-lg border border-white/10 bg-[#0d0d14] p-3"
              style={{ boxShadow: `inset 2px 0 0 0 ${track.color}` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-white">{track.name}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => updateTrackMix(track.id, { muted: !track.muted })}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      track.muted ? "bg-amber-500/20 text-amber-200" : "text-zinc-500"
                    }`}
                  >
                    Mute
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTrackMix(track.id, { solo: !track.solo })}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      track.solo ? "bg-sky-500/20 text-sky-200" : "text-zinc-500"
                    }`}
                  >
                    Solo
                  </button>
                </div>
              </div>

              <label className="mt-3 block text-[10px] text-zinc-500">
                Vol {Math.round(track.volume * 100)}%
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={track.volume}
                  onChange={(event) =>
                    updateTrackMix(track.id, { volume: Number(event.target.value) })
                  }
                  className="mt-1 w-full accent-violet-500"
                />
              </label>

              <label className="mt-2 block text-[10px] text-zinc-500">
                Pan
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={track.pan}
                  onChange={(event) =>
                    updateTrackMix(track.id, { pan: Number(event.target.value) })
                  }
                  className="mt-1 w-full accent-violet-500"
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
