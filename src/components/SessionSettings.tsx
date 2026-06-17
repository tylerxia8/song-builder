"use client";

import { KEY_OPTIONS, type SessionProduceSettings } from "@/lib/mix";

interface SessionSettingsProps {
  settings: SessionProduceSettings;
  detectedBpm: number | null;
  detectedKey: string | null;
  disabled?: boolean;
  onChange: (settings: SessionProduceSettings) => void;
}

export function SessionSettings({
  settings,
  detectedBpm,
  detectedKey,
  disabled,
  onChange,
}: SessionSettingsProps) {
  const update = (partial: Partial<SessionProduceSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Tempo</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={60}
            max={200}
            placeholder={detectedBpm ? String(Math.round(detectedBpm)) : "Auto"}
            value={settings.manualBpm ?? ""}
            disabled={disabled}
            onChange={(event) => {
              const value = event.target.value;
              update({ manualBpm: value ? Number(value) : null });
            }}
            className="w-full rounded border border-white/10 bg-[#0b0b10] px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
          />
          <span className="text-[11px] text-zinc-500">BPM</span>
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Key</span>
        <select
          value={settings.manualKey ?? ""}
          disabled={disabled}
          onChange={(event) =>
            update({
              manualKey: event.target.value ? (event.target.value as typeof settings.manualKey) : null,
            })
          }
          className="rounded border border-white/10 bg-[#0b0b10] px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
        >
          <option value="">{detectedKey ? `Auto (${detectedKey})` : "Auto detect"}</option>
          {KEY_OPTIONS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          Swing {Math.round(settings.swing * 100)}%
        </span>
        <input
          type="range"
          min={0}
          max={0.35}
          step={0.01}
          value={settings.swing}
          disabled={disabled}
          onChange={(event) => update({ swing: Number(event.target.value) })}
          className="mt-2 accent-violet-500"
        />
      </label>

      <div className="flex flex-col justify-end gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={settings.metronomeEnabled}
            disabled={disabled}
            onChange={(event) => update({ metronomeEnabled: event.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-violet-500"
          />
          Metronome while recording
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={settings.autotuneEnabled}
            disabled={disabled}
            onChange={(event) => update({ autotuneEnabled: event.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-violet-500"
          />
          Autotune to key
        </label>
      </div>
    </div>
  );
}
