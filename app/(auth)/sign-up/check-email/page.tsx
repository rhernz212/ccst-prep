export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center animate-fade-in-up">
      <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        We&apos;ve sent a confirmation link to your email address. Click it to finish
        creating your account.
      </p>
    </div>
  );
}
