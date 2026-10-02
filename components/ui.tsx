import type { ReactNode } from "react";
import {
  IconAlert,
  IconCheck,
  IconInfo,
  IconSparkle,
  IconWarn,
} from "./icons";

export type Tone = "neutral" | "accent" | "moss" | "ochre" | "clay" | "slate" | "plum";

const chipTone: Record<Tone, string> = {
  neutral: "border-line-strong bg-paper-deep text-ink-soft",
  accent: "border-accent/25 bg-accent-soft text-accent-ink",
  moss: "border-moss/25 bg-moss-soft text-moss",
  ochre: "border-ochre/25 bg-ochre-soft text-ochre",
  clay: "border-clay/25 bg-clay-soft text-clay",
  slate: "border-slate/25 bg-slate-soft text-slate",
  plum: "border-plum/25 bg-plum-soft text-plum",
};

export const TONES: Tone[] = ["accent", "moss", "ochre", "slate", "plum", "clay"];

export function toneFor(seed: string): Tone {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return TONES[hash % TONES.length];
}

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <section
      className={`rounded-card border border-line bg-surface shadow-[var(--shadow-card)] ${
        hover ? "transition-shadow hover:shadow-[var(--shadow-lift)]" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function SectionTitle({
  children,
  meta,
  icon,
  className = "",
}: {
  children: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon ? <span className="text-accent">{icon}</span> : null}
        <h2 className="font-display text-title text-ink">{children}</h2>
      </div>
      {meta ? (
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-faint">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

export function Chip({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${chipTone[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function Avatar({ name, tone }: { name: string; tone?: Tone }) {
  const resolved = tone ?? toneFor(name);
  const initials = name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold ${chipTone[resolved]}`}
      title={name}
    >
      {initials || "?"}
    </span>
  );
}

export function IconTile({
  children,
  tone = "accent",
  size = "md",
}: {
  children: ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  return (
    <span
      className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-xl border ${chipTone[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "accent",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <Card hover>
      <CardBody className="flex items-start gap-4 py-5">
        {icon ? (
          <IconTile tone={tone} size="sm">
            {icon}
          </IconTile>
        ) : null}
        <div className="min-w-0">
          <div className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-faint">
            {label}
          </div>
          <div className="mt-1 font-display text-title text-ink">{value}</div>
          {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
        </div>
      </CardBody>
    </Card>
  );
}

export function Meter({
  value,
  max,
  tone = "accent",
  label,
}: {
  value: number;
  max: number;
  tone?: Tone;
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const bar: Record<Tone, string> = {
    neutral: "bg-faint",
    accent: "bg-accent",
    moss: "bg-moss",
    ochre: "bg-ochre",
    clay: "bg-clay",
    slate: "bg-slate",
    plum: "bg-plum",
  };
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-deep">
        <div
          className={`h-full rounded-full ${bar[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label ? <div className="mt-1.5 text-xs text-faint">{label}</div> : null}
    </div>
  );
}

export function Callout({
  children,
  title,
  tone = "accent",
  icon,
}: {
  children?: ReactNode;
  title: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className={`rounded-card border p-4 ${chipTone[tone]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon ?? <IconInfo className="h-4 w-4" />}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          {children ? (
            <div className="mt-1 text-sm leading-relaxed opacity-90">{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line-strong bg-surface-sunk px-4 py-3 text-sm text-muted">
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-hero text-ink">{title}</h1>
        {children ? (
          <p className="mt-3 text-lead text-muted">{children}</p>
        ) : null}
      </div>
      {aside}
    </header>
  );
}

export function Steps({ current, items }: { current: number; items: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {items.map((item, index) => {
        const state = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li key={item} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
                state === "done"
                  ? chipTone.moss
                  : state === "active"
                    ? chipTone.accent
                    : chipTone.neutral
              }`}
            >
              {state === "done" ? (
                <IconCheck className="h-3.5 w-3.5" />
              ) : (
                <span className="tabular-nums">{index + 1}</span>
              )}
              {item}
            </span>
            {index < items.length - 1 ? (
              <span className="text-line-strong">—</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function severityTone(severity: string): Tone {
  if (severity === "blocking") return "clay";
  if (severity === "warning") return "ochre";
  return "slate";
}

export function severityIcon(severity: string) {
  if (severity === "blocking") return <IconAlert className="h-3.5 w-3.5" />;
  if (severity === "warning") return <IconWarn className="h-3.5 w-3.5" />;
  return <IconInfo className="h-3.5 w-3.5" />;
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export { IconSparkle };
