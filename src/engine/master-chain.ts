import * as Tone from "tone";

export interface MasterChainNodes {
  input: Tone.Gain;
  reverb: Tone.Reverb;
  compressor: Tone.Compressor;
  limiter: Tone.Limiter;
  master: Tone.Gain;
}

export function createMasterChain(masterVolume = 0.92): MasterChainNodes {
  const input = new Tone.Gain(1);
  const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.12 });
  const compressor = new Tone.Compressor(-18, 3);
  const limiter = new Tone.Limiter(-1);
  const master = new Tone.Gain(masterVolume);

  input.connect(reverb);
  reverb.connect(compressor);
  compressor.connect(limiter);
  limiter.connect(master);
  master.toDestination();

  return { input, reverb, compressor, limiter, master };
}

export function connectTrackToMaster(trackOut: Tone.ToneAudioNode, masterInput: Tone.Gain): void {
  trackOut.connect(masterInput);
}
