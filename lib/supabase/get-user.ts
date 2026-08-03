import "server-only";
import { cache } from "react";
import { createClient } from "./server";

/**
 * The current user, deduped for the lifetime of one render pass.
 *
 * `supabase.auth.getUser()` is a network round-trip to Supabase, not a local
 * JWT decode, and it was being made three times per navigation: once in the
 * proxy's session refresh, once in the root layout's AuthStatus, and once
 * more in whichever page needed it. React's cache() collapses the layout and
 * page calls into one (the proxy runs in a separate context and still makes
 * its own).
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
