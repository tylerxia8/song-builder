"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { AudioEngine } from "@/engine/audio-engine";
import { createDemoProject } from "@/lib/demo-project";
import { trackColor } from "@/lib/colors";
import {
  BEATS_PER_BAR,
  createEmptyDrumPattern,
  createId,
  type Clip,
  type DrumPattern,
  type EditorMode,
  type InstrumentProgram,
  type MidiNote,
  type Project,
  type StudioSelection,
  type Track,
  type TrackKind,
} from "@/types/project";

interface StudioState {
  project: Project;
  selection: StudioSelection;
  transport: {
    isPlaying: boolean;
    isRecording: boolean;
    currentBeat: number;
  };
  masterVolume: number;
  zoom: number;
}

type StudioAction =
  | { type: "SET_PLAYING"; value: boolean }
  | { type: "SET_RECORDING"; value: boolean }
  | { type: "SET_CURRENT_BEAT"; value: number }
  | { type: "SET_MASTER_VOLUME"; value: number }
  | { type: "SET_ZOOM"; value: number }
  | { type: "UPDATE_PROJECT"; updater: (project: Project) => Project }
  | { type: "SELECT_TRACK"; trackId: string | null }
  | { type: "SELECT_CLIP"; clipId: string | null; editorMode?: EditorMode }
  | { type: "SET_EDITOR_MODE"; mode: EditorMode };

function initialState(): StudioState {
  const project = createDemoProject();
  const firstClip = project.tracks[0]?.clips[0];

  return {
    project,
    selection: {
      trackId: project.tracks[0]?.id ?? null,
      clipId: firstClip?.id ?? null,
      editorMode: firstClip?.kind === "drums" ? "drum-machine" : "piano-roll",
    },
    transport: {
      isPlaying: false,
      isRecording: false,
      currentBeat: 0,
    },
    masterVolume: 0.92,
    zoom: 1,
  };
}

function reducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "SET_PLAYING":
      return { ...state, transport: { ...state.transport, isPlaying: action.value } };
    case "SET_RECORDING":
      return { ...state, transport: { ...state.transport, isRecording: action.value } };
    case "SET_CURRENT_BEAT":
      return { ...state, transport: { ...state.transport, currentBeat: action.value } };
    case "SET_MASTER_VOLUME":
      return { ...state, masterVolume: action.value };
    case "SET_ZOOM":
      return { ...state, zoom: action.value };
    case "SELECT_TRACK":
      return { ...state, selection: { ...state.selection, trackId: action.trackId } };
    case "SELECT_CLIP": {
      const clip = findClip(state.project, action.clipId);
      return {
        ...state,
        selection: {
          trackId: clip?.trackId ?? state.selection.trackId,
          clipId: action.clipId,
          editorMode:
            action.editorMode ??
            (clip?.kind === "drums"
              ? "drum-machine"
              : clip?.kind === "audio"
                ? "audio"
                : "piano-roll"),
        },
      };
    }
    case "SET_EDITOR_MODE":
      return { ...state, selection: { ...state.selection, editorMode: action.mode } };
    case "UPDATE_PROJECT":
      return { ...state, project: action.updater(state.project) };
    default:
      return state;
  }
}

function findClip(project: Project, clipId: string | null): Clip | null {
  if (!clipId) return null;
  for (const track of project.tracks) {
    const clip = track.clips.find((item) => item.id === clipId);
    if (clip) return clip;
  }
  return null;
}

function findTrack(project: Project, trackId: string | null): Track | null {
  if (!trackId) return null;
  return project.tracks.find((track) => track.id === trackId) ?? null;
}

function updateTrack(project: Project, trackId: string, updater: (track: Track) => Track): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => (track.id === trackId ? updater(track) : track)),
  };
}

function updateClip(project: Project, clipId: string, updater: (clip: Clip) => Clip): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => (clip.id === clipId ? updater(clip) : clip)),
    })),
  };
}

interface StudioContextValue {
  state: StudioState;
  project: Project;
  selection: StudioSelection;
  selectedTrack: Track | null;
  selectedClip: Clip | null;
  play: () => Promise<void>;
  stop: () => void;
  toggleLoop: () => void;
  toggleMetronome: () => void;
  setBpm: (bpm: number) => void;
  setMasterVolume: (value: number) => void;
  setCurrentBeat: (value: number) => void;
  setZoom: (value: number) => void;
  selectTrack: (trackId: string) => void;
  selectClip: (clipId: string) => void;
  setEditorMode: (mode: EditorMode) => void;
  addTrack: (kind: TrackKind) => void;
  removeTrack: (trackId: string) => void;
  armTrack: (trackId: string) => void;
  updateTrackMix: (
    trackId: string,
    patch: Partial<Pick<Track, "volume" | "pan" | "muted" | "solo">>,
  ) => void;
  setTrackInstrument: (trackId: string, instrument: InstrumentProgram) => void;
  addMidiClip: (trackId: string, startBeat: number) => void;
  addDrumClip: (trackId: string, startBeat: number) => void;
  toggleDrumStep: (clipId: string, row: keyof DrumPattern, step: number) => void;
  togglePianoNote: (clipId: string, pitch: number, stepBeat: number) => void;
  renameProject: (name: string) => void;
  exportWav: () => Promise<void>;
  exportMp3: () => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({
  children,
  enginePlay,
  engineStop,
  engineSync,
  engineSetMasterVolume,
  engineSetPositionListener,
  engineExport,
}: {
  children: ReactNode;
  enginePlay: (project: Project, fromBeat: number) => Promise<void>;
  engineStop: () => void;
  engineSync: (project: Project, masterVolume: number) => void;
  engineSetMasterVolume: (value: number) => void;
  engineSetPositionListener: (listener: ((beat: number) => void) | null) => void;
  engineExport: (project: Project) => Promise<AudioBuffer>;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const selectedTrack = useMemo(
    () => findTrack(state.project, state.selection.trackId),
    [state.project, state.selection.trackId],
  );

  const selectedClip = useMemo(
    () => findClip(state.project, state.selection.clipId),
    [state.project, state.selection.clipId],
  );

  const play = useCallback(async () => {
    engineSync(state.project, state.masterVolume);
    await enginePlay(state.project, state.transport.currentBeat);
    dispatch({ type: "SET_PLAYING", value: true });
  }, [enginePlay, engineSync, state.masterVolume, state.project, state.transport.currentBeat]);

  const stop = useCallback(() => {
    engineStop();
    dispatch({ type: "SET_PLAYING", value: false });
    dispatch({ type: "SET_RECORDING", value: false });
    dispatch({ type: "SET_CURRENT_BEAT", value: 0 });
  }, [engineStop]);

  const value = useMemo<StudioContextValue>(
    () => ({
      state,
      project: state.project,
      selection: state.selection,
      selectedTrack,
      selectedClip,
      play,
      stop,
      toggleLoop: () =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({ ...project, loopEnabled: !project.loopEnabled }),
        }),
      toggleMetronome: () =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({ ...project, metronomeEnabled: !project.metronomeEnabled }),
        }),
      setBpm: (bpm) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({ ...project, bpm: Math.max(40, Math.min(220, bpm)) }),
        }),
      setMasterVolume: (value) => {
        dispatch({ type: "SET_MASTER_VOLUME", value });
        engineSetMasterVolume(value);
      },
      setCurrentBeat: (value) => dispatch({ type: "SET_CURRENT_BEAT", value }),
      setZoom: (value) => dispatch({ type: "SET_ZOOM", value }),
      selectTrack: (trackId) => dispatch({ type: "SELECT_TRACK", trackId }),
      selectClip: (clipId) => dispatch({ type: "SELECT_CLIP", clipId }),
      setEditorMode: (mode) => dispatch({ type: "SET_EDITOR_MODE", mode }),
      addTrack: (kind) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const track: Track = {
              id: createId("track"),
              name:
                kind === "drums" ? "Drums" : kind === "audio" ? "Audio" : `Instrument ${project.tracks.length + 1}`,
              kind,
              color: trackColor(project.tracks.length),
              instrument: kind === "drums" ? "grand-piano" : "grand-piano",
              volume: 0.8,
              pan: 0,
              muted: false,
              solo: false,
              armed: false,
              clips: [],
            };
            return { ...project, tracks: [...project.tracks, track] };
          },
        }),
      removeTrack: (trackId) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({
            ...project,
            tracks: project.tracks.filter((track) => track.id !== trackId),
          }),
        }),
      armTrack: (trackId) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({
            ...project,
            tracks: project.tracks.map((track) => ({
              ...track,
              armed: track.id === trackId,
            })),
          }),
        }),
      updateTrackMix: (trackId, patch) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => updateTrack(project, trackId, (track) => ({ ...track, ...patch })),
        }),
      setTrackInstrument: (trackId, instrument) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => updateTrack(project, trackId, (track) => ({ ...track, instrument })),
        }),
      addMidiClip: (trackId, startBeat) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const clip: Clip = {
              id: createId("clip"),
              trackId,
              name: "MIDI Clip",
              kind: "midi",
              startBeat,
              durationBeat: 16,
              notes: [],
            };
            return updateTrack(project, trackId, (track) => ({
              ...track,
              clips: [...track.clips, clip],
            }));
          },
        }),
      addDrumClip: (trackId, startBeat) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const clip: Clip = {
              id: createId("clip"),
              trackId,
              name: "Drum Pattern",
              kind: "drums",
              startBeat,
              durationBeat: 16,
              pattern: createEmptyDrumPattern(),
            };
            return updateTrack(project, trackId, (track) => ({
              ...track,
              clips: [...track.clips, clip],
            }));
          },
        }),
      toggleDrumStep: (clipId, row, step) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) =>
            updateClip(project, clipId, (clip) => {
              if (!clip.pattern) return clip;
              const next = { ...clip.pattern, [row]: [...clip.pattern[row]] };
              next[row][step] = !next[row][step];
              return { ...clip, pattern: next };
            }),
        }),
      togglePianoNote: (clipId, pitch, stepBeat) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) =>
            updateClip(project, clipId, (clip) => {
              const notes = clip.notes ?? [];
              const existing = notes.find(
                (note) => note.pitch === pitch && Math.abs(note.startBeat - stepBeat) < 0.01,
              );
              const nextNotes = existing
                ? notes.filter((note) => note.id !== existing.id)
                : [
                    ...notes,
                    {
                      id: createId("note"),
                      pitch,
                      startBeat: stepBeat,
                      durationBeat: 0.9,
                      velocity: 0.8,
                    } satisfies MidiNote,
                  ];
              return { ...clip, notes: nextNotes };
            }),
        }),
      renameProject: (name) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({ ...project, name }),
        }),
      exportWav: async () => {
        const buffer = await engineExport(state.project);
        const { exportProjectWav } = await import("@/engine/export");
        await exportProjectWav(buffer, state.project.name);
      },
      exportMp3: async () => {
        const buffer = await engineExport(state.project);
        const { exportProjectMp3 } = await import("@/engine/export");
        await exportProjectMp3(buffer, state.project.name);
      },
    }),
    [
      engineExport,
      enginePlay,
      engineSetMasterVolume,
      engineStop,
      play,
      selectedClip,
      selectedTrack,
      state,
      stop,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudioTransportSync() {
  const { setCurrentBeat, stop } = useStudio();

  useEffect(() => {
    const engine = AudioEngine.getInstance();
    engine.setPositionListener((beat) => setCurrentBeat(beat));
    return () => {
      engine.setPositionListener(null);
    };
  }, [setCurrentBeat]);

  useEffect(() => {
    return () => {
      AudioEngine.getInstance().stop();
      stop();
    };
  }, [stop]);
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error("useStudio must be used within StudioProvider");
  }
  return context;
}

export { BEATS_PER_BAR };
