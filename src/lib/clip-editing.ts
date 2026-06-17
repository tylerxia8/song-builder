import {
  BEATS_PER_BAR,
  STEPS_PER_PATTERN,
  createEmptyDrumPattern,
  createId,
  type Clip,
  type DrumPattern,
  type MidiNote,
  type TrackKind,
} from "@/types/project";

export const SNAP_GRID_BEAT = 0.25;
export const MIN_CLIP_BEAT = 1;

export function snapBeat(beat: number, grid = SNAP_GRID_BEAT): number {
  return Math.round(beat / grid) * grid;
}

export function clampBeat(beat: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  return Math.max(min, Math.min(max, beat));
}

export function beatsToPixels(beats: number, barWidthPx: number): number {
  return (beats / BEATS_PER_BAR) * barWidthPx;
}

export function pixelsToBeats(pixels: number, barWidthPx: number): number {
  return (pixels / barWidthPx) * BEATS_PER_BAR;
}

export function canPlaceClipOnTrack(clipKind: Clip["kind"], trackKind: TrackKind): boolean {
  if (clipKind === "audio") {
    return trackKind === "audio" || trackKind === "instrument" || trackKind === "drums";
  }
  if (clipKind === "drums") return trackKind === "drums";
  return trackKind === "instrument";
}

export function cloneClipContent(clip: Clip, overrides: Partial<Clip> = {}): Clip {
  return {
    ...clip,
    id: createId("clip"),
    notes: clip.notes?.map((note) => ({ ...note, id: createId("note") })),
    pattern: clip.pattern
      ? {
          kick: [...clip.pattern.kick],
          snare: [...clip.pattern.snare],
          hihat: [...clip.pattern.hihat],
          clap: [...clip.pattern.clap],
        }
      : undefined,
    ...overrides,
  };
}

function trimMidiNotes(notes: MidiNote[], trimStart: number, duration: number): MidiNote[] {
  return notes
    .map((note) => ({
      ...note,
      startBeat: note.startBeat - trimStart,
    }))
    .filter(
      (note) =>
        note.startBeat >= -0.001 &&
        note.startBeat < duration &&
        note.startBeat + note.durationBeat > 0,
    )
    .map((note) => ({
      ...note,
      startBeat: Math.max(0, note.startBeat),
      durationBeat: Math.min(note.durationBeat, duration - note.startBeat),
    }));
}

function drumHitsFromPattern(pattern: DrumPattern, durationBeat: number) {
  const stepBeat = durationBeat / STEPS_PER_PATTERN;
  const hits: Array<{ row: keyof DrumPattern; beat: number }> = [];

  (Object.keys(pattern) as Array<keyof DrumPattern>).forEach((row) => {
    pattern[row].forEach((active, step) => {
      if (active) hits.push({ row, beat: step * stepBeat });
    });
  });

  return hits;
}

function patternFromHits(
  hits: Array<{ row: keyof DrumPattern; beat: number }>,
  durationBeat: number,
): DrumPattern {
  const pattern = createEmptyDrumPattern();
  const stepBeat = durationBeat / STEPS_PER_PATTERN;

  hits.forEach((hit) => {
    const step = Math.min(
      STEPS_PER_PATTERN - 1,
      Math.max(0, Math.round(hit.beat / stepBeat)),
    );
    pattern[hit.row][step] = true;
  });

  return pattern;
}

function trimDrumPattern(
  pattern: DrumPattern,
  durationBeat: number,
  trimStart: number,
  newDuration: number,
): DrumPattern {
  const hits = drumHitsFromPattern(pattern, durationBeat)
    .map((hit) => ({ ...hit, beat: hit.beat - trimStart }))
    .filter((hit) => hit.beat >= 0 && hit.beat < newDuration);

  return patternFromHits(hits, newDuration);
}

export function resizeClipFromLeft(clip: Clip, deltaBeat: number): Clip | null {
  const snappedDelta = snapBeat(deltaBeat);
  const nextStart = snapBeat(clip.startBeat + snappedDelta);
  const nextDuration = snapBeat(clip.durationBeat - snappedDelta);

  if (nextDuration < MIN_CLIP_BEAT || nextStart < 0) return null;

  const trimStart = nextStart - clip.startBeat;

  if (clip.kind === "midi" && clip.notes) {
    return {
      ...clip,
      startBeat: nextStart,
      durationBeat: nextDuration,
      notes: trimMidiNotes(clip.notes, trimStart, nextDuration),
    };
  }

  if (clip.kind === "drums" && clip.pattern) {
    return {
      ...clip,
      startBeat: nextStart,
      durationBeat: nextDuration,
      pattern: trimDrumPattern(clip.pattern, clip.durationBeat, trimStart, nextDuration),
    };
  }

  return { ...clip, startBeat: nextStart, durationBeat: nextDuration };
}

export function resizeClipFromRight(clip: Clip, deltaBeat: number): Clip | null {
  const nextDuration = snapBeat(clip.durationBeat + snapBeat(deltaBeat));
  if (nextDuration < MIN_CLIP_BEAT) return null;

  if (clip.kind === "midi" && clip.notes) {
    return {
      ...clip,
      durationBeat: nextDuration,
      notes: clip.notes.filter((note) => note.startBeat < nextDuration),
    };
  }

  if (clip.kind === "drums" && clip.pattern) {
    const hits = drumHitsFromPattern(clip.pattern, clip.durationBeat).filter(
      (hit) => hit.beat < nextDuration,
    );
    return {
      ...clip,
      durationBeat: nextDuration,
      pattern: patternFromHits(hits, nextDuration),
    };
  }

  return { ...clip, durationBeat: nextDuration };
}

export function moveClip(clip: Clip, startBeat: number, trackId: string): Clip {
  return {
    ...clip,
    trackId,
    startBeat: clampBeat(snapBeat(startBeat)),
  };
}

export function splitClipAtBeat(clip: Clip, absoluteBeat: number): [Clip, Clip] | null {
  const relative = snapBeat(absoluteBeat - clip.startBeat);
  if (relative <= MIN_CLIP_BEAT || relative >= clip.durationBeat - MIN_CLIP_BEAT) {
    return null;
  }

  const firstDuration = relative;
  const secondDuration = clip.durationBeat - relative;

  const first = cloneClipContent(clip, {
    durationBeat: firstDuration,
    name: clip.name,
  });

  const second = cloneClipContent(clip, {
    startBeat: clip.startBeat + relative,
    durationBeat: secondDuration,
    name: `${clip.name} · tail`,
  });

  if (clip.notes) {
    first.notes = trimMidiNotes(clip.notes, 0, firstDuration);
    second.notes = trimMidiNotes(clip.notes, relative, secondDuration);
  }

  if (clip.pattern) {
    first.pattern = trimDrumPattern(clip.pattern, clip.durationBeat, 0, firstDuration);
    second.pattern = trimDrumPattern(clip.pattern, clip.durationBeat, relative, secondDuration);
  }

  return [first, second];
}

export function duplicateClip(clip: Clip): Clip {
  return cloneClipContent(clip, {
    startBeat: snapBeat(clip.startBeat + clip.durationBeat),
    name: `${clip.name} copy`,
  });
}
