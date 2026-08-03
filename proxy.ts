import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Static content images are excluded so a chapter's ~50 figures don't each
    // trigger a Supabase session refresh. Keep this extension list in sync with
    // whatever the ingest pipeline emits (scripts/ingest/optimize-image.ts).
    "/((?!_next/static|_next/image|favicon.ico|content/.*\\.(?:webp|avif|png|jpg|jpeg|svg|gif)$).*)",
  ],
};
