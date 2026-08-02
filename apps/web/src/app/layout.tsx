import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Story of Intelligence Academy",
  description: "A governed, evidence-first path from Numbers to machine learning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              Story of Intelligence Academy
            </Link>
            <span className="text-xs uppercase tracking-widest text-(--color-ink-muted)">
              Numbers slice
            </span>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
