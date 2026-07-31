import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import "./globals.css";

const noFlashScript = `
  try {
    const t = localStorage.theme;
    if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches))
      document.documentElement.classList.add('dark');
  } catch {}
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cert Prep",
  description: "Study material, quizzes, and practice exams for IT certifications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        <div className="flex items-center justify-end gap-3 border-b border-border px-4 py-2">
          <ThemeToggle />
          <AuthStatus />
        </div>
        {children}
      </body>
    </html>
  );
}
