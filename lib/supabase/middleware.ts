import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/quiz-attempts is intentionally NOT here: grading must work for
// anonymous visitors too (per plan — "take a quiz client-side, no save,
// with a sign in to save your score prompt"). The route itself checks auth
// and only persists the attempt when a user is present.
const PROTECTED_WRITE_PREFIXES = ["/api/progress", "/api/exam-attempts"];
const PROTECTED_PAGE_PREFIXES = ["/exam/run", "/results"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Refresh the session (do not run other logic between client creation and this call).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedWrite =
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    PROTECTED_WRITE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.includes(prefix));

  if (!user && (isProtectedWrite || isProtectedPage)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
