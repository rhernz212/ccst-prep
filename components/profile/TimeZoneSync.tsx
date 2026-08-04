"use client";

import { useEffect, startTransition } from "react";
import { saveTimeZone } from "@/app/profile/actions";

/**
 * Zones already attempted in this tab.
 *
 * Module scope rather than a ref, and deliberately not cleared on failure. The
 * action ends in refresh(), which re-renders the page this component sits on —
 * so if a write fails (a migration not yet applied, an RLS change, anything)
 * a per-instance guard that dies with the remount turns into a write/refresh
 * loop hammering the server for as long as the tab is open.
 */
const attempted = new Set<string>();

/**
 * Records the browser's IANA time zone against the profile, once, when the
 * stored one is missing or stale.
 *
 * The streak has to be computed on the server (it's part of the page's first
 * paint), but only the browser knows which calendar the user actually lives
 * in. This is the handoff. It runs on the profile page rather than globally
 * because that's the only place the value is read, and a write on every
 * chapter view would be a lot of round-trips to learn something that changes
 * a couple of times a year.
 */
export function TimeZoneSync({ storedTimeZone }: { storedTimeZone: string | null }) {
  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTimeZone || browserTimeZone === storedTimeZone) return;
    if (attempted.has(browserTimeZone)) return;

    attempted.add(browserTimeZone);
    // The action calls refresh(), which is a navigation-ish update — outside a
    // transition React warns about the resulting synchronous re-render.
    startTransition(() => {
      void saveTimeZone(browserTimeZone);
    });
  }, [storedTimeZone]);

  return null;
}
