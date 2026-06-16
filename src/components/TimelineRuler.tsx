"use client";

interface TimelineRulerProps {
  bpm: number;
  durationSec: number;
}

export function TimelineRuler({ bpm, durationSec }: TimelineRulerProps) {
  const beatDuration = 60 / bpm;
  const barDuration = beatDuration * 4;
  const totalBars = Math.max(4, Math.ceil(durationSec / barDuration));
  const markers = Array.from({ length: totalBars + 1 }, (_, index) => index);

  return (
    <div className="flex h-8 items-end border-b border-white/10 bg-[#0f0f15] px-2">
      {markers.map((bar) => (
        <div
          key={bar}
          className="relative flex-1 min-w-[72px] border-l border-white/10 pl-2 pb-1"
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
    </div>
  );
}
