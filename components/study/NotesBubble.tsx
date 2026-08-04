"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, NotebookPen, TriangleAlert, X } from "lucide-react";

const DEBOUNCE_MS = 800;

/**
 * False during SSR and the hydration pass, true afterwards — the portal needs
 * a real `document.body`, and rendering it any earlier is a hydration
 * mismatch. useSyncExternalStore rather than the usual `useState(false)` +
 * effect, which reads as a cascading render to the React Compiler's lint.
 */
const subscribeToNothing = () => () => {};
function useIsHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}

/** Map key for the chapter-level note, whose section_id is null. */
const CHAPTER_KEY = "";

type Status = "idle" | "saving" | "saved" | "error";

export interface NoteTarget {
  anchorId: string;
  sectionId: string;
  title: string;
}

interface NotesBubbleProps {
  chapterId: string;
  chapterNumber: number;
  /** Sections in reading order, limited to those seeded into the DB. */
  targets: NoteTarget[];
  /** Existing note bodies keyed by anchorId, plus "" for the chapter-level note. */
  initialNotes: Record<string, string>;
}

/**
 * A floating notepad for the chapter you're reading.
 *
 * Notes are still stored per section — that's what makes them useful to skim
 * later — but you no longer have to scroll to a section's end to write one.
 * Opening the bubble attaches the note to whichever section you're currently
 * looking at, and the target is then frozen: it would be alarming for the
 * heading above your half-typed note to change because the page scrolled.
 *
 * Portalled to <body> rather than rendered in place. `main` carries
 * `animate-fade-in-up`, and for the 0.4s that animation is running its
 * transform makes it the containing block for any fixed-position descendant —
 * the bubble would visibly slide into place on every navigation.
 */
export function NotesBubble({
  chapterId,
  chapterNumber,
  targets,
  initialNotes,
}: NotesBubbleProps) {
  const hydrated = useIsHydrated();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [activeKey, setActiveKey] = useState<string>(CHAPTER_KEY);
  const [status, setStatus] = useState<Status>("idle");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Which section is currently on screen. A ref, not state: it changes on
  // every scroll tick and is only read at the moment the panel opens.
  const visibleKeyRef = useRef<string>(CHAPTER_KEY);
  // Last body the server acknowledged, per key — the baseline every "is this
  // dirty?" check compares against.
  const savedRef = useRef<Record<string, string>>({ ...initialNotes });
  const pendingRef = useRef<{ key: string; body: string } | null>(null);
  // Writes are chained rather than fired in parallel: switching target mid-edit
  // enqueues a second save, and two in flight at once can land out of order.
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  const sectionIdFor = useCallback(
    (key: string) => targets.find((t) => t.anchorId === key)?.sectionId ?? null,
    [targets]
  );

  const save = useCallback(
    (key: string, body: string) => {
      if ((savedRef.current[key] ?? "") === body) return;

      chainRef.current = chainRef.current.then(async () => {
        setStatus("saving");
        try {
          const response = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chapterId,
              sectionId: key === CHAPTER_KEY ? null : sectionIdFor(key),
              body,
            }),
          });
          if (!response.ok) throw new Error(String(response.status));
          savedRef.current[key] = body;
          // Only cleared on success, so a failed write stays pending and gets
          // another chance when the panel closes or the page unloads. Guarded
          // against clearing a newer edit that landed mid-request.
          if (pendingRef.current?.key === key && pendingRef.current.body === body) {
            pendingRef.current = null;
          }
          setStatus("saved");
        } catch {
          // Left out of savedRef on purpose, so the next keystroke or the
          // retry button picks the edit back up.
          setStatus("error");
        }
      });
    },
    [chapterId, sectionIdFor]
  );

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    if (pending) save(pending.key, pending.body);
  }, [save]);

  // Track the section occupying the top of the reading area. The rootMargin
  // narrows the viewport to a band just below the sticky header, so "current"
  // means what you're reading rather than anything merely on screen.
  useEffect(() => {
    if (targets.length === 0) return;

    const elements = targets
      .map((t) => document.getElementById(t.anchorId))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleKeyRef.current = entry.target.id;
        }
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [targets]);

  // Unload is the one moment a debounce can't cover. sendBeacon hands the
  // request to the browser so it outlives the page.
  useEffect(() => {
    const onUnload = () => {
      const pending = pendingRef.current;
      if (!pending) return;
      if ((savedRef.current[pending.key] ?? "") === pending.body) return;

      navigator.sendBeacon?.(
        "/api/notes",
        new Blob(
          [
            JSON.stringify({
              chapterId,
              sectionId: pending.key === CHAPTER_KEY ? null : sectionIdFor(pending.key),
              body: pending.body,
            }),
          ],
          { type: "application/json" }
        )
      );
      savedRef.current[pending.key] = pending.body;
      pendingRef.current = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onUnload();
    };

    window.addEventListener("pagehide", onUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [chapterId, sectionIdFor]);

  const closePanel = useCallback(() => {
    flush();
    setOpen(false);
    bubbleRef.current?.focus();
  }, [flush]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  const openPanel = () => {
    // Snap to wherever the reader is, then hold it — see the component note.
    setActiveKey(visibleKeyRef.current);
    setStatus("idle");
    setOpen(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const changeTarget = (key: string) => {
    // The pending edit belongs to the old target, so it has to land before the
    // key changes underneath it.
    flush();
    setActiveKey(key);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleChange = (body: string) => {
    setNotes((current) => ({ ...current, [activeKey]: body }));
    pendingRef.current = { key: activeKey, body };
    if (timerRef.current) clearTimeout(timerRef.current);
    const key = activeKey;
    timerRef.current = setTimeout(() => save(key, body), DEBOUNCE_MS);
  };

  if (!hydrated) return null;

  const noteCount = Object.values(notes).filter((body) => body.trim() !== "").length;
  const activeTitle =
    activeKey === CHAPTER_KEY
      ? `Chapter ${chapterNumber} — general`
      : (targets.find((t) => t.anchorId === activeKey)?.title ?? `Chapter ${chapterNumber}`);

  return createPortal(
    <>
      {/* z-30, under the mobile tab bar's z-40: the two never overlap, because
          bottom-tabbar lifts this clear of it. */}
      <button
        ref={bubbleRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        aria-controls="notes-panel"
        className="bottom-tabbar fixed right-4 z-30 grid h-13 w-13 place-items-center rounded-full bg-linear-to-b from-brand-500 to-brand-600 text-white shadow-brand transition-[transform,box-shadow] duration-200 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:from-brand-400 hover:to-brand-500 active:scale-95 md:right-6 md:bottom-6"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <NotebookPen className="h-5 w-5" aria-hidden="true" />
        )}
        <span className="sr-only">{open ? "Close notes" : "Open notes for this chapter"}</span>
        {!open && noteCount > 0 && (
          <span
            className="tabular absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[0.6875rem] leading-none font-bold text-accent-900"
            aria-hidden="true"
          >
            {noteCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notes-panel"
          role="dialog"
          aria-label={`Notes for chapter ${chapterNumber}`}
          /* Deliberately not aria-modal / not a focus trap: the point is to
             jot something down while still reading the page behind it. */
          className="animate-fade-in-up fixed inset-x-3 bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] z-30 rounded-2xl border border-border bg-surface shadow-raised sm:inset-x-auto sm:right-4 sm:w-96 md:right-6 md:bottom-24"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <NotebookPen className="h-4 w-4 text-brand-500" aria-hidden="true" />
              Notes
            </span>
            <SaveStatus status={status} onRetry={() => save(activeKey, notes[activeKey] ?? "")} />
          </div>

          <div className="px-4 py-3">
            <label
              htmlFor="note-target"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Attach to
            </label>
            <select
              id="note-target"
              value={activeKey}
              onChange={(event) => changeTarget(event.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus:border-brand-400 focus:outline-none dark:bg-surface-sunken"
            >
              <option value={CHAPTER_KEY}>Chapter {chapterNumber} — general</option>
              {targets.map((target) => (
                <option key={target.anchorId} value={target.anchorId}>
                  {(notes[target.anchorId] ?? "").trim() !== "" ? "• " : ""}
                  {target.title}
                </option>
              ))}
            </select>

            <textarea
              ref={textareaRef}
              value={notes[activeKey] ?? ""}
              maxLength={10000}
              rows={6}
              aria-label={`Note on ${activeTitle}`}
              placeholder="Jot it down — saved automatically."
              onChange={(event) => handleChange(event.target.value)}
              onBlur={flush}
              className="mt-2 block w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 focus:border-brand-400 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-brand-500)_18%,transparent)] focus:outline-none dark:bg-surface-sunken"
            />

            <p className="mt-2 text-xs text-muted-foreground">
              {noteCount === 0
                ? "Your notes appear in the Notes tab, grouped by chapter."
                : `${noteCount} note${noteCount === 1 ? "" : "s"} in this chapter · see the Notes tab`}
            </p>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

function SaveStatus({ status, onRetry }: { status: Status; onRetry: () => void }) {
  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-danger-600 hover:bg-surface-hover dark:text-danger-400"
      >
        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
        Not saved — retry
      </button>
    );
  }

  return (
    // Muted rather than success-green: the design tokens reserve
    // success/danger for answer correctness, and a routine autosave shouldn't
    // shout in the same colour a right answer does. A failed save is the one
    // case worth borrowing danger for.
    <span aria-live="polite" className="text-xs text-muted-foreground">
      {status === "saving" && "Saving…"}
      {status === "saved" && (
        <span className="inline-flex items-center gap-1">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Saved
        </span>
      )}
    </span>
  );
}
