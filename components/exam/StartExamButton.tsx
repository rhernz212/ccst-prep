"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function StartExamButton({ examSlug }: { examSlug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  async function handleStart() {
    setLoading(true);
    setError(null);
    setNeedsAuth(false);
    try {
      const res = await fetch("/api/exam-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examSlug }),
      });
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to start exam");
      }
      const data = await res.json();
      router.push(`/exams/${examSlug}/exam/run?attemptId=${data.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (needsAuth) {
    return (
      <p className="text-sm text-warning-700 dark:text-warning-400">
        <Link
          href={`/sign-in?redirect=${encodeURIComponent(`/exams/${examSlug}/exam`)}`}
          className="underline"
        >
          Sign in
        </Link>{" "}
        to take the practice exam — an attempt has to be tied to your account.
      </p>
    );
  }

  return (
    <div>
      <Button size="lg" onClick={handleStart} loading={loading}>
        {loading ? "Starting…" : "Start Practice Exam"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger-600 dark:text-danger-400">{error}</p>}
    </div>
  );
}
