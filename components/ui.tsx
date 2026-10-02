import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "border-line-strong bg-paper-deep text-ink-soft",
  accent: "border-accent/30 bg-accent-soft text-accent-ink",
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/25 bg-danger-soft text-danger",
  info: "border-info/25 bg-info-soft text-info",
};

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(31,30,28,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  meta,
  className = "",
}: {
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-baseline justify-between gap-2 ${className}`}>
      <h2 className="text-title text-ink">{children}</h2>
      {meta ? <span className="text-xs text-faint">{meta}</span> : null}
    </div>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface px-5 py-4">
      <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
        {label}
      </div>
      <div className="mt-1.5 font-display text-title text-ink">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line-strong bg-paper-deep/60 px-4 py-3 text-sm text-muted">
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="max-w-3xl">
      <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-display text-ink">{title}</h1>
      {children ? (
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{children}</p>
      ) : null}
    </header>
  );
}

export function severityTone(severity: string): Tone {
  if (severity === "blocking") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
