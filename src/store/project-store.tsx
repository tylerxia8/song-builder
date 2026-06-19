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
import type { ExportPreset } from "@/engine/export";
import { detectKeyFromProject } from "@/lib/ai-assist";
import { registerAudioAsset, revokeProjectAudioUrls, collectProjectAssetIds, getAudioBlob } from "@/lib/audio-assets";
import { createDemoProject, createEmptyProject } from "@/lib/demo-project";
import { importAudioFile } from "@/lib/file-import";
import { createStarterTemplate } from "@/lib/starter-template";
import { resolveTrackFx, DEFAULT_TRACK_FX, type TrackFxSettings } from "@/lib/track-fx";
import { createTemplateForVibe, type SongVibe } from "@/lib/song-templates";
import { createKanyeTemplate } from "@/lib/kanye-template";
import {
  bufferToWavBlob,
  processChopSlice,
  type SampleSlice,
} from "@/lib/sample-chopper";
import { DEFAULT_VOCAL_POLISH, polishVocalBlob } from "@/lib/vocal-polish";
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
  type VocalPolishSettings,
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
    fx: DEFAULT_TRACK_FX,
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
  seekToBeat: (value: number) => void;
  setLoopRegion: (startBar: number, endBar: number) => void;
  previewNote: (pitch: number, velocity?: number) => Promise<void>;
  setZoom: (value: number) => void;
  selectTrack: (trackId: string) => void;
  selectClip: (clipId: string) => void;
  setEditorMode: (mode: EditorMode) => void;
  addTrack: (kind: TrackKind, options?: { instrument?: InstrumentProgram; name?: string }) => void;
  removeTrack: (trackId: string) => void;
  armTrack: (trackId: string) => void;
  updateTrackMix: (
    trackId: string,
    patch: Partial<Pick<Track, "volume" | "pan" | "muted" | "solo">>,
  ) => void;
  updateTrackFx: (trackId: string, patch: Partial<TrackFxSettings>) => void;
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
  recordVocal: () => Promise<void>;
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
  loadKanyeTemplate: () => Promise<void>;
  loadTemplateForVibe: (vibe: SongVibe) => Promise<void>;
  openProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  polishSelectedVocal: (amount?: number) => Promise<void>;
  setMixBalance: (vocalWeight: number) => void;
  importAudioClip: (file: File, startBeat: number) => Promise<void>;
  exportPreset: (preset: ExportPreset) => Promise<void>;
  exportStems: () => Promise<void>;
  placeChopOnTimeline: (params: {
    buffer: AudioBuffer;
    slice: SampleSlice;
    pitchSemitones?: number;
    reversed?: boolean;
    startBeat?: number;
  }) => Promise<void>;
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
  enginePreviewNote,
  engineSeek,
}: {
  children: ReactNode;
  enginePlay: (project: Project, fromBeat: number) => Promise<void>;
  engineStop: () => void;
  engineSync: (project: Project, masterVolume: number) => void;
  engineSetMasterVolume: (value: number) => void;
  engineSetPositionListener: (listener: ((beat: number) => void) | null) => void;
  engineExport: (project: Project, masterVolume: number, soloTrackId?: string | null) => Promise<AudioBuffer>;
  enginePreviewNote: (track: Track, pitch: number, velocity?: number) => Promise<void>;
  engineSeek: (beat: number) => void;
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
        sourceDurationBeat: durationBeat,
        audioOffsetBeat: 0,
        audioAssetId: assetId,
        audioUrl,
        vocalPolish: {
          amount: DEFAULT_VOCAL_POLISH.amount,
          key: state.project.songKey ?? detectKeyFromProject(state.project),
        },
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

  const recordVocal = useCallback(async () => {
    if (state.transport.isRecording) {
      await stopRecording();
      return;
    }

    dispatch({ type: "SET_RECORD_ERROR", value: null });
    engineStop();
    dispatch({ type: "SET_PLAYING", value: false });

    const hasArmed = state.project.tracks.some((track) => track.armed);
    if (!hasArmed) {
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
      } else {
        const newTrack = createTrackForKind(state.project, "audio", "Vocal");
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({
            ...project,
            tracks: [...project.tracks.map((track) => ({ ...track, armed: false })), { ...newTrack, armed: true }],
          }),
        });
        dispatch({ type: "SELECT_TRACK", trackId: newTrack.id });
      }
      dispatch({ type: "SELECT_CLIP", clipId: null, editorMode: "audio" });
    }

    try {
      await startMicCapture();
      dispatch({ type: "SET_RECORDING", value: true });
    } catch (error) {
      dispatch({ type: "SET_RECORD_ERROR", value: micPermissionMessage(error) });
    }
  }, [engineStop, state.project, state.transport.isRecording, stopRecording]);

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
      seekToBeat: (value) => {
        const beat = Math.max(0, value);
        dispatch({ type: "SET_CURRENT_BEAT", value: beat });
        if (!state.transport.isPlaying) engineSeek(beat);
      },
      setLoopRegion: (startBar, endBar) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({
            ...project,
            loopStartBar: Math.max(0, Math.min(startBar, endBar - 1)),
            loopEndBar: Math.max(startBar + 1, endBar),
            loopEnabled: true,
          }),
        }),
      previewNote: async (pitch, velocity = 0.8) => {
        const track =
          selectedTrack ??
          state.project.tracks.find((item) => item.kind === "instrument") ??
          state.project.tracks.find((item) => item.kind === "drums");
        if (!track || track.kind === "audio") return;
        engineSync(state.project, state.masterVolume);
        await enginePreviewNote(track, pitch, velocity);
      },
      setZoom: (value) => dispatch({ type: "SET_ZOOM", value }),
      selectTrack: (trackId) => dispatch({ type: "SELECT_TRACK", trackId }),
      selectClip: (clipId) => dispatch({ type: "SELECT_CLIP", clipId }),
      setEditorMode: (mode) => dispatch({ type: "SET_EDITOR_MODE", mode }),
      addTrack: (kind, options) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const track = createTrackForKind(project, kind, options?.name);
            return {
              ...project,
              tracks: [
                ...project.tracks,
                options?.instrument ? { ...track, instrument: options.instrument } : track,
              ],
            };
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
          updater: (project) => {
            const next = updateTrack(project, trackId, (track) => ({ ...track, instrument }));
            engineSync(next, state.masterVolume);
            return next;
          },
        }),
      updateTrackFx: (trackId, patch) =>
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const next = updateTrack(project, trackId, (track) => ({
              ...track,
              fx: {
                reverb: { ...resolveTrackFx(track.fx).reverb, ...patch.reverb },
                delay: { ...resolveTrackFx(track.fx).delay, ...patch.delay },
                filter: { ...resolveTrackFx(track.fx).filter, ...patch.filter },
              },
            }));
            engineSync(next, state.masterVolume);
            return next;
          },
        }),
      addMidiClip: (trackId, startBeat) => {
        const clipId = createId("clip");
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const clip: Clip = {
              id: clipId,
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
        });
        dispatch({ type: "SELECT_TRACK", trackId });
        dispatch({ type: "SELECT_CLIP", clipId, editorMode: "piano-roll" });
      },
      addDrumClip: (trackId, startBeat) => {
        const clipId = createId("clip");
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const clip: Clip = {
              id: clipId,
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
        });
        dispatch({ type: "SELECT_TRACK", trackId });
        dispatch({ type: "SELECT_CLIP", clipId, editorMode: "drum-machine" });
      },
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
      recordVocal,
      startRecording,
      stopRecording,
      exportWav: async () => {
        const buffer = await engineExport(state.project, state.masterVolume);
        const { exportWithPreset } = await import("@/engine/export");
        await exportWithPreset(buffer, state.project.name, "release-wav");
      },
      exportMp3: async () => {
        const buffer = await engineExport(state.project, state.masterVolume);
        const { exportWithPreset } = await import("@/engine/export");
        await exportWithPreset(buffer, state.project.name, "demo-mp3");
      },
      exportPreset: async (preset) => {
        const buffer = await engineExport(state.project, state.masterVolume);
        const { exportWithPreset } = await import("@/engine/export");
        await exportWithPreset(buffer, state.project.name, preset);
      },
      exportStems: async () => {
        const { exportStemWav } = await import("@/engine/export");
        for (const track of state.project.tracks) {
          const buffer = await engineExport(state.project, state.masterVolume, track.id);
          await exportStemWav(buffer, state.project.name, track.name);
        }
      },
      polishSelectedVocal: async (amount = DEFAULT_VOCAL_POLISH.amount) => {
        const clip =
          findClip(state.project, state.selection.clipId) ??
          state.project.tracks.flatMap((track) => track.clips).find((item) => item.kind === "audio");
        if (!clip?.audioUrl) return;

        const blob =
          (clip.audioAssetId ? getAudioBlob(clip.audioAssetId) : undefined) ??
          (await fetch(clip.audioUrl).then((response) => response.blob()));
        if (!blob) return;
        const settings: VocalPolishSettings = {
          amount,
          key: clip.vocalPolish?.key ?? state.project.songKey ?? detectKeyFromProject(state.project),
        };
        const polished = await polishVocalBlob(blob, settings);

        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) =>
            updateClip(project, clip.id, (current) => ({
              ...current,
              audioAssetId: polished.assetId,
              audioUrl: polished.audioUrl,
              vocalPolish: settings,
              name: `${current.name} · polished`,
            })),
        });
      },
      setMixBalance: (vocalWeight) => {
        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => ({
            ...project,
            tracks: project.tracks.map((track) => ({
              ...track,
              volume:
                track.kind === "audio"
                  ? 0.5 + vocalWeight * 0.45
                  : Math.max(0.35, 0.9 - vocalWeight * 0.4),
            })),
          }),
        });
        engineSync(state.project, state.masterVolume);
      },
      importAudioClip: async (file, startBeat) => {
        const result = await importAudioFile(file, state.project, state.selection.trackId, startBeat);
        if (!result) throw new Error("Unsupported audio file");

        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => {
            const trackExists = project.tracks.some((track) => track.id === result.trackId);
            let next = project;
            if (!trackExists) {
              next = {
                ...project,
                tracks: [
                  ...project.tracks,
                  {
                    ...createTrackForKind(project, "audio", "Imported Audio"),
                    id: result.trackId,
                    clips: [],
                  },
                ],
              };
            }
            return insertClipsOnTrack(next, result.trackId, [result.clip]);
          },
        });
        dispatch({ type: "SELECT_CLIP", clipId: result.clip.id, editorMode: "audio" });
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
      loadKanyeTemplate: async () => {
        engineStop();
        const project = await createKanyeTemplate();
        dispatch({ type: "LOAD_PROJECT", project });
        const sampleTrack = project.tracks.find((track) => track.name === "Sample");
        if (sampleTrack) {
          dispatch({ type: "SELECT_TRACK", trackId: sampleTrack.id });
          dispatch({
            type: "SELECT_CLIP",
            clipId: sampleTrack.clips[0]?.id ?? null,
            editorMode: "audio",
          });
        }
      },
      loadTemplateForVibe: async (vibe) => {
        if (vibe === "kanye") {
          const project = await createKanyeTemplate();
          engineStop();
          dispatch({ type: "LOAD_PROJECT", project });
          const sampleTrack = project.tracks.find((track) => track.name === "Sample");
          if (sampleTrack) {
            dispatch({ type: "SELECT_TRACK", trackId: sampleTrack.id });
            dispatch({
              type: "SELECT_CLIP",
              clipId: sampleTrack.clips[0]?.id ?? null,
              editorMode: "audio",
            });
          }
          return;
        }

        engineStop();
        const project = createTemplateForVibe(vibe);
        dispatch({ type: "LOAD_PROJECT", project });
        const vocalTrack = project.tracks.find((track) => track.kind === "audio");
        if (vocalTrack) {
          dispatch({ type: "SELECT_TRACK", trackId: vocalTrack.id });
          dispatch({ type: "SELECT_CLIP", clipId: null, editorMode: "audio" });
        }
      },
      placeChopOnTimeline: async ({
        buffer,
        slice,
        pitchSemitones = 0,
        reversed = false,
        startBeat = state.transport.currentBeat,
      }) => {
        const processed = await processChopSlice(buffer, slice, { pitchSemitones, reversed });
        const blob = bufferToWavBlob(processed);
        const assetId = createId("audio");
        const audioUrl = registerAudioAsset(assetId, blob);
        const durationBeat = secondsToBeats(processed.duration, state.project.bpm);

        const sampleTrack =
          state.project.tracks.find((track) => track.name === "Sample") ??
          state.project.tracks.find((track) => track.kind === "audio" && !track.armed) ??
          state.project.tracks.find((track) => track.kind === "audio");

        if (!sampleTrack) return;

        const clip: Clip = {
          id: createId("clip"),
          trackId: sampleTrack.id,
          name: `Chop ${slice.index + 1}${reversed ? " · flip" : ""}${pitchSemitones ? ` · ${pitchSemitones > 0 ? "+" : ""}${pitchSemitones}st` : ""}`,
          kind: "audio",
          startBeat: snapBeat(Math.max(0, startBeat)),
          durationBeat,
          sourceDurationBeat: durationBeat,
          audioOffsetBeat: 0,
          audioAssetId: assetId,
          audioUrl,
        };

        dispatch({
          type: "UPDATE_PROJECT",
          updater: (project) => insertClipsOnTrack(project, sampleTrack.id, [clip]),
        });
        dispatch({ type: "SELECT_CLIP", clipId: clip.id, editorMode: "audio" });
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
      recordVocal,
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
