"use client";

import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  audioUrl: string;
  color?: string;
  height?: number;
  emptyLabel?: string;
}

export function AudioWaveform({
  audioUrl,
  color = "#c084fc",
  height = 64,
  emptyLabel,
}: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let cancelled = false;

    async function drawWaveform() {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      await audioContext.close();

      if (cancelled || !canvas) return;

      const width = Math.max(container!.clientWidth, 240);
      canvas.width = width;
      canvas.height = height;

      const channelData = audioBuffer.getChannelData(0);
      const context = canvas.getContext("2d");
      if (!context) return;

      const step = Math.ceil(channelData.length / width);
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;

      for (let x = 0; x < width; x += 1) {
        let min = 1;
        let max = -1;

        for (let i = 0; i < step; i += 1) {
          const sample = channelData[x * step + i] ?? 0;
          if (sample < min) min = sample;
          if (sample > max) max = sample;
        }

        const barHeight = Math.max(2, (max - min) * height * 0.88);
        const y = (height - barHeight) / 2;
        context.fillRect(x, y, 1, barHeight);
      }
    }

    drawWaveform().catch(() => {});

    const observer = new ResizeObserver(() => {
      drawWaveform().catch(() => {});
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [audioUrl, color, height]);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-16 w-full overflow-hidden rounded-sm bg-[#0a0a10]"
    >
      {!audioUrl && emptyLabel && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-[0.16em] text-zinc-600">
          {emptyLabel}
        </div>
      )}
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
    </div>
  );
}
