import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthStatus } from "@/components/auth/AuthStatus";
import "./globals.css";

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
    >
      <body className="min-h-full flex flex-col">
        <div className="flex justify-end border-b border-gray-100 px-4 py-2">
          <AuthStatus />
        </div>
        {children}
      </body>
    </html>
  );
}
