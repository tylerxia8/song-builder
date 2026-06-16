"use client";

import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  audioUrl: string;
  color?: string;
}

export function AudioWaveform({
  audioUrl,
  color = "#c084fc",
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    async function drawWaveform() {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      await audioContext.close();

      if (cancelled || !canvas) return;

      const channelData = audioBuffer.getChannelData(0);
      const context = canvas.getContext("2d");
      if (!context) return;

      const width = canvas.width;
      const height = canvas.height;
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

        const barHeight = Math.max(2, (max - min) * height * 0.9);
        const y = (height - barHeight) / 2;
        context.fillRect(x, y, 1, barHeight);
      }
    }

    drawWaveform().catch(() => {
      // Waveform rendering is optional; ignore decode failures.
    });

    return () => {
      cancelled = true;
    };
  }, [audioUrl, color]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={56}
      className="h-14 w-full rounded-xl bg-white/5"
      aria-hidden="true"
    />
  );
}
