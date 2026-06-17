"use client";

interface TimelineRulerProps {
  bpm: number;
  durationSec: number;
  playheadSec?: number | null;
}

export function TimelineRuler({ bpm, durationSec, playheadSec = null }: TimelineRulerProps) {
  const beatDuration = 60 / bpm;
  const barDuration = beatDuration * 4;
  const totalBars = Math.max(4, Math.ceil(durationSec / barDuration));
  const markers = Array.from({ length: totalBars + 1 }, (_, index) => index);
  const playheadPercent =
    playheadSec !== null && durationSec > 0
      ? Math.min(100, (playheadSec / durationSec) * 100)
      : null;

  return (
    <div className="relative flex h-8 items-end border-b border-white/10 bg-[#0f0f15] px-2">
      {markers.map((bar) => (
        <div
          key={bar}
          className="relative min-w-[72px] flex-1 border-l border-white/10 pb-1 pl-2"
        >
          <span className="text-[10px] font-mono text-zinc-500">{bar + 1}</span>
          <div className="absolute bottom-0 left-0 top-0 flex w-full">
            {[1, 2, 3].map((beat) => (
              <div
                key={beat}
                className="flex-1 border-l border-white/[0.04]"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      ))}

      {playheadPercent !== null && (
        <div
          className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          style={{ left: `calc(${playheadPercent}% + 8px)` }}
        />
      )}
    </div>
  );
}
