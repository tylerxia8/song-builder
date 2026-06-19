let previewContext: AudioContext | null = null;

function getPreviewContext(): AudioContext {
  if (!previewContext) previewContext = new AudioContext();
  return previewContext;
}

export async function ensurePreviewAudio(): Promise<AudioContext> {
  const ctx = getPreviewContext();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

export function stopPreview(): void {
  previewContext?.suspend();
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  gain = 0.15,
): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = frequency;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export async function previewDrumPattern(genre: "hiphop" | "pop" | "trap" | "acoustic"): Promise<void> {
  const ctx = await ensurePreviewAudio();
  const now = ctx.currentTime + 0.05;
  const step = 0.12;

  const patterns: Record<typeof genre, Array<{ freq: number; gain: number } | null>> = {
    hiphop: [
      { freq: 70, gain: 0.35 },
      null,
      { freq: 180, gain: 0.12 },
      null,
      { freq: 70, gain: 0.3 },
      null,
      { freq: 8000, gain: 0.05 },
      { freq: 180, gain: 0.12 },
    ],
    pop: [
      { freq: 80, gain: 0.25 },
      null,
      { freq: 9000, gain: 0.04 },
      null,
      { freq: 200, gain: 0.14 },
      null,
      { freq: 9000, gain: 0.04 },
      null,
    ],
    trap: [
      { freq: 55, gain: 0.4 },
      { freq: 10000, gain: 0.05 },
      null,
      { freq: 10000, gain: 0.05 },
      { freq: 200, gain: 0.16 },
      { freq: 10000, gain: 0.05 },
      null,
      { freq: 10000, gain: 0.05 },
    ],
    acoustic: [
      { freq: 90, gain: 0.18 },
      null,
      { freq: 7000, gain: 0.03 },
      null,
      { freq: 220, gain: 0.1 },
      null,
      { freq: 7000, gain: 0.03 },
      null,
    ],
  };

  patterns[genre].forEach((hit, index) => {
    if (!hit) return;
    playTone(ctx, hit.freq, now + index * step, hit.freq < 200 ? 0.12 : 0.05, hit.gain);
  });
}

export async function previewInstrument(kind: "keys" | "bass" | "lead" | "pad"): Promise<void> {
  const ctx = await ensurePreviewAudio();
  const now = ctx.currentTime + 0.05;
  const chords: Record<typeof kind, number[]> = {
    keys: [261.63, 329.63, 392.0],
    bass: [65.41, 82.41],
    lead: [523.25, 659.25],
    pad: [220, 277.18, 329.63],
  };

  chords[kind].forEach((freq, index) => {
    playTone(ctx, freq, now + index * 0.08, 0.45, kind === "bass" ? 0.22 : 0.12);
  });
}

export async function previewLoopPack(genre: string): Promise<void> {
  const map: Record<string, "hiphop" | "pop" | "trap" | "acoustic"> = {
    "Hip Hop": "hiphop",
    "Pop": "pop",
    "Trap": "trap",
    "Acoustic": "acoustic",
  };
  await previewDrumPattern(map[genre] ?? "pop");
}
