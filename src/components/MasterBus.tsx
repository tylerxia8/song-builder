"use client";

interface MasterBusProps {
  masterVolume: number;
  recordedCount: number;
  totalTracks: number;
  isProduced: boolean;
  isProducing: boolean;
  isExporting: boolean;
  produceError: string | null;
  exportError: string | null;
  onMasterVolumeChange: (volume: number) => void;
  onProduce: () => void;
  onExportWav: () => void;
  onExportMp3: () => void;
}

export function MasterBus({
  masterVolume,
  recordedCount,
  totalTracks,
  isProduced,
  isProducing,
  isExporting,
  produceError,
  exportError,
  onMasterVolumeChange,
  onProduce,
  onExportWav,
  onExportMp3,
}: MasterBusProps) {
  const disabled = isProducing || isExporting;

  return (
    <div className="border-t border-white/10 bg-[#12121a]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Master Bus
        </span>
        <span className="text-[11px] text-zinc-600">
          {recordedCount}/{totalTracks} tracks · mixer · mixdown · export
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-3">
          <label className="flex max-w-xs flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Master volume {Math.round(masterVolume * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              disabled={disabled}
              onChange={(event) => onMasterVolumeChange(Number(event.target.value))}
              className="accent-violet-500"
            />
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
            {isProducing ? "Producing…" : "Mix & Produce (on beat)"}
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
