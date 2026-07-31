import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export async function AuthStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link href="/sign-in" className="text-muted-foreground transition-colors hover:text-foreground">
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white transition-all duration-150 hover:bg-brand-700 hover:shadow-brand active:scale-[0.98]"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
