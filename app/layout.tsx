import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kinetex LiveOps",
  description:
    "Change-aware event command center: catch a real-world change, understand its impact, act on it, and remember it.",
};

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/change", label: "Change" },
  { href: "/roles", label: "Roles" },
  { href: "/report", label: "Report" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
            <Link href="/" className="group flex items-baseline gap-2.5">
              <span className="font-display text-title text-ink">
                Kinetex LiveOps
              </span>
              <span className="hidden text-[0.6875rem] uppercase tracking-[0.18em] text-faint sm:inline">
                change command center
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>

        <footer className="mx-auto max-w-5xl px-6 pb-16 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-faint">
            <span>
              Generated text is labeled and links its source records. Rules decide;
              the summary explains.
            </span>
            <Link
              href="https://github.com/Prithanjan/kinetex-liveops"
              className="text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent"
            >
              github.com/Prithanjan/kinetex-liveops
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
