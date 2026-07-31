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
        <Link href="/sign-in" className="text-gray-600 hover:text-gray-900">
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-600">{user.email}</span>
      <form action={signOut}>
        <button type="submit" className="text-gray-500 hover:text-gray-900 hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
