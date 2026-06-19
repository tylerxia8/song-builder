import * as Tone from "tone";
import { resolveTrackFx, type TrackFxSettings } from "@/lib/track-fx";

export interface TrackFxNodes {
  input: Tone.Gain;
  filter: Tone.Filter;
  delay: Tone.FeedbackDelay;
  reverb: Tone.Reverb;
  output: Tone.Gain;
}

export function createTrackFxChain(): TrackFxNodes {
  const input = new Tone.Gain(1);
  const filter = new Tone.Filter({ type: "lowpass", frequency: 12000, rolloff: -12 });
  const delay = new Tone.FeedbackDelay({ delayTime: 0.35, feedback: 0.25, wet: 0 });
  const reverb = new Tone.Reverb({ decay: 1.6, wet: 0 });
  const output = new Tone.Gain(1);

  input.connect(filter);
  filter.connect(delay);
  delay.connect(reverb);
  reverb.connect(output);

  return { input, filter, delay, reverb, output };
}

export function applyTrackFxSettings(nodes: TrackFxNodes, settings: TrackFxSettings): void {
  const fx = resolveTrackFx(settings);

  nodes.filter.type = fx.filter.type;
  nodes.filter.frequency.rampTo(fx.filter.enabled ? fx.filter.frequency : 20000, 0.05);
  nodes.filter.Q.value = fx.filter.enabled ? 0.7 : 0.1;

  nodes.delay.wet.rampTo(fx.delay.enabled ? fx.delay.wet : 0, 0.05);
  nodes.delay.delayTime.rampTo(fx.delay.time, 0.05);

  nodes.reverb.wet.rampTo(fx.reverb.enabled ? fx.reverb.wet : 0, 0.05);
}

export function disposeTrackFxChain(nodes: TrackFxNodes): void {
  nodes.input.dispose();
  nodes.filter.dispose();
  nodes.delay.dispose();
  nodes.reverb.dispose();
  nodes.output.dispose();
}

export function connectInstrumentToFxChain(
  instrument: Tone.ToneAudioNode,
  fx: TrackFxNodes,
  channel: Tone.Channel,
): void {
  instrument.connect(fx.input);
  fx.output.connect(channel);
}
