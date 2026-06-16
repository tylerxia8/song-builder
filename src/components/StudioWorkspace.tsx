"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RecordButton } from "@/components/RecordButton";
import { TrackCard } from "@/components/TrackCard";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { createEmptyTracks, TRACK_DEFINITIONS } from "@/lib/tracks";
import type { TrackRecording, TrackType } from "@/lib/types";

export function StudioWorkspace() {
  const [tracks, setTracks] = useState<TrackRecording[]>(() => createEmptyTracks());
  const [activeTrack, setActiveTrack] = useState<TrackType>("melody");
  const { isRecording, error, startRecording, stopRecording } = useAudioRecorder();
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  const activeDefinition = useMemo(
    () => TRACK_DEFINITIONS.find((track) => track.type === activeTrack)!,
    [activeTrack],
  );

  const recordedCount = tracks.filter((track) => track.audioUrl).length;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  useEffect(() => {
    return () => {
      tracksRef.current.forEach((track) => {
        if (track.audioUrl) {
          URL.revokeObjectURL(track.audioUrl);
        }
      });
    };
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
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    const result = await stopRecording();
    if (!result) return;

    updateTrack(activeTrack, {
      audioBlob: result.blob,
      audioUrl: result.url,
      duration: result.duration,
      status: "recorded",
    });
  }, [activeTrack, stopRecording, updateTrack]);

  const handlePlayTrack = useCallback(
    (type: TrackType) => {
      const track = tracks.find((item) => item.type === type);
      if (!track?.audioUrl) return;

      if (playbackRef.current) {
        playbackRef.current.pause();
      }

      const audio = new Audio(track.audioUrl);
      playbackRef.current = audio;
      void audio.play();
    },
    [tracks],
  );

  const handleClearTrack = useCallback(
    (type: TrackType) => {
      const track = tracks.find((item) => item.type === type);
      if (track?.audioUrl) {
        URL.revokeObjectURL(track.audioUrl);
      }

      updateTrack(type, {
        audioBlob: null,
        audioUrl: null,
        duration: null,
        status: "empty",
      });
    },
    [tracks, updateTrack],
  );

  const handlePlayAll = useCallback(() => {
    const recordedTracks = tracks.filter((track) => track.audioUrl);
    if (recordedTracks.length === 0) return;

    recordedTracks.forEach((track) => {
      const audio = new Audio(track.audioUrl!);
      void audio.play();
    });
  }, [tracks]);

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
          Select a layer, hit record, and capture your idea by voice. Build melody, bass, drums,
          and harmony one sketch at a time.
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
          </div>

          <RecordButton
            isRecording={isRecording}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            {recordedCount} of {tracks.length} layers captured
          </p>
          <button
            type="button"
            disabled={recordedCount === 0}
            onClick={handlePlayAll}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Preview all layers
          </button>
        </div>
      </section>
    </div>
  );
}
