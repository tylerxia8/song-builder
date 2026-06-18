"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAudioBlob } from "@/lib/audio-assets";
import { generateSoulSampleLoop } from "@/lib/kanye-soul-sample";
import {
  computeSlices,
  decodeAudioBlob,
  type SampleSlice,
} from "@/lib/sample-chopper";
import { useStudio } from "@/store/project-store";

export function SampleChopperPanel() {
  const { project, selectedClip, state, placeChopOnTimeline } = useStudio();
  const [sliceCount, setSliceCount] = useState(8);
  const [pitch, setPitch] = useState(0);
  const [reversed, setReversed] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState(0);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("Soul chorus loop");
  const fileRef = useRef<HTMLInputElement>(null);

  const sampleClip = useMemo(() => {
    if (selectedClip?.kind === "audio" && selectedClip.audioUrl) return selectedClip;
    return (
      project.tracks
        .flatMap((track) => track.clips)
        .find((clip) => clip.kind === "audio" && clip.name.toLowerCase().includes("soul")) ??
      project.tracks.flatMap((track) => track.clips).find((clip) => clip.kind === "audio")
    );
  }, [project.tracks, selectedClip]);

  const loadFromClip = useCallback(async (clip = sampleClip) => {
    if (!clip?.audioUrl) return;
    setLoading(true);
    try {
      const blob =
        (clip.audioAssetId ? getAudioBlob(clip.audioAssetId) : undefined) ??
        (await fetch(clip.audioUrl).then((response) => response.blob()));
      if (!blob) return;
      setBuffer(await decodeAudioBlob(blob));
      setSourceLabel(clip.name);
    } finally {
      setLoading(false);
    }
  }, [sampleClip]);

  useEffect(() => {
    void loadFromClip();
  }, [loadFromClip]);

  const slices = useMemo(
    () => (buffer ? computeSlices(buffer.duration, sliceCount) : []),
    [buffer, sliceCount],
  );

  const previewSlice = (slice: SampleSlice) => {
    if (!buffer) return;
    const offline = new AudioContext();
    const start = Math.floor(slice.startSec * buffer.sampleRate);
    const end = Math.floor(slice.endSec * buffer.sampleRate);
    const length = end - start;
    const preview = offline.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      preview.copyToChannel(buffer.getChannelData(channel).subarray(start, end), channel);
    }
    const source = offline.createBufferSource();
    source.buffer = preview;
    source.connect(offline.destination);
    source.start();
  };

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-white">Sample chopper</p>
        <p className="mt-1 text-[11px] text-zinc-500">
          Select a clip on the timeline or import audio. Click a slice to preview, then place it.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadFromClip()}
          className="rounded-md border border-white/10 bg-[#15151f] px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/5 disabled:opacity-40"
        >
          Reload source
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              setBuffer(await decodeAudioBlob(await generateSoulSampleLoop(project.bpm)));
              setSourceLabel("Fresh soul loop");
            } finally {
              setLoading(false);
            }
          }}
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-100 hover:bg-amber-500/15 disabled:opacity-40"
        >
          New soul loop
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-white/10 bg-[#15151f] px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/5"
        >
          Import sample
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setLoading(true);
            try {
              setBuffer(await decodeAudioBlob(file));
              setSourceLabel(file.name);
            } finally {
              setLoading(false);
            }
            event.target.value = "";
          }}
        />
      </div>

      <p className="mt-2 text-[10px] text-zinc-500">
        Source: {sourceLabel}
        {loading ? " · loading…" : buffer ? ` · ${buffer.duration.toFixed(1)}s` : ""}
      </p>

      <label className="mt-3 block text-[11px] text-zinc-400">
        Slices: {sliceCount}
        <input
          type="range"
          min={4}
          max={16}
          step={4}
          value={sliceCount}
          onChange={(event) => setSliceCount(Number(event.target.value))}
          className="mt-1 w-full accent-amber-400"
        />
      </label>

      <label className="mt-2 block text-[11px] text-zinc-400">
        Pitch {pitch > 0 ? `+${pitch}` : pitch} st
        <input
          type="range"
          min={-7}
          max={7}
          step={1}
          value={pitch}
          onChange={(event) => setPitch(Number(event.target.value))}
          className="mt-1 w-full accent-amber-400"
        />
      </label>

      <label className="mt-2 flex items-center gap-2 text-[11px] text-zinc-300">
        <input
          type="checkbox"
          checked={reversed}
          onChange={(event) => setReversed(event.target.checked)}
          className="accent-amber-400"
        />
        Reverse chop (flip)
      </label>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {slices.map((slice) => (
          <button
            key={slice.index}
            type="button"
            onClick={() => {
              setSelectedSlice(slice.index);
              previewSlice(slice);
            }}
            className={`rounded border px-2 py-2 text-[11px] font-semibold transition ${
              selectedSlice === slice.index
                ? "border-amber-400/50 bg-amber-500/20 text-amber-100"
                : "border-white/10 bg-[#0b0b10] text-zinc-400 hover:border-white/20"
            }`}
          >
            {slice.index + 1}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!buffer || loading}
        onClick={() => {
          const slice = slices[selectedSlice];
          if (!slice || !buffer) return;
          void placeChopOnTimeline({
            buffer,
            slice,
            pitchSemitones: pitch,
            reversed,
            startBeat: state.transport.currentBeat,
          });
        }}
        className="mt-3 w-full rounded-md bg-amber-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-40"
      >
        Place chop {selectedSlice + 1}
      </button>
    </section>
  );
}
