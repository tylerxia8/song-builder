import { cloneProject, loadActiveProject } from "@/lib/project-storage";
import { createDemoProject } from "@/lib/demo-project";
import type { Project } from "@/types/project";

const MAX_HISTORY = 50;

export interface ProjectHistory {
  past: Project[];
  future: Project[];
}

export function createInitialHistory(project: Project): ProjectHistory {
  return { past: [], future: [] };
}

export function pushHistory(history: ProjectHistory, project: Project): ProjectHistory {
  const past = [...history.past, cloneProject(project)];
  if (past.length > MAX_HISTORY) {
    past.shift();
  }
  return { past, future: [] };
}

export function undoHistory(history: ProjectHistory, present: Project): {
  history: ProjectHistory;
  project: Project | null;
} {
  if (history.past.length === 0) return { history, project: null };

  const previous = history.past[history.past.length - 1];
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [cloneProject(present), ...history.future],
    },
    project: cloneProject(previous),
  };
}

export function redoHistory(history: ProjectHistory, present: Project): {
  history: ProjectHistory;
  project: Project | null;
} {
  if (history.future.length === 0) return { history, project: null };

  const [next, ...future] = history.future;
  return {
    history: {
      past: [...history.past, cloneProject(present)],
      future,
    },
    project: cloneProject(next),
  };
}

export async function resolveInitialProject(): Promise<Project> {
  try {
    const restored = await loadActiveProject();
    if (restored) return restored;
  } catch {
    // Fall back to demo project when storage is unavailable.
  }
  return createDemoProject();
}
