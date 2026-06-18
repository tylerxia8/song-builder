import * as Tone from "tone";

function bufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const dataLength = length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  const write = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  write(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataLength, true);

  const channels = Array.from({ length: numChannels }, (_, index) => buffer.getChannelData(index));
  let offset = 44;
  for (let index = 0; index < length; index += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][index]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/** Procedural soul-chorus loop — warm keys + vinyl texture, no copyrighted material. */
export async function generateSoulSampleLoop(bpm = 84): Promise<Blob> {
  const bars = 4;
  const duration = (bars * 4 * 60) / bpm;

  const chords = [
    ["C4", "Eb4", "G4", "Bb4"],
    ["Ab3", "C4", "Eb4", "G4"],
    ["Fm3", "Ab3", "C4", "Eb4"],
    ["Eb3", "G3", "Bb3", "D4"],
  ];

  const rendered = await Tone.Offline(() => {
    const vinyl = new Tone.Noise({ type: "brown", volume: -32 });
    const vinylFilter = new Tone.Filter({ frequency: 900, type: "highpass" });
    const tremolo = new Tone.Tremolo({ frequency: 4, depth: 0.15 }).start();
    vinyl.chain(vinylFilter, tremolo, Tone.Destination);

    const keys = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2.5,
      modulationIndex: 1.4,
      envelope: { attack: 0.02, decay: 0.45, sustain: 0.35, release: 1.4 },
      modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.4 },
    });
    const filter = new Tone.Filter({ frequency: 2400, type: "lowpass", rolloff: -12 });
    const chorus = new Tone.Chorus({ frequency: 1.2, delayTime: 3.5, depth: 0.4, wet: 0.35 }).start();
    keys.chain(filter, chorus, Tone.Destination);

    const beatSec = 60 / bpm;
    chords.forEach((chord, bar) => {
      const time = bar * 4 * beatSec;
      keys.triggerAttackRelease(chord, `${3.6 * beatSec}`, time, 0.55);
    });
  }, duration + 0.5);

  return bufferToWavBlob(rendered.get() as AudioBuffer);
}

export async function generateVocalStab(): Promise<Blob> {
  const duration = 1.2;
  const rendered = await Tone.Offline(() => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.08, decay: 0.35, sustain: 0.15, release: 0.6 },
    });
    const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.45 }).toDestination();
    synth.connect(reverb);
    synth.triggerAttackRelease(["G4", "Bb4", "D5"], "0.8", 0, 0.6);
  }, duration);

  return bufferToWavBlob(rendered.get() as AudioBuffer);
}
