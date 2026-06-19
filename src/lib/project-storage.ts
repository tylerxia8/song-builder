import {
  collectProjectAssetIds,
  ensureAudioUrl,
  getAudioBlob,
  registerAudioAsset,
  revokeProjectAudioUrls,
} from "@/lib/audio-assets";
import { createId, type Clip, type Project } from "@/types/project";

const DB_NAME = "songbuilder-pro";
const DB_VERSION = 1;
const PROJECTS_STORE = "projects";
const AUDIO_STORE = "audioAssets";
const ACTIVE_PROJECT_KEY = "active-project-id";

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}

interface StoredProjectRecord {
  id: string;
  name: string;
  updatedAt: number;
  project: PersistedProject;
}

export type PersistedProject = Omit<Project, "tracks"> & {
  tracks: Array<
    Omit<Project["tracks"][number], "clips"> & {
      clips: PersistedClip[];
    }
  >;
};

type PersistedClip = Omit<Clip, "audioUrl">;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open project database."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

async function blobFromUrl(url: string): Promise<Blob> {
  const response = await fetch(url);
  return response.blob();
}

function stripRuntimeFields(project: Project): PersistedProject {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map(({ audioUrl: _audioUrl, ...clip }) => ({ ...clip })),
    })),
  };
}

async function persistClipAudio(
  clip: Clip,
  store: IDBObjectStore,
): Promise<PersistedClip> {
  if (clip.kind !== "audio") {
    const { audioUrl: _audioUrl, ...rest } = clip;
    return rest;
  }

  let assetId = clip.audioAssetId;
  if (clip.audioUrl?.startsWith("blob:")) {
    if (!assetId) assetId = createId("audio");
    const blob = getAudioBlob(assetId) ?? (await blobFromUrl(clip.audioUrl));
    registerAudioAsset(assetId, blob);
    store.put(blob, assetId);
  }

  const { audioUrl: _audioUrl, ...rest } = clip;
  return { ...rest, audioAssetId: assetId };
}

async function persistAudioAssets(project: Project): Promise<PersistedProject> {
  const db = await openDb();
  const tx = db.transaction(AUDIO_STORE, "readwrite");
  const store = tx.objectStore(AUDIO_STORE);

  const tracks = await Promise.all(
    project.tracks.map(async (track) => ({
      ...track,
      clips: await Promise.all(track.clips.map((clip) => persistClipAudio(clip, store))),
    })),
  );

  await transactionDone(tx);
  db.close();

  return { ...stripRuntimeFields(project), tracks };
}

async function hydrateAudioAssets(project: PersistedProject): Promise<Project> {
  const db = await openDb();
  const tx = db.transaction(AUDIO_STORE, "readonly");
  const store = tx.objectStore(AUDIO_STORE);

  const tracks = await Promise.all(
    project.tracks.map(async (track) => ({
      ...track,
      clips: await Promise.all(
        track.clips.map(async (clip) => {
          if (clip.kind !== "audio" || !clip.audioAssetId) return clip as Clip;

          let blob = getAudioBlob(clip.audioAssetId);
          if (!blob) {
            blob = (await requestToPromise(store.get(clip.audioAssetId))) as Blob | undefined;
          }
          if (!blob) return { ...clip, audioUrl: undefined } as Clip;

          const audioUrl = await ensureAudioUrl(clip.audioAssetId, blob);
          return { ...clip, audioUrl } as Clip;
        }),
      ),
    })),
  );

  await transactionDone(tx);
  db.close();

  return { ...project, tracks };
}

export async function saveProjectToStorage(project: Project): Promise<void> {
  const persisted = await persistAudioAssets(project);
  const db = await openDb();
  const tx = db.transaction(PROJECTS_STORE, "readwrite");
  const store = tx.objectStore(PROJECTS_STORE);

  const record: StoredProjectRecord = {
    id: project.id,
    name: project.name,
    updatedAt: Date.now(),
    project: persisted,
  };

  store.put(record);
  await transactionDone(tx);
  db.close();

  localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
}

export async function loadProjectFromStorage(projectId: string): Promise<Project | null> {
  const db = await openDb();
  const tx = db.transaction(PROJECTS_STORE, "readonly");
  const store = tx.objectStore(PROJECTS_STORE);
  const record = (await requestToPromise(store.get(projectId))) as StoredProjectRecord | undefined;
  await transactionDone(tx);
  db.close();

  if (!record) return null;
  return hydrateAudioAssets(record.project);
}

export async function listStoredProjects(): Promise<ProjectSummary[]> {
  const db = await openDb();
  const tx = db.transaction(PROJECTS_STORE, "readonly");
  const store = tx.objectStore(PROJECTS_STORE);
  const records = (await requestToPromise(store.getAll())) as StoredProjectRecord[];
  await transactionDone(tx);
  db.close();

  return records
    .map((record) => ({
      id: record.id,
      name: record.name,
      updatedAt: record.updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProjectFromStorage(projectId: string): Promise<void> {
  const project = await loadProjectFromStorage(projectId);
  if (project) {
    revokeProjectAudioUrls(collectProjectAssetIds(project.tracks));
  }

  const db = await openDb();
  const tx = db.transaction([PROJECTS_STORE, AUDIO_STORE], "readwrite");
  tx.objectStore(PROJECTS_STORE).delete(projectId);

  if (project) {
    const audioStore = tx.objectStore(AUDIO_STORE);
    for (const assetId of collectProjectAssetIds(project.tracks)) {
      audioStore.delete(assetId);
    }
  }

  await transactionDone(tx);
  db.close();

  if (localStorage.getItem(ACTIVE_PROJECT_KEY) === projectId) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

export function clearActiveProject(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(projectId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
}

export async function loadActiveProject(): Promise<Project | null> {
  const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
  if (!activeId) return null;
  return loadProjectFromStorage(activeId);
}

export function cloneProject(project: Project): Project {
  return structuredClone(project);
}
