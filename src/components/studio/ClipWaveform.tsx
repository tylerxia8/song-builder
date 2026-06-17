"use client";

import { useEffect, useRef } from "react";
import { getOrComputeWaveformPeaks } from "@/lib/waveform";
import {
  cacheWaveformPeaks,
  getAudioBlob,
  getWaveformPeaks,
} from "@/lib/audio-assets";

interface ClipWaveformProps {
  assetId?: string;
  audioUrl?: string;
  color: string;
}

export function ClipWaveform({ assetId, audioUrl, color }: ClipWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !assetId) return;

    let cancelled = false;

    const draw = (peaks: number[]) => {
      if (cancelled) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width <= 0 || height <= 0) return;

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);

      const barWidth = width / peaks.length;
      context.fillStyle = `${color}cc`;

      peaks.forEach((peak, index) => {
        const barHeight = Math.max(2, peak * height * 0.85);
        const x = index * barWidth;
        const y = (height - barHeight) / 2;
        context.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight);
      });
    };

    const cached = getWaveformPeaks(assetId);
    if (cached) {
      draw(cached);
      return;
    }

    const source = getAudioBlob(assetId) ?? audioUrl;
    if (!source) return;

    getOrComputeWaveformPeaks(
      assetId,
      source,
      getWaveformPeaks,
      cacheWaveformPeaks,
    )
      .then(draw)
      .catch(() => {
        // Waveform preview is optional; ignore decode failures.
      });

    return () => {
      cancelled = true;
    };
  }, [assetId, audioUrl, color]);

  if (!assetId && !audioUrl) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-x-3 bottom-1 top-5 opacity-80"
      aria-hidden
    />
  );
}
