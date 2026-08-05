import "server-only";
import { getCurrentUser } from "@/lib/supabase/get-user";

/**
 * The one account that gets the personal extras (the study garden, lantern
 * mode in the reader).
 *
 * These aren't secrets and nothing security-sensitive hangs off this check —
 * it exists so features built for the site's owner don't have to be designed
 * for, explained to, or supported for everyone else. Everything gated by it
 * degrades to "the feature isn't there", never to a broken page.
 *
 * Overridable through `OWNER_EMAIL` so a second install (or a local copy with
 * a different Supabase project) can point it somewhere else without a code
 * change. Server-only on purpose: the address never needs to reach the
 * browser, so gating decisions are made during render and components are
 * handed a boolean.
 */
export const OWNER_EMAIL = normalize(
  process.env.OWNER_EMAIL ?? "ruben.hernandez212@gmail.com"
);

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  return email !== null && email !== undefined && normalize(email) === OWNER_EMAIL;
}

/** Whether the signed-in user is the owner. False when signed out. */
export async function isOwner(): Promise<boolean> {
  const user = await getCurrentUser();
  return isOwnerEmail(user?.email);
}
