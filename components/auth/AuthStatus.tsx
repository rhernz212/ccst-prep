import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/get-user";
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
  // an avatar chip, with the full address still reachable via the label.
  const initial = user.email?.[0]?.toUpperCase() ?? "?";

  // The whole chip is the link to the profile, which is also where sign-out
  // now lives. That trade is deliberate: signing out is a once-a-session
  // action and it was sitting permanently in the header one mis-tap away from
  // the nav, while the profile — streak, countdown, readiness — is what you
  // actually want to reach from here.
  return (
    <Link
      href="/profile"
      aria-label={`Your profile (${user.email})`}
      className="flex items-center gap-2 rounded-full border border-transparent py-1 pr-1 pl-1 transition-[background-color,border-color] duration-200 hover:border-border hover:bg-surface sm:pr-3"
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-xs font-bold text-white shadow-raised"
        aria-hidden="true"
      >
        {initial}
      </span>
      <span className="hidden max-w-[18ch] truncate text-sm text-muted-foreground sm:inline">
        {user.email}
      </span>
    </Link>
  );
}
