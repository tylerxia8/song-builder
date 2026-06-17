"use client";

import { useCallback, useEffect, useMemo } from "react";
import { AudioEngine } from "@/engine/audio-engine";
import { StudioProvider, useStudio, useStudioHydrationGate, useStudioTransportSync } from "@/store/project-store";
import { MakeSongWizard } from "./MakeSongWizard";
import { ArrangementView } from "./ArrangementView";
import { BottomEditor } from "./BottomEditor";
import { BrowserPanel } from "./BrowserPanel";
import { MenuBar } from "./MenuBar";
import { MixerPanel } from "./MixerPanel";
import { TransportPanel } from "./TransportPanel";

function StudioInner() {
  useStudioTransportSync();
  const { viewMode } = useStudio();

  if (viewMode === "guided") {
    return useStudioHydrationGate(<MakeSongWizard />);
  }

  return useStudioHydrationGate(
    <div className="flex h-screen flex-col overflow-hidden bg-[#0b0b10] text-white">
      <MenuBar />
      <TransportPanel />
      <div className="flex min-h-0 flex-1">
        <BrowserPanel />
        <div className="flex min-w-0 flex-1 flex-col">
          <ArrangementView />
          <BottomEditor />
        </div>
        <MixerPanel />
      </div>
    </div>,
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
    >
      <StudioInner />
    </StudioProvider>
  );
}
