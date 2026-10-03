import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kinetex LiveOps",
  description:
    "Change-aware event command center: catch a real-world change, understand its impact, act on it, and remember it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-full paper-texture">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3.5">
            <Link href="/" className="group flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-transform group-hover:-rotate-6">
                K
              </span>
              <span className="leading-tight">
                <span className="block font-display text-[1.0625rem] font-semibold text-ink">
                  Kinetex LiveOps
                </span>
                <span className="block text-[0.6875rem] uppercase tracking-[0.18em] text-faint">
                  change command center
                </span>
              </span>
            </Link>
            <Nav />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>

        <footer className="mt-8 border-t border-line/70">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-faint">
            <span className="max-w-xl">
              Rules work out what a change disturbs; the written summary only explains
              it. Nothing is saved until a person approves it.
            </span>
            </div>
        </footer>
      </body>
    </html>
  );
}
