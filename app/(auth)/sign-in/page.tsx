import Link from "next/link";
import { signIn } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect: redirectTo } = await searchParams;

  return (
    <main className="animate-fade-in-up mx-auto flex w-full max-w-md grow flex-col justify-center px-4 py-12">
      <div className="aura relative">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4 h-14 w-14 rounded-2xl" />
          <h1 className="text-fluid-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to pick up where you left off.
          </p>
        </div>

        <Card className="p-6 sm:p-7">
          {error && (
            <p
              role="alert"
              className="mb-5 rounded-lg border border-danger-300 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/50 dark:bg-danger-500/10 dark:text-danger-300"
            >
              {error}
            </p>
          )}
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo ?? "/"} />
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1.5 w-full"
              />
            </div>
            <Button type="submit" size="lg" className="w-full">
              Sign in
            </Button>
          </form>
        </Card>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
