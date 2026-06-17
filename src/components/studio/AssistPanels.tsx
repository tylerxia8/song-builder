"use client";

import { useRef, useState } from "react";
import { detectKeyFromProject, melodyToNoteString, suggestHookMelody, suggestLyrics } from "@/lib/ai-assist";
import { importAudioFile } from "@/lib/file-import";
import { useStudio } from "@/store/project-store";
import type { SongVibe } from "@/lib/song-templates";

export function ImportPanel() {
  const { project, state, importAudioClip } = useStudio();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Import Audio
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setError(null);
          try {
            await importAudioClip(file, state.transport.currentBeat);
          } catch {
            setError("Could not import that audio file.");
          }
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-md border border-white/10 bg-[#15151f] px-3 py-2 text-left text-xs font-medium text-zinc-200 transition hover:border-sky-400/30 hover:bg-sky-500/10"
      >
        Import WAV / MP3
        <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">
          Adds an audio clip at the playhead
        </span>
      </button>
      {error ? <p className="mt-2 text-[11px] text-red-300">{error}</p> : null}
    </section>
  );
}

export function AiAssistPanel() {
  const { project } = useStudio();
  const vibe: SongVibe = project.name.toLowerCase().includes("trap")
    ? "trap"
    : project.name.toLowerCase().includes("acoustic")
      ? "acoustic"
      : "pop";
  const key = project.songKey ?? detectKeyFromProject(project);
  const lyrics = suggestLyrics(vibe, key);
  const melody = suggestHookMelody(key);

  return (
    <section>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        AI Assist
      </p>
      <div className="rounded-md border border-white/10 bg-[#15151f] p-3 text-xs text-zinc-300">
        <p>
          Key: <span className="text-violet-200">{key}</span>
        </p>
        <p className="mt-2 text-zinc-400">Hook melody: {melodyToNoteString(melody)}</p>
        <ul className="mt-2 space-y-1 text-zinc-500">
          {lyrics.slice(0, 3).map((line) => (
            <li key={line}>“{line}”</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
