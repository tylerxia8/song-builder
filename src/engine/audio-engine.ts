import * as Tone from "tone";
import type { InstrumentProgram } from "@/types/project";
import { getTrackOutputVolume, isTrackAudible } from "@/lib/mix";
import {
  BEATS_PER_BAR,
  beatToTransportTime,
  createEmptyDrumPattern,
  transportTimeToBeat,
  STEPS_PER_PATTERN,
  type Clip,
  type DrumPattern,
  type MidiNote,
  type Project,
  type Track,
} from "@/types/project";

interface DrumInstrument extends Tone.ToneAudioNode {
  triggerAttackRelease: (
    note: string,
    duration: string,
    time?: number,
    velocity?: number,
  ) => void;
}

interface TrackNodes {
  channel: Tone.Channel;
  instrument: Tone.ToneAudioNode;
  parts: Tone.Part[];
  players: Tone.Player[];
}

function isNoteEvent(value: unknown): value is { note: string; duration: string; velocity: number } {
  return typeof value === "object" && value !== null && "note" in value;
}

const DRUM_NOTES: Record<keyof DrumPattern, string> = {
  kick: "C1",
  snare: "D1",
  hihat: "F#1",
  clap: "A1",
};

function createInstrument(program: InstrumentProgram): Tone.ToneAudioNode {
  switch (program) {
    case "electric-piano":
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 1.2,
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 },
      });
    case "analog-bass":
      return new Tone.MonoSynth({
        oscillator: { type: "square" },
        filter: { Q: 2, type: "lowpass", rolloff: -24 },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0.35, release: 0.4 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2, baseFrequency: 80, octaves: 2.2 },
      });
    case "lead-synth":
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.4, release: 0.5 },
      });
    case "pad":
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.3, decay: 0.2, sustain: 0.7, release: 1.2 },
      });
    case "grand-piano":
    default:
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
      });
  }
}

function createDrumSynth(): DrumInstrument {
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 8,
    envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.2 },
  });

  const snare = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
  });

  const hihat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  });

  const clap = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 },
  });

  const router = new Tone.Gain(1);
  kick.connect(router);
  snare.connect(router);
  hihat.connect(router);
  clap.connect(router);

  return Object.assign(router, {
    triggerAttackRelease(note: string, duration: string, time?: number, velocity?: number) {
      const velocityScale = velocity ?? 0.8;
      const when = time ?? Tone.now();
      if (note === DRUM_NOTES.kick) kick.triggerAttackRelease("C1", duration, when, velocityScale);
      if (note === DRUM_NOTES.snare) snare.triggerAttackRelease("8n", when, velocityScale);
      if (note === DRUM_NOTES.hihat) hihat.triggerAttackRelease("32n", when, velocityScale);
      if (note === DRUM_NOTES.clap) clap.triggerAttackRelease("16n", when, velocityScale * 0.9);
    },
  }) as DrumInstrument;
}

function patternToEvents(
  pattern: DrumPattern,
  clipStartBeat: number,
  durationBeat: number,
) {
  const stepBeat = durationBeat / STEPS_PER_PATTERN;
  const events: Array<{ time: string; note: string; duration: string; velocity: number }> = [];

  (Object.keys(DRUM_NOTES) as Array<keyof DrumPattern>).forEach((row) => {
    pattern[row].forEach((active, step) => {
      if (!active) return;
      const beat = clipStartBeat + step * stepBeat;
      events.push({
        time: beatToTransportTime(beat),
        note: DRUM_NOTES[row],
        duration: row === "hihat" ? "32n" : "16n",
        velocity: row === "kick" ? 0.95 : 0.75,
      });
    });
  });

  return events;
}

function notesToEvents(notes: MidiNote[], clipStartBeat: number) {
  return notes.map((note) => ({
    time: beatToTransportTime(clipStartBeat + note.startBeat),
    note: Tone.Frequency(note.pitch, "midi").toNote(),
    duration: `${note.durationBeat}n`,
    velocity: note.velocity,
  }));
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private started = false;
  private master = new Tone.Gain(0.9).toDestination();
  private compressor = new Tone.Compressor(-18, 3).connect(this.master);
  private reverb = new Tone.Reverb({ decay: 1.8, wet: 0.12 }).connect(this.compressor);
  private trackNodes = new Map<string, TrackNodes>();
  private metronomePart: Tone.Part | null = null;
  private positionInterval: ReturnType<typeof setInterval> | null = null;
  private onPositionChange: ((beat: number) => void) | null = null;

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  async ensureStarted(): Promise<void> {
    if (this.started) return;
    await Tone.start();
    this.started = true;
  }

  setPositionListener(listener: ((beat: number) => void) | null) {
    this.onPositionChange = listener;
  }

  setMasterVolume(value: number) {
    this.master.gain.rampTo(value, 0.05);
  }

  private getOrCreateTrackNodes(track: Track): TrackNodes {
    const existing = this.trackNodes.get(track.id);
    if (existing) return existing;

    const channel = new Tone.Channel({
      volume: Tone.gainToDb(track.volume),
      pan: track.pan,
    }).connect(this.reverb);

    const instrument =
      track.kind === "drums"
        ? createDrumSynth()
        : createInstrument(track.instrument);

    instrument.connect(channel);

    const nodes: TrackNodes = {
      channel,
      instrument,
      parts: [],
      players: [],
    };
    this.trackNodes.set(track.id, nodes);
    return nodes;
  }

  private disposeTrackNodes(trackId: string) {
    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return;
    nodes.parts.forEach((part) => part.dispose());
    nodes.players.forEach((player) => player.dispose());
    nodes.instrument.dispose();
    nodes.channel.dispose();
    this.trackNodes.delete(trackId);
  }

  syncProject(project: Project) {
    const activeIds = new Set(project.tracks.map((track) => track.id));
    [...this.trackNodes.keys()].forEach((trackId) => {
      if (!activeIds.has(trackId)) this.disposeTrackNodes(trackId);
    });

    project.tracks.forEach((track) => {
      const nodes = this.getOrCreateTrackNodes(track);
      const outputVolume = getTrackOutputVolume(track, project.tracks);
      nodes.channel.volume.rampTo(Tone.gainToDb(outputVolume), 0.03);
      nodes.channel.pan.rampTo(track.pan, 0.03);
      nodes.channel.mute = !isTrackAudible(track, project.tracks);
    });

    Tone.Transport.bpm.value = project.bpm;
    if (project.loopEnabled) {
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = beatToTransportTime(project.loopStartBar * BEATS_PER_BAR);
      Tone.Transport.loopEnd = beatToTransportTime(project.loopEndBar * BEATS_PER_BAR);
    } else {
      Tone.Transport.loop = false;
    }
  }

  private clearScheduled() {
    this.trackNodes.forEach((nodes) => {
      nodes.parts.forEach((part) => {
        part.stop();
        part.dispose();
      });
      nodes.parts = [];
      nodes.players.forEach((player) => {
        player.stop();
        player.dispose();
      });
      nodes.players = [];
    });
    this.metronomePart?.stop();
    this.metronomePart?.dispose();
    this.metronomePart = null;
    Tone.Transport.cancel(0);
  }

  scheduleProject(project: Project) {
    this.clearScheduled();

    project.tracks.forEach((track) => {
      const nodes = this.getOrCreateTrackNodes(track);
      track.clips.forEach((clip) => this.scheduleClip(project, track, clip, nodes));
    });

    if (project.metronomeEnabled) {
      this.metronomePart = new Tone.Part((time, value) => {
        const accent = typeof value === "object" && value !== null && "accent" in value && value.accent;
        const click = new Tone.Synth({
          oscillator: { type: "square" },
          envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
        }).toDestination();
        click.triggerAttackRelease(accent ? "C6" : "G5", "32n", time, accent ? 0.08 : 0.04);
      }, Array.from({ length: project.lengthBars * BEATS_PER_BAR }, (_, beat) => [
        beatToTransportTime(beat),
        { accent: beat % BEATS_PER_BAR === 0 },
      ])).start(0);
    }
  }

  private scheduleClip(project: Project, track: Track, clip: Clip, nodes: TrackNodes) {
    if (clip.kind === "audio" && clip.audioUrl) {
      const player = new Tone.Player(clip.audioUrl).connect(nodes.channel);
      player.sync().start(beatToTransportTime(clip.startBeat));
      nodes.players.push(player);
      return;
    }

    if (clip.kind === "drums" && clip.pattern) {
      const events = patternToEvents(clip.pattern, clip.startBeat, clip.durationBeat);
      const part = new Tone.Part((time, event) => {
        if (!isNoteEvent(event)) return;
        (nodes.instrument as DrumInstrument).triggerAttackRelease(
          event.note,
          event.duration,
          time,
          event.velocity,
        );
      }, events.map((event) => [event.time, event])).start(0);
      nodes.parts.push(part);
      return;
    }

    if (clip.kind === "midi" && clip.notes) {
      const events = notesToEvents(clip.notes, clip.startBeat);
      const part = new Tone.Part((time, event) => {
        if (!isNoteEvent(event)) return;
        (nodes.instrument as Tone.PolySynth).triggerAttackRelease(
          event.note,
          event.duration,
          time,
          event.velocity,
        );
      }, events.map((event) => [event.time, event])).start(0);
      nodes.parts.push(part);
    }
  }

  async play(project: Project, fromBeat = 0) {
    await this.ensureStarted();
    this.syncProject(project);
    this.scheduleProject(project);
    Tone.Transport.position = beatToTransportTime(fromBeat);
    Tone.Transport.start();

    this.positionInterval = setInterval(() => {
      const beat = transportTimeToBeat(Tone.Transport.position as string);
      this.onPositionChange?.(beat);
    }, 50);
  }

  stop() {
    Tone.Transport.stop();
    this.clearScheduled();
    [...this.trackNodes.keys()].forEach((trackId) => this.disposeTrackNodes(trackId));
    if (this.positionInterval) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
    this.onPositionChange?.(0);
  }

  getCurrentBeat(): number {
    return transportTimeToBeat(Tone.Transport.position as string);
  }

  async renderOffline(project: Project, durationBars: number): Promise<AudioBuffer> {
    await this.ensureStarted();
    const durationSeconds = (durationBars * BEATS_PER_BAR * 60) / project.bpm;
    const beatToSeconds = (beat: number) => (beat * 60) / project.bpm;

    const audioBuffers = new Map<string, Tone.ToneAudioBuffer>();
    await Promise.all(
      project.tracks.flatMap((track) =>
        track.clips.map(async (clip) => {
          if (clip.kind !== "audio" || !clip.audioUrl) return;
          audioBuffers.set(clip.id, await Tone.ToneAudioBuffer.fromUrl(clip.audioUrl));
        }),
      ),
    );

    const rendered = await Tone.Offline(() => {
      Tone.Transport.bpm.value = project.bpm;
      project.tracks.forEach((track) => {
        const outputVolume = getTrackOutputVolume(track, project.tracks);
        const channel = new Tone.Channel({
          volume: Tone.gainToDb(outputVolume),
          pan: track.pan,
          mute: !isTrackAudible(track, project.tracks),
        });
        const instrument =
          track.kind === "drums" ? createDrumSynth() : createInstrument(track.instrument);
        instrument.connect(channel);
        channel.toDestination();

        track.clips.forEach((clip) => {
          if (clip.kind === "audio" && clip.audioUrl) {
            const buffer = audioBuffers.get(clip.id);
            if (!buffer) return;
            const player = new Tone.Player(buffer).connect(channel);
            const startSec = beatToSeconds(clip.startBeat);
            const endSec = startSec + beatToSeconds(clip.durationBeat);
            player.start(startSec);
            player.stop(endSec);
            return;
          }

          if (clip.kind === "drums" && clip.pattern) {
            const events = patternToEvents(clip.pattern, clip.startBeat, clip.durationBeat);
            new Tone.Part((time, event) => {
              if (!isNoteEvent(event)) return;
              (instrument as DrumInstrument).triggerAttackRelease(
                event.note,
                event.duration,
                time,
                event.velocity,
              );
            }, events.map((event) => [event.time, event])).start(0);
          } else if (clip.kind === "midi" && clip.notes) {
            const events = notesToEvents(clip.notes, clip.startBeat);
            new Tone.Part((time, event) => {
              if (!isNoteEvent(event)) return;
              (instrument as Tone.PolySynth).triggerAttackRelease(
                event.note,
                event.duration,
                time,
                event.velocity,
              );
            }, events.map((event) => [event.time, event])).start(0);
          }
        });
      });
    }, durationSeconds);

    return rendered.get() as AudioBuffer;
  }
}

export function midiNoteName(pitch: number): string {
  return Tone.Frequency(pitch, "midi").toNote();
}

export { createEmptyDrumPattern };
