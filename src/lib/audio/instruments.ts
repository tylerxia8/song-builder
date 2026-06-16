import type { InstrumentId, NoteEvent } from "@/lib/types";

type ToneInstrument = {
  triggerAttackRelease: (
    note: string | number,
    duration: string | number,
    time?: number,
  ) => void;
  toDestination: () => ToneInstrument;
  dispose?: () => void;
};

export async function renderInstrumentTrack(
  notes: NoteEvent[],
  onsets: number[],
  instrument: InstrumentId,
  duration: number,
): Promise<AudioBuffer> {
  const Tone = await import("tone");
  await Tone.start();

  const rendered = await Tone.Offline(() => {
    if (instrument === "drum-kit") {
      renderDrums(Tone, onsets);
      return;
    }

    const synth = createInstrument(Tone, instrument);
    synth.toDestination();

    notes.forEach((note) => {
      synth.triggerAttackRelease(
        Tone.Frequency(note.midi, "midi").toFrequency(),
        Math.max(0.08, note.duration * 0.92),
        note.time + 0.02,
      );
    });
  }, duration + 0.4);

  return rendered.get() as AudioBuffer;
}

function createInstrument(Tone: typeof import("tone"), instrument: InstrumentId): ToneInstrument {
  switch (instrument) {
    case "piano":
      return new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.15, release: 0.8 },
      });
    case "guitar":
      return new Tone.PluckSynth({
        attackNoise: 1.2,
        dampening: 3200,
        resonance: 0.92,
      });
    case "violin":
      return new Tone.FMSynth({
        harmonicity: 2.5,
        modulationIndex: 8,
        oscillator: { type: "sine" },
        envelope: { attack: 0.08, decay: 0.2, sustain: 0.7, release: 0.6 },
      });
    case "brass":
      return new Tone.FMSynth({
        harmonicity: 1.2,
        modulationIndex: 10,
        oscillator: { type: "square" },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.4 },
      });
    case "synth":
    default:
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.02, decay: 0.12, sustain: 0.45, release: 0.35 },
      });
  }
}

function renderDrums(Tone: typeof import("tone"), onsets: number[]) {
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.4 },
  }).toDestination();

  const snare = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
  }).toDestination();

  const hihat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).toDestination();

  onsets.forEach((time, index) => {
    hihat.triggerAttackRelease("32n", time);
    if (index % 4 === 0) {
      kick.triggerAttackRelease("C1", "8n", time);
    } else if (index % 2 === 0) {
      snare.triggerAttackRelease("16n", time);
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
