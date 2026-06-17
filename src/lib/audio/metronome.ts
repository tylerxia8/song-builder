export function startMetronome(bpm: number): () => void {
  const context = new AudioContext();
  const beatDuration = 60 / bpm;
  let beatIndex = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const tick = () => {
    if (stopped) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = beatIndex % 4 === 0 ? 1200 : 800;
    gain.gain.value = beatIndex % 4 === 0 ? 0.12 : 0.07;

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.04);

    beatIndex += 1;
    timer = setTimeout(tick, beatDuration * 1000);
  };

  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    void context.close();
  };
}
