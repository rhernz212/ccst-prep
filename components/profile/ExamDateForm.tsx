"use client";

import { useActionState } from "react";
import { CalendarDays, Check, TriangleAlert } from "lucide-react";
import { saveExamDate, type ActionResult } from "@/app/profile/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Sets (or clears) the countdown target for one certification.
 *
 * A native date input rather than a picker component: it's the one control
 * where the OS version is strictly better on a phone, and it hands the action
 * a YYYY-MM-DD string, which is exactly what the `date` column wants.
 *
 * No `min` on the input on purpose. Bounding it at today would make an
 * already-saved past date unsubmittable, which turns "my exam has been and
 * gone" into a form you can't clear.
 */
export function ExamDateForm({
  examSlug,
  examDate,
}: {
  examSlug: string;
  examDate: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveExamDate, {});

  return (
    <form action={formAction} className="mt-4 border-t border-border pt-4">
      <input type="hidden" name="examSlug" value={examSlug} />

      <label
        htmlFor={`exam-date-${examSlug}`}
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
        Exam date
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          id={`exam-date-${examSlug}`}
          type="date"
          name="examDate"
          defaultValue={examDate ?? ""}
          max="2100-01-01"
          className="w-[10.5rem]"
        />
        <Button type="submit" variant="secondary" size="sm" loading={pending}>
          {examDate ? "Update" : "Set date"}
        </Button>

        {state.error && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-danger-600 dark:text-danger-400">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
            {state.error}
          </span>
        )}
        {state.saved && !state.error && !pending && (
          <span aria-live="polite" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Saved
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {examDate
          ? "Clear the field and save to remove the countdown."
          : "Add the date you're sitting this one and it'll count down here."}
      </p>
    </form>
  );
}
