"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RecordButton } from "@/components/RecordButton";
import { TrackCard } from "@/components/TrackCard";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { playSingleTrack, playSyncedTracks } from "@/lib/audio/playback";
import { produceSong, revokeProducedUrls } from "@/lib/audio/produce";
import { createEmptyTracks, TRACK_DEFINITIONS } from "@/lib/tracks";
import type { InstrumentId, TrackRecording, TrackType } from "@/lib/types";

export function StudioWorkspace() {
  const [tracks, setTracks] = useState<TrackRecording[]>(() => createEmptyTracks());
  const [activeTrack, setActiveTrack] = useState<TrackType>("melody");
  const [masterBpm, setMasterBpm] = useState<number | null>(null);
  const [isProducing, setIsProducing] = useState(false);
  const [produceError, setProduceError] = useState<string | null>(null);
  const { isRecording, error, startRecording, stopRecording } = useAudioRecorder();
  const stopPlaybackRef = useRef<(() => void) | null>(null);
  const singlePlaybackRef = useRef<HTMLAudioElement | null>(null);

  const activeDefinition = useMemo(
    () => TRACK_DEFINITIONS.find((track) => track.type === activeTrack)!,
    [activeTrack],
  );

  const recordedCount = tracks.filter((track) => track.audioUrl).length;
  const isProduced = tracks.some((track) => track.status === "ready");
  const tracksRef = useRef(tracks);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    return () => {
      stopPlaybackRef.current?.();
      singlePlaybackRef.current?.pause();
      tracksRef.current.forEach((track) => {
        if (track.audioUrl) URL.revokeObjectURL(track.audioUrl);
      });
      revokeProducedUrls(tracksRef.current);
    };
  }, []);

  const stopAllPlayback = useCallback(() => {
    stopPlaybackRef.current?.();
    stopPlaybackRef.current = null;
    singlePlaybackRef.current?.pause();
    singlePlaybackRef.current = null;
  }, []);

  const updateTrack = useCallback(
    (type: TrackType, updates: Partial<TrackRecording>) => {
      setTracks((current) =>
        current.map((track) => (track.type === type ? { ...track, ...updates } : track)),
      );
    },
    [],
  );

  const handleStartRecording = useCallback(async () => {
    stopAllPlayback();
    await startRecording();
  }, [startRecording, stopAllPlayback]);

  const handleStopRecording = useCallback(async () => {
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
    setMasterBpm(null);
  }, [activeTrack, stopRecording, updateTrack]);

  const handlePlayTrack = useCallback(
    async (type: TrackType) => {
      const track = tracks.find((item) => item.type === type);
      if (!track?.audioUrl) return;

      stopAllPlayback();
      const mode = track.status === "ready" ? "produced" : "raw";
      singlePlaybackRef.current = await playSingleTrack(track, mode);
    },
    [tracks, stopAllPlayback],
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
      setMasterBpm(null);
    },
    [tracks, updateTrack],
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
      setMasterBpm(null);
    },
    [tracks, updateTrack],
  );

  const handlePlayRaw = useCallback(async () => {
    stopAllPlayback();
    stopPlaybackRef.current = await playSyncedTracks(tracks, "raw");
  }, [tracks, stopAllPlayback]);

  const handlePlayProduced = useCallback(async () => {
    stopAllPlayback();
    stopPlaybackRef.current = await playSyncedTracks(tracks, "produced");
  }, [tracks, stopAllPlayback]);

  const handleAutofitAndProduce = useCallback(async () => {
    if (recordedCount === 0 || isProducing) return;

    stopAllPlayback();
    setIsProducing(true);
    setProduceError(null);

    setTracks((current) =>
      current.map((track) =>
        track.audioBlob ? { ...track, status: "processing" as const } : track,
      ),
    );

    try {
      revokeProducedUrls(tracksRef.current);
      const result = await produceSong(tracksRef.current);
      setTracks(result.tracks);
      setMasterBpm(result.masterBpm);
    } catch {
      setProduceError("Production failed. Try re-recording with clearer timing.");
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
  }, [isProducing, recordedCount, stopAllPlayback]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-8 pt-6 sm:px-6">
      <header className="mb-8">
        <Link
          href="/"
          className="text-sm font-medium text-violet-300 transition hover:text-violet-200"
        >
          ← SongBuilder
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your studio
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
          Record your layers, pick an instrument for each one, then autofit and produce so
          melodies and beats line up.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
          <span className="font-medium text-white">Idea</span>
          <span aria-hidden="true">→</span>
          <span className="font-medium text-white">Voice</span>
          <span aria-hidden="true">→</span>
          <span className="font-medium text-violet-300">Song</span>
        </div>
      </header>

      <section className="space-y-3">
        {TRACK_DEFINITIONS.map((definition) => {
          const recording = tracks.find((track) => track.type === definition.type)!;

          return (
            <TrackCard
              key={definition.type}
              definition={definition}
              recording={recording}
              isActive={activeTrack === definition.type}
              isRecording={isRecording && activeTrack === definition.type}
              onSelect={() => setActiveTrack(definition.type)}
              onPlay={() => handlePlayTrack(definition.type)}
              onClear={() => handleClearTrack(definition.type)}
              onInstrumentChange={(instrument) =>
                handleInstrumentChange(definition.type, instrument)
              }
            />
          );
        })}
      </section>

      <section className="sticky bottom-0 mt-8 rounded-3xl border border-white/10 bg-[#12121a]/95 p-5 backdrop-blur">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-white">
              Recording {activeDefinition.label}
            </p>
            <p className="mt-1 text-sm text-zinc-400">{activeDefinition.hint}</p>
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            {produceError && <p className="mt-2 text-sm text-red-300">{produceError}</p>}
            {masterBpm && (
              <p className="mt-2 text-sm text-violet-300">
                Autofit complete · ~{masterBpm} BPM
              </p>
            )}
          </div>

          <RecordButton
            isRecording={isRecording}
            disabled={isProducing}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
          />
        </div>

        <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-400">
              {recordedCount} of {tracks.length} layers captured
            </p>
            <button
              type="button"
              disabled={recordedCount === 0}
              onClick={handlePlayRaw}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Preview raw layers
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={recordedCount === 0 || isProducing}
              onClick={handleAutofitAndProduce}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isProducing ? "Autofitting & producing…" : "Autofit & produce"}
            </button>
            <button
              type="button"
              disabled={!isProduced || isProducing}
              onClick={handlePlayProduced}
              className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Play produced song
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
