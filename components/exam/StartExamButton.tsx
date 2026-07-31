"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      <p className="text-sm text-amber-700">
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
      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Starting…" : "Start Practice Exam"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
