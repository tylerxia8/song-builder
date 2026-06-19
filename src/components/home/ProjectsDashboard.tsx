"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  clearActiveProject,
  listStoredProjects,
  setActiveProjectId,
  type ProjectSummary,
} from "@/lib/project-storage";

const FEATURED_GROUPS = [
  { name: "Hip Hop & Trap", members: "3.1k", color: "#0099ff" },
  { name: "Experimental", members: "1.3k", color: "#a78bfa" },
  { name: "Newbies Corner", members: "8.0k", color: "#34d399" },
];

export function ProjectsDashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await listStoredProjects());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openProject = (projectId: string) => {
    setActiveProjectId(projectId);
  };

  const createProject = () => {
    clearActiveProject();
  };

  return (
    <div className="min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--sf-border)] bg-[var(--sf-panel)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Song<span className="text-[var(--sf-accent)]">Builder</span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm text-[var(--sf-text-muted)] md:flex">
              <span className="rounded-md px-3 py-1.5 text-white">Home</span>
              <span className="rounded-md px-3 py-1.5 hover:text-white">Community</span>
              <span className="rounded-md px-3 py-1.5 hover:text-white">Learn</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm text-[var(--sf-text-muted)] hover:text-white"
            >
              Log in
            </button>
            <Link
              href="/studio?new=1"
              onClick={createProject}
              className="sf-accent-btn rounded-md px-4 py-2 text-sm font-semibold"
            >
              Open studio
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="overflow-hidden rounded-2xl border border-[var(--sf-border)] bg-gradient-to-br from-[#1a2744] via-[var(--sf-panel)] to-[var(--sf-bg)] p-8 md:p-12">
          <p className="text-sm font-medium text-[var(--sf-accent)]">Online studio</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight md:text-5xl">
            Make music in your browser.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--sf-text-muted)]">
            Record, arrange, and mix with loops, instruments, and effects — inspired by the
            Soundation workflow you know.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/studio?new=1"
              onClick={createProject}
              className="sf-accent-btn rounded-lg px-5 py-3 text-sm font-semibold"
            >
              Create project
            </Link>
            <Link
              href="/studio"
              className="rounded-lg border border-[var(--sf-border)] bg-[var(--sf-panel-2)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--sf-panel-3)]"
            >
              Continue last session
            </Link>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">My projects</h2>
            <Link href="/studio?new=1" onClick={createProject} className="text-sm text-[var(--sf-accent)] hover:underline">
              Create project
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-[var(--sf-text-muted)]">Loading projects…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Link
                href="/studio?new=1"
                onClick={createProject}
                className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--sf-border)] bg-[var(--sf-panel)] text-[var(--sf-text-muted)] transition hover:border-[var(--sf-accent)] hover:text-white"
              >
                <span className="text-3xl leading-none">+</span>
                <span className="mt-2 text-sm font-medium">New project</span>
              </Link>

              {projects.map((project) => (
                <Link
                  key={project.id}
                  href="/studio"
                  onClick={() => openProject(project.id)}
                  className="group min-h-36 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-panel)] p-4 transition hover:border-[var(--sf-accent)]/50 hover:bg-[var(--sf-panel-2)]"
                >
                  <div className="mb-3 h-16 rounded-lg bg-gradient-to-br from-[var(--sf-accent-soft)] to-[var(--sf-panel-3)]" />
                  <p className="truncate font-semibold group-hover:text-[var(--sf-accent)]">
                    {project.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--sf-text-muted)]">
                    {new Date(project.updatedAt).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Trending groups</h2>
              <span className="text-sm text-[var(--sf-text-muted)]">Show all</span>
            </div>
            <div className="space-y-2">
              {FEATURED_GROUPS.map((group) => (
                <div
                  key={group.name}
                  className="flex items-center justify-between rounded-lg border border-[var(--sf-border)] bg-[var(--sf-panel)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg"
                      style={{ background: `${group.color}22`, border: `1px solid ${group.color}55` }}
                    />
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-xs text-[var(--sf-text-muted)]">{group.members} members</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Get started</h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  title: "Make your first song with loops",
                  detail: "Pick a loop pack in the library, arrange clips, and export.",
                },
                {
                  title: "Make your first drum beat",
                  detail: "Add a drum channel and paint steps in the beat editor.",
                },
                {
                  title: "Record audio",
                  detail: "Hit record in the transport bar and capture vocals or instruments.",
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  href="/studio?new=1"
                  onClick={createProject}
                  className="block rounded-lg border border-[var(--sf-border)] bg-[var(--sf-panel)] px-4 py-3 transition hover:border-[var(--sf-accent)]/40"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-[var(--sf-text-muted)]">{item.detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
