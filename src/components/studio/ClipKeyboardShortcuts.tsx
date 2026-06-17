"use client";

import { useEffect } from "react";
import { useStudio } from "@/store/project-store";

export function ClipKeyboardShortcuts() {
  const {
    selectedClip,
    state,
    duplicateSelectedClip,
    splitSelectedClip,
    deleteSelectedClip,
    undo,
    redo,
  } = useStudio();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (!selectedClip) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedClip();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelectedClip();
        return;
      }

      if (event.key.toLowerCase() === "s" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        splitSelectedClip(state.transport.currentBeat);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    deleteSelectedClip,
    redo,
    selectedClip,
    splitSelectedClip,
    state.transport.currentBeat,
    undo,
  ]);

  return null;
}
