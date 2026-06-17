"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChordSuggestions } from "@/components/ChordSuggestions";
import { MasterBus } from "@/components/MasterBus";
import { ProducerPanel } from "@/components/ProducerPanel";
import { SessionSettings } from "@/components/SessionSettings";
import { TimelineRuler } from "@/components/TimelineRuler";
import { TrackLane } from "@/components/TrackLane";
import { TransportBar } from "@/components/TransportBar";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { exportSongAsMp3, exportSongAsWav } from "@/lib/audio/export";
import { startMetronome } from "@/lib/audio/metronome";
import {
  getPlaybackDuration,
  playSingleTrack,
  playSyncedTracks,
} from "@/lib/audio/playback";
import { produceSongWithSummary, revokeProducedUrls } from "@/lib/audio/produce";
import {
  createDefaultProduceSettings,
  createDefaultSessionMix,
  type SessionMixSettings,
  type SessionProduceSettings,
  type TrackMixSettings,
} from "@/lib/mix";
import { getProducerSuggestions } from "@/lib/producer-advice";
import { createEmptyTracks, TRACK_DEFINITIONS } from "@/lib/tracks";
import type { HarmonyAnalysis, InstrumentId, TrackRecording, TrackType } from "@/lib/types";

export function StudioWorkspace() {
  const [tracks, setTracks] = useState<TrackRecording[]>(() => createEmptyTracks());
  const [activeTrack, setActiveTrack] = useState<TrackType>("melody");
  const [masterBpm, setMasterBpm] = useState<number | null>(null);
  const [harmony, setHarmony] = useState<HarmonyAnalysis | null>(null);
  const [sessionMix, setSessionMix] = useState<SessionMixSettings>(() => createDefaultSessionMix());
  const [produceSettings, setProduceSettings] = useState<SessionProduceSettings>(() =>
    createDefaultProduceSettings(),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadSec, setPlayheadSec] = useState<number | null>(null);
  const [isProducing, setIsProducing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [produceError, setProduceError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const { isRecording, error, startRecording, stopRecording } = useAudioRecorder();
  const stopPlaybackRef = useRef<(() => void) | null>(null);
  const stopMetronomeRef = useRef<(() => void) | null>(null);
  const playheadFrameRef = useRef<number | null>(null);
  const playbackHandleRef = useRef<{
    stop: () => void;
    context: AudioContext;
    masterStart: number;
  } | null>(null);

  const activeDefinition = useMemo(
    () => TRACK_DEFINITIONS.find((track) => track.type === activeTrack)!,
    [activeTrack],
  );

  const recordedCount = tracks.filter((track) => track.audioUrl).length;
  const isProduced = tracks.some((track) => track.status === "ready");
  const tracksRef = useRef(tracks);
  const producerSuggestions = useMemo(
    () => getProducerSuggestions(tracks, isProduced),
    [tracks, isProduced],
  );

  const timelineDuration = useMemo(() => {
    const durations = tracks
      .map((track) => track.duration ?? 0)
      .filter((duration) => duration > 0);
    return Math.max(16, ...durations, 0);
  }, [tracks]);

  const displayBpm = produceSettings.manualBpm ?? masterBpm;
  const displayKey = produceSettings.manualKey ?? harmony?.detectedKey ?? null;

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    return () => {
      stopPlaybackRef.current?.();
      stopMetronomeRef.current?.();
      if (playheadFrameRef.current !== null) {
        cancelAnimationFrame(playheadFrameRef.current);
      }
      tracksRef.current.forEach((track) => {
        if (track.audioUrl) URL.revokeObjectURL(track.audioUrl);
      });
      revokeProducedUrls(tracksRef.current);
    };
  }, []);

  const stopPlayheadAnimation = useCallback(() => {
    if (playheadFrameRef.current !== null) {
      cancelAnimationFrame(playheadFrameRef.current);
      playheadFrameRef.current = null;
    }
    setPlayheadSec(null);
  }, []);

  const startPlayheadAnimation = useCallback(
    (handle: { context: AudioContext; masterStart: number }, durationSec: number) => {
      stopPlayheadAnimation();

      const tick = () => {
        const elapsed = handle.context.currentTime - handle.masterStart;
        if (elapsed >= durationSec) {
          stopPlayheadAnimation();
          return;
        }
        setPlayheadSec(Math.max(0, elapsed));
        playheadFrameRef.current = requestAnimationFrame(tick);
      };

      playheadFrameRef.current = requestAnimationFrame(tick);
    },
    [stopPlayheadAnimation],
  );

  const stopAllPlayback = useCallback(() => {
    stopPlaybackRef.current?.();
    stopPlaybackRef.current = null;
    playbackHandleRef.current = null;
    stopPlayheadAnimation();
    setIsPlaying(false);
  }, [stopPlayheadAnimation]);

  const resetProductionState = useCallback(() => {
    setMasterBpm(null);
    setHarmony(null);
  }, []);

  const updateTrack = useCallback(
    (type: TrackType, updates: Partial<TrackRecording>) => {
      setTracks((current) =>
        current.map((track) => (track.type === type ? { ...track, ...updates } : track)),
      );
    },
    [],
  );

  const updateTrackMix = useCallback((type: TrackType, updates: Partial<TrackMixSettings>) => {
    setSessionMix((current) => ({
      ...current,
      tracks: {
        ...current.tracks,
        [type]: { ...current.tracks[type], ...updates },
      },
    }));
  }, []);

  const handleStartRecording = useCallback(async () => {
    stopAllPlayback();
    stopMetronomeRef.current?.();

    if (produceSettings.metronomeEnabled) {
      const bpm = produceSettings.manualBpm ?? masterBpm ?? 120;
      stopMetronomeRef.current = startMetronome(bpm);
    }

    await startRecording();
  }, [masterBpm, produceSettings.manualBpm, produceSettings.metronomeEnabled, startRecording, stopAllPlayback]);

  const handleStopRecording = useCallback(async () => {
    stopMetronomeRef.current?.();
    stopMetronomeRef.current = null;

    const result = await stopRecording();
    if (!result) return;

    updateTrack(activeTrack, {
      audioBlob: result.blob,
      audioUrl: result.url,
      duration: result.duration,
      status: "recorded",
      syncSettings: null,
      producedAudioUrl: null,
      noteCount: null,
    });
    resetProductionState();
  }, [activeTrack, resetProductionState, stopRecording, updateTrack]);

  const handlePlayTrack = useCallback(
    async (type: TrackType) => {
      const track = tracks.find((item) => item.type === type);
      if (!track?.audioUrl) return;

      stopAllPlayback();
      const mode = track.status === "ready" ? "produced" : "raw";
      const handle = await playSingleTrack(track, mode, sessionMix);
      if (!handle) return;

      playbackHandleRef.current = handle;
      stopPlaybackRef.current = () => {
        handle.stop();
        stopPlayheadAnimation();
      };
      setIsPlaying(true);
      startPlayheadAnimation(handle, track.duration ?? timelineDuration);
    },
    [sessionMix, startPlayheadAnimation, stopAllPlayback, stopPlayheadAnimation, timelineDuration, tracks],
  );

  const handleClearTrack = useCallback(
    (type: TrackType) => {
      const track = tracks.find((item) => item.type === type);
      if (track?.audioUrl) URL.revokeObjectURL(track.audioUrl);
      if (track?.producedAudioUrl) URL.revokeObjectURL(track.producedAudioUrl);

      updateTrack(type, {
        audioBlob: null,
        audioUrl: null,
        duration: null,
        status: "empty",
        syncSettings: null,
        producedAudioUrl: null,
        noteCount: null,
        instrument: TRACK_DEFINITIONS.find((item) => item.type === type)!.defaultInstrument,
      });
      resetProductionState();
    },
    [resetProductionState, tracks, updateTrack],
  );

  const handleInstrumentChange = useCallback(
    (type: TrackType, instrument: InstrumentId) => {
      const track = tracks.find((item) => item.type === type);
      if (track?.producedAudioUrl) {
        URL.revokeObjectURL(track.producedAudioUrl);
      }

      updateTrack(type, {
        instrument,
        status: track?.audioBlob ? "recorded" : "empty",
        syncSettings: null,
        producedAudioUrl: null,
        noteCount: null,
      });
      resetProductionState();
    },
    [resetProductionState, tracks, updateTrack],
  );

  const handleTransportPlay = useCallback(async () => {
    if (recordedCount === 0) return;
    stopAllPlayback();

    const mode = isProduced ? "produced" : "raw";
    const handle = await playSyncedTracks(tracks, mode, sessionMix);
    playbackHandleRef.current = handle;
    stopPlaybackRef.current = () => {
      handle.stop();
      stopPlayheadAnimation();
    };
    setIsPlaying(true);

    const duration = getPlaybackDuration(tracks, mode, sessionMix);
    startPlayheadAnimation(handle, duration || timelineDuration);
  }, [
    isProduced,
    recordedCount,
    sessionMix,
    startPlayheadAnimation,
    stopAllPlayback,
    stopPlayheadAnimation,
    timelineDuration,
    tracks,
  ]);

  const handleAutofitAndProduce = useCallback(async () => {
    if (recordedCount === 0 || isProducing) return;

    stopAllPlayback();
    setIsProducing(true);
    setProduceError(null);
    setExportError(null);

    setTracks((current) =>
      current.map((track) =>
        track.audioBlob ? { ...track, status: "processing" as const } : track,
      ),
    );

    try {
      revokeProducedUrls(tracksRef.current);
      const { result, warnings } = await produceSongWithSummary(tracksRef.current, {
        autotuneEnabled: produceSettings.autotuneEnabled,
        manualBpm: produceSettings.manualBpm,
        manualKey: produceSettings.manualKey,
        swing: produceSettings.swing,
      });
      setTracks(result.tracks);
      setMasterBpm(result.masterBpm);
      setHarmony(result.harmony);

      if (warnings.length > 0) {
        setProduceError(
          `Produced with adjustments: ${warnings.slice(0, 2).join(" ")}${
            warnings.length > 2 ? " …" : ""
          }`,
        );
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Production failed unexpectedly.";
      setProduceError(`${message} Try recording again, or use shorter 5–15s takes.`);
      setTracks((current) =>
        current.map((track) =>
          track.audioBlob && track.status === "processing"
            ? { ...track, status: "recorded" as const }
            : track,
        ),
      );
    } finally {
      setIsProducing(false);
    }
  }, [isProducing, produceSettings, recordedCount, stopAllPlayback]);

  const handleExport = useCallback(
    async (format: "wav" | "mp3") => {
      if (!isProduced || isExporting) return;

      stopAllPlayback();
      setIsExporting(true);
      setExportError(null);

      try {
        if (format === "wav") {
          await exportSongAsWav(tracksRef.current, sessionMix);
        } else {
          await exportSongAsMp3(tracksRef.current, sessionMix);
        }
      } catch {
        setExportError("Export failed. Produce your song first, then try again.");
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting, isProduced, sessionMix, stopAllPlayback],
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b10] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#12121a] px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-300"
          >
            SongBuilder
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-white">Untitled Session</h1>
            <p className="text-[11px] text-zinc-500">Voice-first producer · mixer · beat grid</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
          <span className="rounded border border-white/10 px-2 py-1">
            {displayKey ?? "Key —"}
          </span>
          <span className="rounded border border-white/10 px-2 py-1">
            {displayBpm ? `${Math.round(displayBpm)} BPM` : "BPM —"}
          </span>
        </div>
      </header>

      <TransportBar
        isRecording={isRecording}
        isPlaying={isPlaying}
        isProducing={isProducing}
        isExporting={isExporting}
        masterBpm={displayBpm}
        armedTrackLabel={activeDefinition.label}
        canPlay={recordedCount > 0}
        canRecord={!isProducing && !isExporting}
        onPlay={handleTransportPlay}
        onStop={stopAllPlayback}
        onRecordStart={handleStartRecording}
        onRecordStop={handleStopRecording}
      />

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <ProducerPanel suggestions={producerSuggestions} />

      <div className="border-b border-white/10 bg-[#101018] px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Session Settings
        </p>
        <SessionSettings
          settings={produceSettings}
          detectedBpm={masterBpm}
          detectedKey={harmony?.detectedKey ?? null}
          disabled={isProducing || isExporting}
          onChange={(settings) => {
            const affectsProduction =
              settings.manualBpm !== produceSettings.manualBpm ||
              settings.manualKey !== produceSettings.manualKey ||
              settings.swing !== produceSettings.swing ||
              settings.autotuneEnabled !== produceSettings.autotuneEnabled;

            setProduceSettings(settings);
            if (affectsProduction) {
              resetProductionState();
            }
          }}
        />
      </div>

      {harmony && masterBpm && <ChordSuggestions harmony={harmony} masterBpm={masterBpm} />}

      <div className="flex-1 overflow-auto daw-scrollbar">
        <div className="grid grid-cols-[11rem_1fr] border-b border-white/10 sm:grid-cols-[13rem_1fr]">
          <div className="flex items-center border-r border-white/10 bg-[#101018] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Tracks
          </div>
          <TimelineRuler
            bpm={displayBpm ?? 120}
            durationSec={timelineDuration}
            playheadSec={playheadSec}
          />
        </div>

        {TRACK_DEFINITIONS.map((definition) => {
          const recording = tracks.find((track) => track.type === definition.type)!;

          return (
            <TrackLane
              key={definition.type}
              definition={definition}
              recording={recording}
              mix={sessionMix.tracks[definition.type]}
              isArmed={activeTrack === definition.type}
              isRecording={isRecording && activeTrack === definition.type}
              playheadSec={playheadSec}
              timelineDuration={timelineDuration}
              onArm={() => setActiveTrack(definition.type)}
              onPlay={() => handlePlayTrack(definition.type)}
              onClear={() => handleClearTrack(definition.type)}
              onInstrumentChange={(instrument) =>
                handleInstrumentChange(definition.type, instrument)
              }
              onMixChange={updateTrackMix}
            />
          );
        })}
      </div>

      <MasterBus
        masterVolume={sessionMix.masterVolume}
        recordedCount={recordedCount}
        totalTracks={tracks.length}
        isProduced={isProduced}
        isProducing={isProducing}
        isExporting={isExporting}
        produceError={produceError}
        exportError={exportError}
        onMasterVolumeChange={(masterVolume) =>
          setSessionMix((current) => ({ ...current, masterVolume }))
        }
        onProduce={handleAutofitAndProduce}
        onExportWav={() => handleExport("wav")}
        onExportMp3={() => handleExport("mp3")}
      />
    </div>
  );
}
