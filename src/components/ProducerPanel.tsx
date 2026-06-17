"use client";

interface ProducerPanelProps {
  suggestions: string[];
}

export function ProducerPanel({ suggestions }: ProducerPanelProps) {
  return (
    <div className="border-b border-white/10 bg-[#0f0f16] px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm">
          🎛️
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
            Producer Notes
          </p>
          <ul className="mt-2 space-y-1.5">
            {suggestions.map((suggestion) => (
              <li key={suggestion} className="text-sm leading-snug text-zinc-300">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
