"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AudioEngine } from "@/engine/audio-engine";
import { StudioProvider, useStudio, useStudioHydrationGate, useStudioTransportSync } from "@/store/project-store";
import { ArrangementView } from "./ArrangementView";
import { BottomEditor } from "./BottomEditor";
import { LibraryPanel } from "./LibraryPanel";
import { StudioHeader } from "./StudioHeader";
import { StudioTransport } from "./StudioTransport";

function StudioBoot() {
  const searchParams = useSearchParams();
  const { isHydrated, newProject } = useStudio();

  useEffect(() => {
    if (!isHydrated) return;
    if (searchParams.get("new") === "1") {
      newProject();
    }
  }, [isHydrated, newProject, searchParams]);

  return null;
}

function StudioInner() {
  useStudioTransportSync();

  return useStudioHydrationGate(
    <>
      <StudioBoot />
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--sf-bg)] text-[var(--sf-text)]">
        <StudioHeader />
        <StudioTransport />
        <div className="flex min-h-0 flex-1">
          <LibraryPanel />
          <div className="flex min-w-0 flex-1 flex-col">
            <ArrangementView />
            <BottomEditor />
          </div>
        </div>
      </div>
    </>,
  );
}

export function ProStudio() {
  const engine = useMemo(() => AudioEngine.getInstance(), []);

  const engineSync = useCallback(
    (project: Parameters<typeof engine.syncProject>[0], masterVolume: number) => {
      engine.syncProject(project);
      engine.setMasterVolume(masterVolume);
    },
    [engine],
  );

  const enginePlay = useCallback(
    async (project: Parameters<typeof engine.play>[0], fromBeat: number) => {
      await engine.play(project, fromBeat);
    },
    [engine],
  );

  const engineStop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const engineSetMasterVolume = useCallback(
    (value: number) => {
      engine.setMasterVolume(value);
    },
    [engine],
  );

  const engineSetPositionListener = useCallback(
    (listener: ((beat: number) => void) | null) => {
      engine.setPositionListener(listener);
    },
    [engine],
  );

  const engineExport = useCallback(
    async (
      project: Parameters<typeof engine.renderOffline>[0],
      masterVolume: number,
      soloTrackId?: string | null,
    ) => {
      const bars = Math.max(
        4,
        ...project.tracks.flatMap((track) =>
          track.clips.map((clip) => (clip.startBeat + clip.durationBeat) / 4),
        ),
      );
      return engine.renderOffline(project, Math.ceil(bars), masterVolume, soloTrackId);
    },
    [engine],
  );

  const enginePreviewNote = useCallback(
    async (track: Parameters<typeof engine.previewNote>[0], pitch: number, velocity?: number) => {
      await engine.previewNote(track, pitch, velocity);
    },
    [engine],
  );

  const engineSeek = useCallback(
    (beat: number) => {
      engine.seekTo(beat);
    },
    [engine],
  );

  useEffect(() => {
    return () => {
      engine.stop();
      engine.setPositionListener(null);
    };
  }, [engine]);

  return (
    <StudioProvider
      enginePlay={enginePlay}
      engineStop={engineStop}
      engineSync={engineSync}
      engineSetMasterVolume={engineSetMasterVolume}
      engineSetPositionListener={engineSetPositionListener}
      engineExport={engineExport}
      enginePreviewNote={enginePreviewNote}
      engineSeek={engineSeek}
    >
      <StudioInner />
    </StudioProvider>
  );
}
