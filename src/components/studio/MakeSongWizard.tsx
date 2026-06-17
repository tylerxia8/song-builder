"use client";

import { useMemo, useState } from "react";
import {
  detectKeyFromProject,
  melodyToNoteString,
  suggestHookMelody,
  suggestLyrics,
} from "@/lib/ai-assist";
import { SONG_VIBES, WIZARD_STEPS, type SongVibe, type WizardStepId } from "@/lib/song-templates";
import { DEFAULT_VOCAL_POLISH } from "@/lib/vocal-polish";
import { useStudio } from "@/store/project-store";
import type { ExportPreset } from "@/engine/export";
import { RecordPanel } from "./RecordPanel";

export function MakeSongWizard() {
  const {
    project,
    wizardStep,
    setWizardStep,
    loadTemplateForVibe,
    play,
    stop,
    polishSelectedVocal,
    setMixBalance,
    exportPreset,
    exportStems,
    selectedClip,
    state,
    setViewMode,
  } = useStudio();

  const [vibe, setVibe] = useState<SongVibe>("pop");
  const [polishAmount, setPolishAmount] = useState(DEFAULT_VOCAL_POLISH.amount);
  const [mixBalance, setMixBalanceLocal] = useState(0.55);
  const [busy, setBusy] = useState<string | null>(null);

  const vocalClip = useMemo(
    () =>
      project.tracks
        .flatMap((track) => track.clips)
        .find((clip) => clip.kind === "audio" && clip.audioUrl) ?? selectedClip,
    [project.tracks, selectedClip],
  );

  const detectedKey = useMemo(() => project.songKey ?? detectKeyFromProject(project), [project]);
  const lyricIdeas = useMemo(() => suggestLyrics(vibe, detectedKey), [vibe, detectedKey]);
  const hookMelody = useMemo(() => suggestHookMelody(detectedKey), [detectedKey]);

  const stepIndex = WIZARD_STEPS.findIndex((step) => step.id === wizardStep);

  const goNext = () => {
    const next = WIZARD_STEPS[Math.min(WIZARD_STEPS.length - 1, stepIndex + 1)];
    if (next) setWizardStep(next.id);
  };

  const goBack = () => {
    const prev = WIZARD_STEPS[Math.max(0, stepIndex - 1)];
    if (prev) setWizardStep(prev.id);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0b0b10] text-white">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#101018] px-5 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
            Make a Song
          </p>
          <h1 className="text-lg font-semibold">{WIZARD_STEPS[stepIndex]?.title}</h1>
          <p className="text-xs text-zinc-400">{WIZARD_STEPS[stepIndex]?.detail}</p>
        </div>
        <button
          type="button"
          onClick={() => setViewMode("pro")}
          className="rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
        >
          Open Pro Studio
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 border-r border-white/10 bg-[#101018] p-4">
          <ol className="space-y-3">
            {WIZARD_STEPS.map((step, index) => (
              <li
                key={step.id}
                className={`rounded-md px-3 py-2 text-xs ${
                  step.id === wizardStep
                    ? "bg-violet-500/20 text-violet-100"
                    : index < stepIndex
                      ? "text-emerald-300"
                      : "text-zinc-500"
                }`}
              >
                <span className="font-semibold">{index + 1}.</span> {step.title}
              </li>
            ))}
          </ol>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto p-6">
          {wizardStep === "vibe" && (
            <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-3">
              {SONG_VIBES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVibe(item.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    vibe === item.id
                      ? "border-violet-400/50 bg-violet-500/15"
                      : "border-white/10 bg-[#12121a] hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs text-zinc-400">{item.description}</p>
                  <p className="mt-2 text-[10px] text-zinc-500">{item.bpm} BPM</p>
                </button>
              ))}
              <div className="md:col-span-3 rounded-xl border border-white/10 bg-[#12121a] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  AI Assist
                </p>
                <p className="mt-2 text-xs text-zinc-300">Detected key: {detectedKey}</p>
                <p className="mt-2 text-xs text-zinc-400">Hook melody idea: {melodyToNoteString(hookMelody)}</p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                  {lyricIdeas.slice(0, 2).map((line) => (
                    <li key={line}>“{line}”</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {wizardStep === "listen" && (
            <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-white/10 bg-[#12121a] p-6">
              <p className="text-sm text-zinc-300">
                Your bed is loaded at <span className="text-white">{project.bpm} BPM</span> with a{" "}
                {project.loopEndBar - project.loopStartBar}-bar loop.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void play()}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
                >
                  ▶ Play loop
                </button>
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-md border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {wizardStep === "record" && (
            <div className="mx-auto max-w-md">
              <RecordPanel />
            </div>
          )}

          {wizardStep === "polish" && (
            <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-white/10 bg-[#12121a] p-6">
              {vocalClip?.audioUrl ? (
                <>
                  <p className="text-sm text-zinc-300">Polishing: {vocalClip.name}</p>
                  <label className="block text-xs text-zinc-400">
                    Natural
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={polishAmount}
                      onChange={(event) => setPolishAmount(Number(event.target.value))}
                      className="mt-2 w-full accent-violet-400"
                    />
                    Tuned
                  </label>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={async () => {
                      setBusy("Polishing vocal…");
                      try {
                        await polishSelectedVocal(polishAmount);
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
                  >
                    {busy ?? "Polish vocal"}
                  </button>
                  <audio controls src={vocalClip.audioUrl} className="w-full" />
                </>
              ) : (
                <p className="text-sm text-zinc-400">Record a vocal take first, then come back here.</p>
              )}
            </div>
          )}

          {wizardStep === "balance" && (
            <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-white/10 bg-[#12121a] p-6">
              <label className="block text-xs text-zinc-400">
                Beat
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={mixBalance}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setMixBalanceLocal(value);
                    setMixBalance(value);
                  }}
                  className="mt-2 w-full accent-sky-400"
                />
                Vocal
              </label>
              <p className="text-xs text-zinc-500">
                This adjusts vocal vs instrumental levels across the session.
              </p>
            </div>
          )}

          {wizardStep === "export" && (
            <div className="mx-auto grid max-w-xl gap-3">
              {(
                [
                  ["demo-mp3", "Demo MP3", "Quick share, mastered at -16 LUFS"],
                  ["release-wav", "Release WAV", "Streaming-ready stereo WAV at -14 LUFS"],
                  ["stems", "Stem pack", "Download each track as WAV"],
                ] as const
              ).map(([preset, label, detail]) => (
                <button
                  key={preset}
                  type="button"
                  disabled={Boolean(busy) || state.transport.isRecording}
                  onClick={async () => {
                    setBusy(`Exporting ${label}…`);
                    try {
                      if (preset === "stems") await exportStems();
                      else await exportPreset(preset as ExportPreset);
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="rounded-xl border border-white/10 bg-[#12121a] p-4 text-left hover:border-violet-400/40 disabled:opacity-50"
                >
                  <p className="font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-zinc-400">{detail}</p>
                </button>
              ))}
              {busy ? <p className="text-xs text-violet-300">{busy}</p> : null}
            </div>
          )}
        </main>
      </div>

      <footer className="flex items-center justify-between border-t border-white/10 bg-[#101018] px-6 py-3">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={goBack}
          className="rounded-md border border-white/10 px-4 py-2 text-xs disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (wizardStep === "vibe") loadTemplateForVibe(vibe);
            goNext();
          }}
          className="rounded-md bg-violet-600 px-4 py-2 text-xs font-semibold hover:bg-violet-500"
        >
          {stepIndex === WIZARD_STEPS.length - 1 ? "Done" : "Continue"}
        </button>
      </footer>
    </div>
  );
}
