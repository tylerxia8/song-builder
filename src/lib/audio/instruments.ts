import type { InstrumentId, NoteEvent } from "@/lib/types";

type ToneModule = typeof import("tone");

type ToneInstrument = {
  triggerAttackRelease: (
    note: string | number,
    duration: string | number,
    time?: number,
  ) => void;
  connect: (destination: unknown) => ToneInstrument;
  toDestination: () => ToneInstrument;
};

export async function renderInstrumentTrack(
  notes: NoteEvent[],
  onsets: number[],
  instrument: InstrumentId,
  duration: number,
): Promise<AudioBuffer> {
  const Tone = await import("tone");
  await Tone.start();

  const rendered = await Tone.Offline(async () => {
    const chain = createMasterChain(Tone);

    if (instrument === "drum-kit") {
      renderDrums(Tone, onsets, chain);
      return;
    }

    const voice = createInstrument(Tone, instrument);
    voice.connect(chain);

    notes.forEach((note) => {
      voice.triggerAttackRelease(
        Tone.Frequency(note.midi, "midi").toFrequency(),
        Math.max(0.1, note.duration * 0.94),
        note.time + 0.02,
      );
    });
  }, duration + 0.6);

  return rendered.get() as AudioBuffer;
}

function createMasterChain(Tone: ToneModule) {
  const reverb = new Tone.Reverb({ decay: 2.8, preDelay: 0.02, wet: 0.24 });
  const compressor = new Tone.Compressor({ threshold: -20, ratio: 3.5, attack: 0.004, release: 0.18 });
  const limiter = new Tone.Limiter(-1);

  reverb.connect(limiter);
  limiter.toDestination();
  compressor.connect(reverb);

  return compressor;
}

function createInstrument(Tone: ToneModule, instrument: InstrumentId): ToneInstrument {
  switch (instrument) {
    case "piano":
      return new Tone.PolySynth(Tone.Synth, {
        volume: -8,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.002, decay: 0.6, sustain: 0.18, release: 1.4 },
      }) as unknown as ToneInstrument;
    case "guitar":
      return new Tone.PluckSynth({
        volume: -6,
        attackNoise: 1.6,
        dampening: 2800,
        resonance: 0.94,
      }) as unknown as ToneInstrument;
    case "violin":
      return new Tone.FMSynth({
        volume: -10,
        harmonicity: 3,
        modulationIndex: 9,
        oscillator: { type: "sine" },
        envelope: { attack: 0.12, decay: 0.18, sustain: 0.72, release: 0.8 },
        modulationEnvelope: { attack: 0.08, decay: 0.2, sustain: 0.2, release: 0.3 },
      }) as unknown as ToneInstrument;
    case "brass":
      return new Tone.MonoSynth({
        volume: -8,
        oscillator: { type: "square" },
        filter: { Q: 2, type: "lowpass", rolloff: -24 },
        filterEnvelope: { attack: 0.04, decay: 0.2, sustain: 0.45, release: 0.5, baseFrequency: 180, octaves: 2.2 },
        envelope: { attack: 0.03, decay: 0.15, sustain: 0.55, release: 0.35 },
      }) as unknown as ToneInstrument;
    case "synth":
    default:
      return new Tone.PolySynth(Tone.Synth, {
        volume: -10,
        oscillator: { type: "fatsawtooth", spread: 18, count: 3 },
        envelope: { attack: 0.02, decay: 0.18, sustain: 0.42, release: 0.45 },
      }) as unknown as ToneInstrument;
  }
}

function renderDrums(Tone: ToneModule, onsets: number[], chain: ReturnType<typeof createMasterChain>) {
  const drumBus = new Tone.Gain(0.92);
  drumBus.connect(chain);

  const kick = new Tone.MembraneSynth({
    volume: -2,
    pitchDecay: 0.018,
    octaves: 7,
    envelope: { attack: 0.001, decay: 0.34, sustain: 0, release: 0.45 },
  }).connect(drumBus);

  const snare = new Tone.NoiseSynth({
    volume: -8,
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.08 },
  }).connect(drumBus);

  const hihat = new Tone.MetalSynth({
    volume: -18,
    envelope: { attack: 0.001, decay: 0.035, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4200,
    octaves: 1.5,
  }).connect(drumBus);

  const tom = new Tone.MembraneSynth({
    volume: -12,
    pitchDecay: 0.04,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.2 },
  }).connect(drumBus);

  onsets.forEach((time, index) => {
    hihat.triggerAttackRelease("32n", time);
    if (index % 4 === 0) {
      kick.triggerAttackRelease("C1", "8n", time);
    } else if (index % 2 === 0) {
      snare.triggerAttackRelease("16n", time);
    } else if (index % 4 === 3) {
      tom.triggerAttackRelease("G2", "16n", time);
    }
  });
}

export async function renderOriginalTrack(
  buffer: AudioBuffer,
  trimStartSec: number,
  tempoScale: number,
): Promise<AudioBuffer> {
  const duration = Math.max(0.1, (buffer.duration - trimStartSec) / tempoScale);
  const offline = new OfflineAudioContext(
    1,
    Math.ceil(duration * buffer.sampleRate),
    buffer.sampleRate,
  );
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = tempoScale;
  source.connect(offline.destination);
  source.start(0, trimStartSec);
  return offline.startRendering();
}

export async function prependSilence(
  buffer: AudioBuffer,
  delaySec: number,
): Promise<AudioBuffer> {
  if (delaySec <= 0) return buffer;

  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil((buffer.duration + delaySec) * buffer.sampleRate),
    buffer.sampleRate,
  );
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(delaySec);
  return offline.startRendering();
}
