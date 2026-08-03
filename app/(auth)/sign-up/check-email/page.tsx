import { MailCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function CheckEmailPage() {
  return (
    <main className="animate-fade-in-up mx-auto flex w-full max-w-md grow flex-col justify-center px-4 py-12">
      <Card className="aura p-8 text-center sm:p-10">
        <span
          className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-raised"
          aria-hidden="true"
        >
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="text-fluid-2xl font-bold text-foreground">Check your email</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We&apos;ve sent a confirmation link to your email address. Click it to finish creating
          your account.
        </p>
      </Card>
    </main>
  );
}
