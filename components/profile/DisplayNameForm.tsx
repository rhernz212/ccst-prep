"use client";

import { useActionState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { saveDisplayName, type ActionResult } from "@/app/profile/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function DisplayNameForm({ displayName }: { displayName: string | null }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveDisplayName, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <label htmlFor="display-name" className="sr-only">
        Display name
      </label>
      <Input
        id="display-name"
        name="displayName"
        defaultValue={displayName ?? ""}
        maxLength={60}
        placeholder="Your name"
        className="w-44"
      />
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        Save
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
    </form>
  );
}
