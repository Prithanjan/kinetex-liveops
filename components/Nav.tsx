"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconClipboard,
  IconGauge,
  IconRoute,
  IconUsers,
} from "./nav-icons";

const items = [
  { href: "/", label: "Dashboard", Icon: IconGauge },
  { href: "/change", label: "Change", Icon: IconRoute },
  { href: "/roles", label: "Roles", Icon: IconUsers },
  { href: "/report", label: "Report", Icon: IconClipboard },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 rounded-full border border-line bg-surface/70 p-1 shadow-[var(--shadow-card)] backdrop-blur">
      {items.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-accent text-white"
                : "text-ink-soft hover:bg-paper-deep hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
