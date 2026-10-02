import type { ReactNode } from "react";
import type { Tone } from "./ui";

/**
 * Charts drawn as plain SVG.
 *
 * No chart library and no external images: the whole app stays offline-safe, and
 * the shapes are small enough to be read at a glance rather than decoded.
 */

const STROKE: Record<Tone, string> = {
  neutral: "var(--color-line-strong)",
  accent: "var(--color-accent)",
  moss: "var(--color-moss)",
  ochre: "var(--color-ochre)",
  clay: "var(--color-clay)",
  slate: "var(--color-slate)",
  plum: "var(--color-plum)",
};

const SOFT: Record<Tone, string> = {
  neutral: "var(--color-paper-deep)",
  accent: "var(--color-accent-soft)",
  moss: "var(--color-moss-soft)",
  ochre: "var(--color-ochre-soft)",
  clay: "var(--color-clay-soft)",
  slate: "var(--color-slate-soft)",
  plum: "var(--color-plum-soft)",
};

export function toneStroke(tone: Tone): string {
  return STROKE[tone];
}

/**
 * A single ring. Used for "how much of the work is closed", the one number a
 * person actually wants before the doors open.
 */
export function ProgressRing({
  value,
  max,
  size = 132,
  thickness = 12,
  tone = "accent",
  center,
  caption,
}: {
  value: number;
  max: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  center?: ReactNode;
  caption?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const dash = circumference * ratio;

  return (
    <figure className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-paper-deep)"
            strokeWidth={thickness}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={STROKE[tone]}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-hero leading-none text-ink">{center}</span>
          {caption ? (
            <span className="mt-1 text-[0.625rem] uppercase tracking-[0.16em] text-faint">
              {caption}
            </span>
          ) : null}
        </div>
      </div>
    </figure>
  );
}

export interface BarItem {
  label: string;
  value: number;
  max?: number;
  tone?: Tone;
  note?: string;
  href?: string;
}

/**
 * Horizontal bars with a shared scale. Good for "who is carrying the most" and
 * "which room is over its seats".
 */
export function BarSeries({
  items,
  emptyLabel = "Nothing to show yet.",
}: {
  items: BarItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }
  const ceiling = Math.max(1, ...items.map((item) => item.max ?? item.value));

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const tone = item.tone ?? "accent";
        const pct = Math.min(100, Math.round((item.value / ceiling) * 100));
        return (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink-soft">{item.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {item.note ?? item.value}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-paper-deep">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${pct}%`, backgroundColor: STROKE[tone] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export interface BlastNode {
  label: string;
  kind: string;
  tone?: Tone;
}

/**
 * The blast radius: one changed session in the middle, everything the change
 * reaches arranged around it. Reads as a picture of "what this touches" instead
 * of a list of internal relation keys.
 */
export function BlastRadius({
  centerLabel,
  centerNote,
  nodes,
  emptyLabel = "Nothing else depends on this yet.",
}: {
  centerLabel: string;
  centerNote?: string;
  nodes: BlastNode[];
  emptyLabel?: string;
}) {
  const W = 760;
  const H = 420;
  const cx = W / 2;
  const cy = H / 2;
  const rx = 268;
  const ry = 152;
  const shown = nodes.slice(0, 12);

  const points = shown.map((node, index) => {
    const angle = (index / Math.max(shown.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return {
      node,
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    };
  });

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${centerLabel} and the ${shown.length} records it touches`}
      >
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="var(--color-line)"
          strokeDasharray="3 7"
        />
        {points.map(({ x, y }) => (
          <line
            key={`line-${x}-${y}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--color-line-strong)"
            strokeWidth={1.2}
          />
        ))}

        <circle cx={cx} cy={cy} r={54} fill={SOFT.accent} stroke={STROKE.accent} strokeWidth={1.5} />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-[var(--color-accent-ink)] font-semibold"
          style={{ fontSize: 12 }}
        >
          {centerLabel.length > 20 ? `${centerLabel.slice(0, 19)}…` : centerLabel}
        </text>
        {centerNote ? (
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            style={{ fontSize: 10 }}
            className="fill-[var(--color-muted)]"
          >
            {centerNote}
          </text>
        ) : null}

        {points.map(({ node, x, y }) => {
          const tone = node.tone ?? "slate";
          return (
            <g key={`${node.kind}-${node.label}`}>
              <circle cx={x} cy={y} r={34} fill={SOFT[tone]} stroke={STROKE[tone]} strokeWidth={1.5} />
              <text
                x={x}
                y={y + 3}
                textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 600 }}
                fill={STROKE[tone]}
              >
                {node.kind}
              </text>
              <text
                x={x}
                y={y + 50}
                textAnchor="middle"
                style={{ fontSize: 10 }}
                className="fill-[var(--color-ink-soft)]"
              >
                {node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {shown.length === 0 ? (
        <p className="mt-2 text-center text-sm text-muted">{emptyLabel}</p>
      ) : (
        <p className="mt-2 text-center text-xs text-faint">
          One changed session, {shown.length} records it reaches. Distances are not
          meaningful — the lines are.
        </p>
      )}
    </div>
  );
}
