"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

/** How long the armed "Delete?" state waits before disarming itself. */
const ARM_TIMEOUT_MS = 4000;

/**
 * Two-step delete for a single note.
 *
 * No confirmation dialog: the point of this button is to clear a note out
 * quickly, and a modal for one line of text is heavier than the action. But
 * a note is the reader's own writing and nothing restores it, so a stray
 * click shouldn't be enough — the first click arms, the second commits, and
 * the armed state times out on its own if it was a misclick.
 */
export function DeleteNoteButton({
  noteId,
  label,
}: {
  noteId: string;
  /** Names the note for screen readers — the button itself is icon-only. */
  label: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!armed) return;
    timerRef.current = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [armed]);

  const handleClick = async () => {
    if (!armed) {
      setFailed(false);
      setArmed(true);
      return;
    }

    setArmed(false);
    const response = await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    }).catch(() => null);

    if (!response?.ok) {
      setFailed(true);
      return;
    }

    // Re-render the server component rather than splicing local state: the
    // chapter grouping, the per-chapter count and the page total are all
    // derived server-side, and the same refresh drops the note from the
    // router cache so the chapter page's bubble doesn't serve a stale copy.
    startTransition(() => router.refresh());
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={() => setArmed(false)}
      disabled={isPending}
      aria-label={armed ? `Confirm deleting note on ${label}` : `Delete note on ${label}`}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors disabled:opacity-50 ${
        armed || failed
          ? "bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-400"
          : "text-muted-foreground hover:bg-surface-hover hover:text-danger-600 dark:hover:text-danger-400"
      }`}
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      {armed && "Delete?"}
      {failed && "Failed — retry"}
    </button>
  );
}
