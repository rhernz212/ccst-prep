import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Geist, JetBrains_Mono } from "next/font/google";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Wordmark } from "@/components/ui/Logo";
import "./globals.css";

const noFlashScript = `
  try {
    const t = localStorage.theme;
    if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches))
      document.documentElement.classList.add('dark');
  } catch {}
`;

// Body and long-form book content. Geist has the neutrality that 40 pages of
// chapter text needs.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Headings only. A variable grotesque with some flare in it, which is what
// keeps the page from reading like an internal admin tool. The optical-size
// axis is requested so headings can be set at a display optical size rather
// than the 14pt default.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

// The CLI simulator, IP addresses and subnet masks. Taller x-height and
// unambiguous 0/O and 1/l — the credibility signal those tabs live on.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cert Prep",
  description: "Study material, quizzes, and practice exams for IT certifications.",
};

// viewport-fit=cover is what makes env(safe-area-inset-*) return real values,
// which the mobile tab bar depends on to clear the iOS home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${bricolage.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />

        <header className="glass sticky top-0 z-40 border-b border-border pt-safe">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <Link
              href="/"
              className="rounded-lg transition-opacity hover:opacity-80"
              aria-label="Cert Prep home"
            >
              <Wordmark />
            </Link>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
              <ThemeToggle />
              <AuthStatus />
            </div>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
