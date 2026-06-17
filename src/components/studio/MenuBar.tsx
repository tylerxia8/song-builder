"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  listStoredProjects,
  saveProjectToStorage,
  type ProjectSummary,
} from "@/lib/project-storage";
import { useStudio } from "@/store/project-store";

export function MenuBar() {
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
  } = useStudio();
  const [openMenu, setOpenMenu] = useState<"file" | "edit" | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      setProjects(await listStoredProjects());
    } finally {
      setLoadingProjects(false);
    }
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
        : "Not saved yet";

  return (
    <header className="relative z-40 flex h-11 items-center justify-between border-b border-white/10 bg-[#101018] px-4">
      <div className="flex items-center gap-5" data-menu-root>
        <Link href="/" className="text-sm font-semibold tracking-wide text-white">
          SongBuilder <span className="text-violet-400">Pro</span>
        </Link>
        <nav className="hidden items-center gap-1 text-xs text-zinc-300 md:flex">
          <div className="relative">
            <button
              type="button"
              className="rounded px-2 py-1 hover:bg-white/5"
              onClick={() => setOpenMenu((menu) => (menu === "file" ? null : "file"))}
            >
              File
            </button>
            {openMenu === "file" ? (
              <div className="absolute left-0 top-full mt-1 min-w-56 rounded-md border border-white/10 bg-[#171722] py-1 shadow-xl">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-white/5"
                  onClick={() => {
                    newProject();
                    setOpenMenu(null);
                  }}
                >
                  New Session
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-white/5"
                  onClick={() => {
                    void saveProject();
                    setOpenMenu(null);
                  }}
                >
                  Save
                </button>
                <div className="my-1 border-t border-white/10" />
                <p className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  Open Recent
                </p>
                {loadingProjects ? (
                  <p className="px-3 py-2 text-zinc-500">Loading…</p>
                ) : projects.length === 0 ? (
                  <p className="px-3 py-2 text-zinc-500">No saved sessions yet</p>
                ) : (
                  projects.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`block w-full px-3 py-2 text-left hover:bg-white/5 ${
                        item.id === project.id ? "text-violet-300" : ""
                      }`}
                      onClick={() => {
                        void openProject(item.id);
                        setOpenMenu(null);
                      }}
                    >
                      <span className="block truncate">{item.name}</span>
                      <span className="block text-[10px] text-zinc-500">
                        {new Date(item.updatedAt).toLocaleString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              className="rounded px-2 py-1 hover:bg-white/5"
              onClick={() => setOpenMenu((menu) => (menu === "edit" ? null : "edit"))}
            >
              Edit
            </button>
            {openMenu === "edit" ? (
              <div className="absolute left-0 top-full mt-1 min-w-44 rounded-md border border-white/10 bg-[#171722] py-1 shadow-xl">
                <button
                  type="button"
                  disabled={!canUndo}
                  className="block w-full px-3 py-2 text-left enabled:hover:bg-white/5 disabled:text-zinc-600"
                  onClick={() => {
                    undo();
                    setOpenMenu(null);
                  }}
                >
                  Undo <span className="text-zinc-500">Ctrl+Z</span>
                </button>
                <button
                  type="button"
                  disabled={!canRedo}
                  className="block w-full px-3 py-2 text-left enabled:hover:bg-white/5 disabled:text-zinc-600"
                  onClick={() => {
                    redo();
                    setOpenMenu(null);
                  }}
                >
                  Redo <span className="text-zinc-500">Ctrl+Shift+Z</span>
                </button>
              </div>
            ) : null}
          </div>

          <span className="px-2 py-1 text-zinc-500">View</span>
          <span className="px-2 py-1 text-zinc-500">Mix</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <p className="hidden truncate text-xs text-zinc-400 sm:block">{project.name}</p>
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{savedLabel}</p>
      </div>
    </header>
  );
}
