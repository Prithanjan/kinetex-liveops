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
  { href: "/change", label: "Change Console" },
  { href: "/roles", label: "Role Views" },
  { href: "/report", label: "Report" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full antialiased">
        <header className="border-b border-slate-800 bg-slate-950/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-tight text-slate-50">
                Kinetex LiveOps
              </span>
              <span className="text-xs uppercase tracking-widest text-cyan-400">
                change command center
              </span>
            </Link>
            <nav className="flex gap-1 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-slate-50"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-slate-500">
          Local seed mode · generated text is labeled and links its source records.
          Demo claims and non-claims live in docs/demo-script.md.
        </footer>
      </body>
    </html>
  );
}
