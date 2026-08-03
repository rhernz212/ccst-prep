import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";

export async function AuthStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <Button href="/sign-in" variant="ghost" size="sm">
          Sign in
        </Button>
        <Button href="/sign-up" size="sm">
          Sign up
        </Button>
      </div>
    );
  }

  // The email is the only identity signal available, and it's long enough to
  // crowd out the nav on a phone — so below sm it collapses to the initial in
  // an avatar chip, with the full address still reachable via the title.
  const initial = user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex items-center gap-2">
      <span
        title={user.email}
        className="grid h-8 w-8 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-xs font-bold text-white shadow-raised sm:hidden"
        aria-hidden="true"
      >
        {initial}
      </span>
      <span className="hidden max-w-[18ch] truncate text-sm text-muted-foreground sm:inline">
        {user.email}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Sign out"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease-spring)] hover:border-border hover:bg-surface hover:text-foreground active:scale-90"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
