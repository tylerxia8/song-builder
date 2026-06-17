"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { AudioEngine } from "@/engine/audio-engine";
import { registerAudioAsset, revokeProjectAudioUrls, collectProjectAssetIds } from "@/lib/audio-assets";
import { createDemoProject, createEmptyProject } from "@/lib/demo-project";
import { createStarterTemplate } from "@/lib/starter-template";
import { createInitialHistory, pushHistory, redoHistory, resolveInitialProject, undoHistory, type ProjectHistory } from "@/lib/project-history";
import { loadProjectFromStorage, saveProjectToStorage } from "@/lib/project-storage";
import { trackColor } from "@/lib/colors";
import {
  canPlaceClipOnTrack,
  duplicateClip,
  resizeClipFromLeft,
  resizeClipFromRight,
  snapBeat,
  splitClipAtBeat,
} from "@/lib/clip-editing";
import {
  cancelMicCapture,
  micPermissionMessage,
  secondsToBeats,
  startMicCapture,
  stopMicCapture,
} from "@/lib/recording";
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
  history: ProjectHistory;
  selection: StudioSelection;
  transport: {
    isPlaying: boolean;
    isRecording: boolean;
    currentBeat: number;
  };
  masterVolume: number;
  zoom: number;
  recordError: string | null;
}

type StudioAction =
  | { type: "SET_PLAYING"; value: boolean }
  | { type: "SET_RECORDING"; value: boolean }
  | { type: "SET_CURRENT_BEAT"; value: number }
  | { type: "SET_MASTER_VOLUME"; value: number }
  | { type: "SET_ZOOM"; value: number }
  | { type: "SET_RECORD_ERROR"; value: string | null }
  | {
      type: "UPDATE_PROJECT";
      updater: (project: Project) => Project;
      recordHistory?: boolean;
    }
  | { type: "LOAD_PROJECT"; project: Project }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SELECT_TRACK"; trackId: string | null }
  | { type: "SELECT_CLIP"; clipId: string | null; editorMode?: EditorMode }
  | { type: "SET_EDITOR_MODE"; mode: EditorMode };

function defaultSelection(project: Project): StudioSelection {
  const firstTrack = project.tracks[0];
  const firstClip = firstTrack?.clips[0];

  return {
    trackId: firstTrack?.id ?? null,
    clipId: firstClip?.id ?? null,
    editorMode:
      firstClip?.kind === "drums"
        ? "drum-machine"
        : firstClip?.kind === "audio"
          ? "audio"
          : "piano-roll",
  };
}

function initialState(): StudioState {
  const project = createDemoProject();

  return {
    project,
    history: createInitialHistory(project),
    selection: defaultSelection(project),
    transport: {
      isPlaying: false,
      isRecording: false,
      currentBeat: 0,
    },
    masterVolume: 0.92,
    zoom: 1,
    recordError: null,
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
    case "SET_RECORD_ERROR":
      return { ...state, recordError: action.value };
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
    case "UPDATE_PROJECT": {
      const nextProject = action.updater(state.project);
      if (nextProject === state.project) return state;

      const history =
        action.recordHistory === false
          ? state.history
          : pushHistory(state.history, state.project);

      return { ...state, project: nextProject, history };
    }
    case "LOAD_PROJECT":
      revokeProjectAudioUrls(collectProjectAssetIds(state.project.tracks));
      return {
        ...state,
        project: action.project,
        history: createInitialHistory(action.project),
        selection: defaultSelection(action.project),
        transport: { ...state.transport, isPlaying: false, isRecording: false, currentBeat: 0 },
        recordError: null,
      };
    case "UNDO": {
      const result = undoHistory(state.history, state.project);
      if (!result.project) return state;
      return { ...state, project: result.project, history: result.history };
    }
    case "REDO": {
      const result = redoHistory(state.history, state.project);
      if (!result.project) return state;
      return { ...state, project: result.project, history: result.history };
    }
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

function removeClip(project: Project, clipId: string): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((clip) => clip.id !== clipId),
    })),
  };
}

function replaceClip(project: Project, clipId: string, nextClip: Clip): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => (clip.id === clipId ? nextClip : clip)),
    })),
  };
}

function insertClipsOnTrack(project: Project, trackId: string, clips: Clip[]): Project {
  return updateTrack(project, trackId, (track) => ({
    ...track,
    clips: [...track.clips, ...clips],
  }));
}

function createTrackForKind(project: Project, kind: TrackKind, name?: string): Track {
  return {
    id: createId("track"),
    name:
      name ??
      (kind === "drums" ? "Drums" : kind === "audio" ? "Audio" : `Instrument ${project.tracks.length + 1}`),
    kind,
    color: trackColor(project.tracks.length),
    instrument: "grand-piano",
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    armed: false,
    clips: [],
  };
}

interface StudioContextValue {
  state: StudioState;
  project: Project;
  selection: StudioSelection;
  selectedTrack: Track | null;
  selectedClip: Clip | null;
  armedTrack: Track | null;
  recordError: string | null;
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
  moveClip: (clipId: string, trackId: string, startBeat: number) => void;
  resizeClip: (clipId: string, startBeat: number, durationBeat: number) => void;
  duplicateSelectedClip: () => void;
  splitSelectedClip: (absoluteBeat: number) => void;
  deleteSelectedClip: () => void;
  setupRecordingTrack: (name?: string) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  exportWav: () => Promise<void>;
  exportMp3: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  newProject: () => void;
  loadStarterTemplate: () => void;
  openProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  isHydrated: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
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
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    resolveInitialProject()
      .then((project) => {
        dispatch({ type: "LOAD_PROJECT", project });
        setIsHydrated(true);
      })
      .catch(() => {
        setIsHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const timer = setTimeout(() => {
      setIsSaving(true);
      saveProjectToStorage(state.project)
        .then(() => setLastSavedAt(Date.now()))
        .catch(() => {
          // Ignore background autosave failures.
        })
        .finally(() => setIsSaving(false));
    }, 1500);

    return () => clearTimeout(timer);
  }, [isHydrated, state.project]);

  const selectedTrack = useMemo(
    () => findTrack(state.project, state.selection.trackId),
    [state.project, state.selection.trackId],
  );

  const selectedClip = useMemo(
    () => findClip(state.project, state.selection.clipId),
    [state.project, state.selection.clipId],
  );

  const armedTrack = useMemo(
    () => state.project.tracks.find((track) => track.armed) ?? null,
    [state.project.tracks],
  );

  const play = useCallback(async () => {
    engineSync(state.project, state.masterVolume);
    await enginePlay(state.project, state.transport.currentBeat);
    dispatch({ type: "SET_PLAYING", value: true });
  }, [enginePlay, engineSync, state.masterVolume, state.project, state.transport.currentBeat]);

  const stop = useCallback(() => {
    if (state.transport.isRecording) {
      cancelMicCapture();
      dispatch({ type: "SET_RECORDING", value: false });
    }
    engineStop();
    dispatch({ type: "SET_PLAYING", value: false });
    dispatch({ type: "SET_CURRENT_BEAT", value: 0 });
  }, [engineStop, state.transport.isRecording]);

  const setupRecordingTrack = useCallback((name = "My Voice") => {
    dispatch({ type: "SET_RECORD_ERROR", value: null });

    const existingAudio = state.project.tracks.find((track) => track.kind === "audio");
    if (existingAudio) {
      dispatch({
        type: "UPDATE_PROJECT",
        updater: (project) => ({
          ...project,
          tracks: project.tracks.map((track) => ({
            ...track,
            armed: track.id === existingAudio.id,
          })),
        }),
      });
      dispatch({ type: "SELECT_TRACK", trackId: existingAudio.id });
      dispatch({ type: "SELECT_CLIP", clipId: null, editorMode: "audio" });
      return;
    }

    const newTrack = createTrackForKind(state.project, "audio", name);
    dispatch({
      type: "UPDATE_PROJECT",
      updater: (project) => ({
        ...project,
        tracks: [...project.tracks.map((track) => ({ ...track, armed: false })), { ...newTrack, armed: true }],
      }),
    });
    dispatch({ type: "SELECT_TRACK", trackId: newTrack.id });
    dispatch({ type: "SELECT_CLIP", clipId: null, editorMode: "audio" });
  }, [state.project]);

  const startRecording = useCallback(async () => {
    const armed = state.project.tracks.find((track) => track.armed);
    if (!armed) {
      dispatch({
        type: "SET_RECORD_ERROR",
        value: "Choose a track and click Arm for recording before you start.",
      });
      return;
    }

    dispatch({ type: "SET_RECORD_ERROR", value: null });
    engineStop();
    dispatch({ type: "SET_PLAYING", value: false });

    try {
      await startMicCapture();
      dispatch({ type: "SET_RECORDING", value: true });
    } catch (error) {
      dispatch({ type: "SET_RECORD_ERROR", value: micPermissionMessage(error) });
    }
  }, [engineStop, state.project.tracks]);

  const stopRecording = useCallback(async () => {
    const armed = state.project.tracks.find((track) => track.armed);
    if (!armed || !state.transport.isRecording) return;

    try {
      const { blob, durationSec } = await stopMicCapture();
      const assetId = createId("audio");
      const audioUrl = registerAudioAsset(assetId, blob);
      const durationBeat = secondsToBeats(durationSec, state.project.bpm);
      const takeNumber = armed.clips.filter((clip) => clip.kind === "audio").length + 1;
      const clip: Clip = {
        id: createId("clip"),
        trackId: armed.id,
        name: `${armed.name} Take ${takeNumber}`,
        kind: "audio",
        startBeat: state.transport.currentBeat,
        durationBeat,
        audioAssetId: assetId,
        audioUrl,
      };

      dispatch({
        type: "UPDATE_PROJECT",
        updater: (project) => insertClipsOnTrack(project, armed.id, [clip]),
      });
      dispatch({ type: "SELECT_CLIP", clipId: clip.id, editorMode: "audio" });
      dispatch({ type: "SET_RECORD_ERROR", value: null });
    } catch (error) {
      dispatch({
        type: "SET_RECORD_ERROR",
        value: error instanceof Error ? error.message : "Could not save your recording.",
      });
    } finally {
      dispatch({ type: "SET_RECORDING", value: false });
    }
  }, [state.project.bpm, state.project.tracks, state.transport.currentBeat, state.transport.isRecording]);

  const value = useMemo<StudioContextValue>(
    () => ({
      state,
      project: state.project,
      selection: state.selection,
      selectedTrack,
      selectedClip,
      armedTrack,
      recordError: state.recordError,
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
          updater: (project) => ({
            ...project,
            tracks: [...project.tracks, createTrackForKind(project, kind)],
          }),
        }),
      removeTrack: (trackId) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({
            ...project,
            tracks: project.tracks.filter((track) => track.id !== trackId),
          }),
        }),
      armTrack: (trackId) => {
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({
            ...project,
            tracks: project.tracks.map((track) => ({
              ...track,
              armed: track.id === trackId,
            })),
          }),
        });
        dispatch({ type: "SELECT_TRACK", trackId });
        dispatch({ type: "SET_RECORD_ERROR", value: null });
      },
      updateTrackMix: (trackId, patch) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const next = updateTrack(project, trackId, (track) => ({ ...track, ...patch }));
            engineSync(next, state.masterVolume);
            return next;
          },
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
      moveClip: (clipId, trackId, startBeat) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const clip = findClip(project, clipId);
            const sourceTrack = project.tracks.find((track) =>
              track.clips.some((item) => item.id === clipId),
            );
            const targetTrack = project.tracks.find((track) => track.id === trackId);
            if (!clip || !sourceTrack || !targetTrack) return project;
            if (!canPlaceClipOnTrack(clip.kind, targetTrack.kind)) return project;

            const moved: Clip = {
              ...clip,
              trackId,
              startBeat: snapBeat(Math.max(0, startBeat)),
            };
            let next = removeClip(project, clipId);
            next = insertClipsOnTrack(next, trackId, [moved]);
            return next;
          },
        }),
      resizeClip: (clipId, startBeat, durationBeat) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const clip = findClip(project, clipId);
            if (!clip) return project;

            let next = clip;
            if (startBeat !== clip.startBeat) {
              next = resizeClipFromLeft(clip, startBeat - clip.startBeat) ?? next;
            }
            if (durationBeat !== next.durationBeat) {
              next = resizeClipFromRight(next, durationBeat - next.durationBeat) ?? next;
            }

            return replaceClip(project, clipId, next);
          },
        }),
      duplicateSelectedClip: () => {
        const clip = findClip(state.project, state.selection.clipId);
        if (!clip) return;
        const copy = duplicateClip(clip);
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => insertClipsOnTrack(project, clip.trackId, [copy]),
        });
        dispatch({ type: "SELECT_CLIP", clipId: copy.id });
      },
      splitSelectedClip: (absoluteBeat) => {
        const clip = findClip(state.project, state.selection.clipId);
        if (!clip) return;
        const split = splitClipAtBeat(clip, absoluteBeat);
        if (!split) return;
        const [first, second] = split;
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            let next = replaceClip(project, clip.id, first);
            next = insertClipsOnTrack(next, clip.trackId, [second]);
            return next;
          },
        });
        dispatch({ type: "SELECT_CLIP", clipId: second.id });
      },
      deleteSelectedClip: () => {
        const clipId = state.selection.clipId;
        if (!clipId) return;
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => removeClip(project, clipId),
        });
        dispatch({ type: "SELECT_CLIP", clipId: null });
      },
      setupRecordingTrack,
      startRecording,
      stopRecording,
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
      undo: () => dispatch({ type: "UNDO" }),
      redo: () => dispatch({ type: "REDO" }),
      canUndo: state.history.past.length > 0,
      canRedo: state.history.future.length > 0,
      newProject: () => {
        engineStop();
        dispatch({ type: "LOAD_PROJECT", project: createEmptyProject() });
      },
      loadStarterTemplate: () => {
        engineStop();
        const project = createStarterTemplate();
        dispatch({ type: "LOAD_PROJECT", project });
        const vocalTrack = project.tracks.find((track) => track.kind === "audio");
        if (vocalTrack) {
          dispatch({ type: "SELECT_TRACK", trackId: vocalTrack.id });
          dispatch({ type: "SELECT_CLIP", clipId: null, editorMode: "audio" });
        }
      },
      openProject: async (projectId) => {
        const project = await loadProjectFromStorage(projectId);
        if (!project) return;
        engineStop();
        dispatch({ type: "LOAD_PROJECT", project });
      },
      saveProject: async () => {
        setIsSaving(true);
        try {
          await saveProjectToStorage(state.project);
          setLastSavedAt(Date.now());
        } finally {
          setIsSaving(false);
        }
      },
      isHydrated,
      isSaving,
      lastSavedAt,
    }),
    [
      engineExport,
      enginePlay,
      engineSetMasterVolume,
      engineSync,
      engineStop,
      isHydrated,
      isSaving,
      lastSavedAt,
      play,
      setupRecordingTrack,
      startRecording,
      stopRecording,
      selectedClip,
      selectedTrack,
      armedTrack,
      state,
      stop,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudioHydrationGate(children: ReactNode) {
  const { isHydrated } = useStudio();
  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0b10] text-sm text-zinc-400">
        Loading session…
      </div>
    );
  }
  return children;
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
