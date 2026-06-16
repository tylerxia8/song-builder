"use client";

interface MasterBusProps {
  autotuneEnabled: boolean;
  recordedCount: number;
  totalTracks: number;
  isProduced: boolean;
  isProducing: boolean;
  isExporting: boolean;
  produceError: string | null;
  exportError: string | null;
  onAutotuneChange: (enabled: boolean) => void;
  onProduce: () => void;
  onExportWav: () => void;
  onExportMp3: () => void;
}

export function MasterBus({
  autotuneEnabled,
  recordedCount,
  totalTracks,
  isProduced,
  isProducing,
  isExporting,
  produceError,
  exportError,
  onAutotuneChange,
  onProduce,
  onExportWav,
  onExportMp3,
}: MasterBusProps) {
  const disabled = isProducing || isExporting;

  return (
    <div className="border-t border-white/10 bg-[#12121a]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Master Bus
        </span>
        <span className="text-[11px] text-zinc-600">
          {recordedCount}/{totalTracks} tracks · AI mixdown & export
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={autotuneEnabled}
              disabled={disabled}
              onChange={(event) => onAutotuneChange(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-violet-500"
            />
            Autotune to key
          </label>
          {(produceError || exportError) && (
            <p
              className={`text-sm ${
                produceError && isProduced ? "text-amber-300" : "text-red-300"
              }`}
            >
              {produceError || exportError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={recordedCount === 0 || disabled}
            onClick={onProduce}
            className="rounded-md bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isProducing ? "Producing…" : "Mix & Produce"}
          </button>
          <button
            type="button"
            disabled={!isProduced || disabled}
            onClick={onExportWav}
            className="rounded-md border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export WAV
          </button>
          <button
            type="button"
            disabled={!isProduced || disabled}
            onClick={onExportMp3}
            className="rounded-md border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export MP3
          </button>
        </div>
      </div>
    </div>
  );
}
