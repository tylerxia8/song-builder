"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  listStoredProjects,
  saveProjectToStorage,
  type ProjectSummary,
} from "@/lib/project-storage";
import { useStudio } from "@/store/project-store";

export function StudioHeader() {
  const {
    project,
    canUndo,
    canRedo,
    undo,
    redo,
    newProject,
    openProject,
    saveProject,
    isSaving,
    lastSavedAt,
    exportPreset,
    exportStems,
  } = useStudio();

  const [openMenu, setOpenMenu] = useState<"file" | "edit" | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  const refreshProjects = useCallback(async () => {
    setProjects(await listStoredProjects());
  }, []);

  useEffect(() => {
    if (openMenu !== "file") return;
    void refreshProjects();
  }, [openMenu, refreshProjects]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest("[data-menu-root]")) {
        setOpenMenu(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const savedLabel =
    lastSavedAt != null
      ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : isSaving
        ? "Saving…"
        : "Autosave on";

  return (
    <header className="relative z-40 flex h-11 shrink-0 items-center justify-between border-b border-[var(--sf-border)] bg-[var(--sf-panel)] px-3">
      <div className="flex min-w-0 items-center gap-3" data-menu-root>
        <Link
          href="/"
          className="rounded p-1 text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-2)] hover:text-white"
          title="Back to projects"
        >
          ←
        </Link>

        <div className="relative">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs font-medium text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-2)] hover:text-white"
            onClick={() => setOpenMenu((menu) => (menu === "file" ? null : "file"))}
          >
            File
          </button>
          {openMenu === "file" ? (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-52 rounded-md border border-[var(--sf-border)] bg-[var(--sf-panel-2)] py-1 shadow-2xl">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--sf-panel-3)]"
                onClick={() => {
                  newProject();
                  setOpenMenu(null);
                }}
              >
                New project
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--sf-panel-3)]"
                onClick={() => {
                  void saveProject();
                  setOpenMenu(null);
                }}
              >
                Save
              </button>
              <div className="my-1 border-t border-[var(--sf-border)]" />
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--sf-text-muted)]">
                Open recent
              </p>
              {projects.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[var(--sf-text-muted)]">No saved projects</p>
              ) : (
                projects.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-[var(--sf-panel-3)] ${
                      item.id === project.id ? "text-[var(--sf-accent)]" : ""
                    }`}
                    onClick={() => {
                      void openProject(item.id);
                      setOpenMenu(null);
                    }}
                  >
                    {item.name}
                  </button>
                ))
              )}
              <div className="my-1 border-t border-[var(--sf-border)]" />
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--sf-panel-3)]"
                onClick={() => {
                  void exportPreset("demo-mp3");
                  setOpenMenu(null);
                }}
              >
                Export Demo MP3
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--sf-panel-3)]"
                onClick={() => {
                  void exportPreset("release-wav");
                  setOpenMenu(null);
                }}
              >
                Export Release WAV
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--sf-panel-3)]"
                onClick={() => {
                  void exportStems();
                  setOpenMenu(null);
                }}
              >
                Export stems
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs font-medium text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-2)] hover:text-white"
            onClick={() => setOpenMenu((menu) => (menu === "edit" ? null : "edit"))}
          >
            Edit
          </button>
          {openMenu === "edit" ? (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-44 rounded-md border border-[var(--sf-border)] bg-[var(--sf-panel-2)] py-1 shadow-2xl">
              <button
                type="button"
                disabled={!canUndo}
                className="block w-full px-3 py-2 text-left text-sm enabled:hover:bg-[var(--sf-panel-3)] disabled:text-[var(--sf-text-muted)]"
                onClick={() => {
                  undo();
                  setOpenMenu(null);
                }}
              >
                Undo <span className="text-[var(--sf-text-muted)]">Ctrl+Z</span>
              </button>
              <button
                type="button"
                disabled={!canRedo}
                className="block w-full px-3 py-2 text-left text-sm enabled:hover:bg-[var(--sf-panel-3)] disabled:text-[var(--sf-text-muted)]"
                onClick={() => {
                  redo();
                  setOpenMenu(null);
                }}
              >
                Redo <span className="text-[var(--sf-text-muted)]">Ctrl+Y</span>
              </button>
            </div>
          ) : null}
        </div>

        <p className="truncate text-sm font-semibold text-white">{project.name}</p>
      </div>

      <div className="flex items-center gap-3">
        <p className="hidden text-[11px] text-[var(--sf-text-muted)] sm:block">{savedLabel}</p>
        <button
          type="button"
          onClick={() => void saveProjectToStorage(project)}
          className="rounded-md border border-[var(--sf-border)] px-3 py-1.5 text-xs font-medium text-[var(--sf-text-muted)] hover:bg-[var(--sf-panel-2)] hover:text-white"
        >
          Share
        </button>
      </div>
    </header>
  );
}
