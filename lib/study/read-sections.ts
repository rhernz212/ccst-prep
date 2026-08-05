/**
 * Which sections have been read *during this page session*, shared between the
 * sentinels that detect reading and the chrome that displays it.
 *
 * Deliberately not a React context. ChapterNav ships zero JS today — the
 * mobile chapter list is a plain <details> — and wrapping it in a provider
 * would hydrate the whole fourteen-chapter list to animate one checkmark.
 * A module store lets each mark subscribe on its own while the list around it
 * stays server-rendered.
 *
 * Client-only by construction. The server never imports this: mutable module
 * state on the server is shared across requests, so one reader's progress
 * would leak into another's page. Server-known progress arrives as props
 * instead (see `initiallyRead` on SectionReadMark), and this store only ever
 * holds what was read since the page loaded — the two sets are disjoint,
 * which is what makes the count a plain sum rather than a union.
 */

/** anchorIds newly read this session, bucketed by chapter. */
const readByChapter = new Map<string, Set<string>>();
const listeners = new Set<() => void>();

export interface ChapterProgress {
  read: number;
  total: number;
}

/**
 * The chapter currently on screen, registered by the chapter page so the
 * sticky chrome in the exam layout can show progress without the layout
 * knowing which chapter (or whether one) is being read.
 */
let activeChapter: { slug: string; initialCount: number; total: number } | null = null;

/*
 * useSyncExternalStore compares snapshots by identity and re-renders forever
 * if getSnapshot builds a fresh object each call. So the progress snapshot is
 * computed on write and handed out by reference on read.
 */
let progressSnapshot: ChapterProgress | null = null;

function recomputeProgress(): void {
  if (!activeChapter) {
    progressSnapshot = null;
    return;
  }

  const read = activeChapter.initialCount + (readByChapter.get(activeChapter.slug)?.size ?? 0);
  if (progressSnapshot?.read === read && progressSnapshot?.total === activeChapter.total) return;

  progressSnapshot = { read, total: activeChapter.total };
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Records a section as read. Callers must not pass a section the server
 * already reported as read — see the disjointness note above; double-counting
 * it would push the tally past the total.
 */
export function markRead(chapterSlug: string, anchorId: string): void {
  let chapter = readByChapter.get(chapterSlug);
  if (!chapter) {
    chapter = new Set();
    readByChapter.set(chapterSlug, chapter);
  }

  if (chapter.has(anchorId)) return;
  chapter.add(anchorId);
  recomputeProgress();
  notify();
}

export function hasRead(chapterSlug: string, anchorId: string): boolean {
  return readByChapter.get(chapterSlug)?.has(anchorId) ?? false;
}

export function readCount(chapterSlug: string): number {
  return readByChapter.get(chapterSlug)?.size ?? 0;
}

export function setActiveChapter(next: {
  slug: string;
  initialCount: number;
  total: number;
}): void {
  activeChapter = next;
  recomputeProgress();
  notify();
}

export function clearActiveChapter(slug: string): void {
  // Guarded by slug so a mount/unmount race across a chapter-to-chapter
  // navigation can't have the outgoing page clear the incoming page's
  // registration.
  if (activeChapter?.slug !== slug) return;
  activeChapter = null;
  recomputeProgress();
  notify();
}

/** Null when no chapter is being read — which is every other tab in the exam. */
export function getProgress(): ChapterProgress | null {
  return progressSnapshot;
}

/** The layout renders before the chapter page registers, so there is never
 *  server-side progress to report. */
export function getServerProgress(): ChapterProgress | null {
  return null;
}
