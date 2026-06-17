"use client";

import { useStudio } from "@/store/project-store";

export function ClipToolbar() {
  const { selectedClip, state, duplicateSelectedClip, splitSelectedClip, deleteSelectedClip } =
    useStudio();

  if (!selectedClip) {
    return (
      <p className="text-[11px] text-zinc-500">
        Select a clip to move, trim, duplicate, or split.
      </p>
    );
  }

  const splitBeat = state.transport.currentBeat;
  const canSplit =
    splitBeat > selectedClip.startBeat + 1 &&
    splitBeat < selectedClip.startBeat + selectedClip.durationBeat - 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-white">{selectedClip.name}</span>
      <span className="text-[11px] text-zinc-500">
        Bar {Math.floor(selectedClip.startBeat / 4) + 1} · {selectedClip.durationBeat} beats
      </span>

      <div className="ml-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={duplicateSelectedClip}
          className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/5"
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={!canSplit}
          onClick={() => splitSelectedClip(splitBeat)}
          title={
            canSplit
              ? "Split clip at playhead"
              : "Move playhead inside the clip to split"
          }
          className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/5 disabled:opacity-40"
        >
          Split at playhead
        </button>
        <button
          type="button"
          onClick={deleteSelectedClip}
          className="rounded-md border border-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-200 transition hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
