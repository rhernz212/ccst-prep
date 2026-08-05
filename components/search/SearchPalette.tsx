"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Loader2, Search, X } from "lucide-react";
import { HIGHLIGHT_END, HIGHLIGHT_START, type SearchHit } from "@/lib/search/types";

const DEBOUNCE_MS = 180;

/**
 * Search across a certification's chapter text.
 *
 * Opens on ⌘K / Ctrl-K or "/" — the two shortcuts people already try — and
 * navigates straight to the matching section's anchor rather than the top of
 * a forty-screen chapter.
 *
 * Every request supersedes the last: results arriving out of order is the
 * classic search-as-you-type bug, and it shows up as the palette settling on
 * the results for a prefix of what's in the box.
 */
export function SearchPalette({ examSlug }: { examSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const requestIdRef = useRef(0);
  // What had focus before the palette opened, so Escape gives it back.
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const openPalette = useCallback(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setActiveIndex(0);
    // Supersedes any request still in flight, so a late response can't
    // repopulate a palette that's already closed.
    requestIdRef.current++;
    restoreFocusRef.current?.focus?.();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) closePalette();
        else openPalette();
        return;
      }

      // Bare "/" only when it isn't being typed into something — otherwise
      // it would swallow slashes in a note or a subnet mask.
      if (event.key === "/" && !typingElsewhere) {
        event.preventDefault();
        openPalette();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, openPalette, closePalette]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?exam=${encodeURIComponent(examSlug)}&q=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        // A slower earlier request must not overwrite a newer result.
        if (requestId !== requestIdRef.current) return;
        setHits(res.ok ? (data.hits ?? []) : []);
        setActiveIndex(0);
      } catch {
        if (requestId === requestIdRef.current) setHits([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, examSlug]);

  // Derived rather than cleared inside an effect: an empty box shows nothing,
  // while a box being edited keeps the previous results on screen until the
  // new ones land, instead of flashing empty between keystrokes.
  const trimmedQuery = query.trim();
  const visibleHits = trimmedQuery.length === 0 ? [] : hits;

  function go(hit: SearchHit) {
    closePalette();
    router.push(`/exams/${examSlug}/study/${hit.chapterSlug}#${hit.anchorId}`);
  }

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || (event.key === "n" && event.ctrlKey)) {
      event.preventDefault();
      setActiveIndex((i) => Math.min(visibleHits.length - 1, i + 1));
    } else if (event.key === "ArrowUp" || (event.key === "p" && event.ctrlKey)) {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter" && visibleHits[activeIndex]) {
      event.preventDefault();
      go(visibleHits[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
    }
  }

  // Keeps the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <>
      {/* Icon plus label, and no keyboard hint — ⌘K and "/" still open the
          palette, they're just not advertised on the button.

          The label drops below sm so the button collapses to its icon and
          stays on the title's row; kept as a full label it wrapped onto its
          own line and split the heading from the line beneath it. aria-label
          rather than an sr-only span, so the icon-only state is still named. */}
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search chapters"
        className="group inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-sm text-muted-foreground transition-[background-color,border-color,color] duration-200 hover:border-brand-300 hover:text-foreground sm:px-3 dark:hover:border-brand-500/70"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Search chapters</span>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closePalette();
            }}
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              aria-hidden="true"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search chapters"
              className="animate-fade-in-up relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
            >
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Search every chapter…"
                  aria-label="Search every chapter"
                  aria-controls="search-results"
                  /* no-focus-ring rather than a Tailwind outline utility: the
                     app's focus ring is unlayered CSS, which outranks the
                     whole utilities layer. See globals.css. */
                  className="no-focus-ring h-13 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                />
                {loading && trimmedQuery.length > 0 && (
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  onClick={closePalette}
                  aria-label="Close search"
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <ul
                id="search-results"
                ref={listRef}
                className="max-h-[min(24rem,60vh)] overflow-y-auto"
              >
                {visibleHits.map((hit, index) => (
                  <li key={`${hit.chapterSlug}-${hit.anchorId}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(hit)}
                      aria-current={index === activeIndex ? "true" : undefined}
                      className={`flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left last:border-b-0 ${
                        index === activeIndex ? "bg-brand-50 dark:bg-brand-500/10" : ""
                      }`}
                    >
                      <span className="flex w-full items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {hit.sectionTitle}
                        </span>
                        {index === activeIndex && (
                          <CornerDownLeft
                            className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <span className="tabular text-xs text-muted-foreground">
                        Chapter {hit.chapterNumber} · {hit.chapterTitle}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        <Snippet text={hit.snippet} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {trimmedQuery.length > 0 && !loading && visibleHits.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nothing matched “{trimmedQuery}”.
                </p>
              )}
              {trimmedQuery.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Search across every chapter — try “subnet mask” or “OSI”.
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Renders ts_headline's [[HL]] markers as real <mark> elements.
 *
 * Splitting rather than injecting HTML: the excerpt is book prose that has
 * already had its markup stripped, and feeding it back through an HTML parser
 * to get bold matches would undo that at the last moment.
 */
function Snippet({ text }: { text: string }) {
  return (
    <>
      {splitHighlights(text).map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={index}
            className="rounded bg-accent-100 px-0.5 text-foreground dark:bg-accent-500/25"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

/** Parses `a [[HL]]match[[/HL]] b` into typed runs, in one pass and without
 *  a mutable cursor. */
export function splitHighlights(text: string): { text: string; highlighted: boolean }[] {
  return text.split(HIGHLIGHT_START).flatMap((chunk, index) => {
    // The first chunk precedes any marker, so it's never highlighted.
    if (index === 0) return chunk === "" ? [] : [{ text: chunk, highlighted: false }];

    const end = chunk.indexOf(HIGHLIGHT_END);
    // An unterminated marker means malformed input — treat the rest as plain
    // text rather than dropping it.
    if (end === -1) return chunk === "" ? [] : [{ text: chunk, highlighted: false }];

    const segments = [{ text: chunk.slice(0, end), highlighted: true }];
    const after = chunk.slice(end + HIGHLIGHT_END.length);
    if (after !== "") segments.push({ text: after, highlighted: false });
    return segments;
  });
}
