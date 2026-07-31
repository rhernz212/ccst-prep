import Link from "next/link";
import { signUp } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 animate-fade-in-up">
      <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
      {error && (
        <p className="mt-3 rounded-md bg-danger-50 p-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-300">
          {error}
        </p>
      )}
      <form action={signUp} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <Input id="email" name="email" type="email" required className="mt-1 w-full" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full"
          />
        </div>
        <Button type="submit" className="w-full">
          Sign up
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brand-600 hover:underline dark:text-brand-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
