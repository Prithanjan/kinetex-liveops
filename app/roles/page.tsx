import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { ROLES, type Role } from "@/lib/domain/types";
import {
  count,
  formatDay,
  formatDateTime,
  roleLabel,
  ROLE_BLURBS,
  ROLE_TAGLINES,
  taskStatusLabel,
  titleCase,
} from "@/lib/format";
import {
  Card,
  CardBody,
  Callout,
  Chip,
  Empty,
  IconTile,
  PageHeader,
  toneFor,
} from "@/components/ui";
import { BarSeries } from "@/components/charts";
import {
  IconArrow,
  IconCheck,
  IconShield,
  IconWarn,
  ROLE_ICONS,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const BOARD: { status: string; tone: "neutral" | "ochre" | "clay" | "moss"; blurb: string }[] = [
  { status: "todo", tone: "neutral", blurb: "Not started" },
  { status: "in_progress", tone: "ochre", blurb: "Being handled" },
  { status: "blocked", tone: "clay", blurb: "Stuck — needs help" },
  { status: "done", tone: "moss", blurb: "Closed off" },
];

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: requested } = await searchParams;
  const role: Role = ROLES.includes(requested as Role) ? (requested as Role) : "organizer";

  const source = await getSource();
  const graph = await source.readGraph();

  const owned = graph.tasks.filter((task) => task.ownerRole === role);
  const blocked = owned.filter((task) => task.status === "blocked");
  const ActiveIcon = ROLE_ICONS[role] ?? IconShield;
  const sessionTitle = (id?: string) =>
    graph.sessions.find((session) => session.id === id)?.title ?? "Across the event";
  const personName = (id?: string) =>
    graph.people.find((person) => person.id === id)?.name;

  // Who is carrying the most open work, so the busiest lane is obvious.
  const workload = ROLES.map((item) => ({
    role: item,
    open: graph.tasks.filter((task) => task.ownerRole === item && task.status !== "done")
      .length,
    blocked: graph.tasks.filter(
      (task) => task.ownerRole === item && task.status === "blocked",
    ).length,
  }));
  const busiest = Math.max(1, ...workload.map((row) => row.open));

  // Changes that created work for this role.
  const relevantChanges = [...graph.changeLog].reverse().filter((entry) =>
    graph.tasks.some(
      (task) =>
        task.ownerRole === role && task.sourceChangeId === entry.id,
    ),
  );

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="The day, by role"
        title="Who owns what right now"
        aside={
          <Chip tone="slate" icon={<IconShield className="h-3.5 w-3.5" />}>
            same approved facts, five views
          </Chip>
        }
      >
        Nobody needs the whole picture to do their job. Pick a role for its part of it,
        blockers first.
      </PageHeader>

      {/* ── Pick a role ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((item) => {
          const Icon = ROLE_ICONS[item] ?? IconShield;
          const row = workload.find((entry) => entry.role === item)!;
          const active = item === role;
          return (
            <Link
              key={item}
              href={`/roles?role=${item}`}
              className={`flex flex-col rounded-card border p-4 transition-all ${
                active
                  ? "border-accent/40 bg-accent-soft shadow-[var(--shadow-card)]"
                  : "border-line bg-surface hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              }`}
            >
              <IconTile tone={active ? "accent" : toneFor(item)}>
                <Icon className="h-5 w-5" />
              </IconTile>
              <span className="mt-3 font-display text-[1.05rem] text-ink">
                {roleLabel(item)}
              </span>
              <span className="text-xs text-faint">{ROLE_TAGLINES[item]}</span>
              <div className="mt-3">
                <BarSeries
                  items={[
                    {
                      label: active ? "Open" : "Open work",
                      value: row.open,
                      max: busiest,
                      tone: row.blocked > 0 ? "clay" : active ? "accent" : "slate",
                      note: row.blocked > 0 ? `${row.blocked} blocked` : `${row.open}`,
                    },
                  ]}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── The briefing itself ─────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl2 border border-line bg-surface shadow-[var(--shadow-card)]">
        <div className="hero-art relative px-6 py-7 sm:px-8">
          <div className="relative flex flex-wrap items-center gap-5">
            <IconTile tone={toneFor(role)}>
              <ActiveIcon className="h-6 w-6" />
            </IconTile>
            <div className="min-w-0 flex-1">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-accent">
                You are looking at
              </p>
              <h2 className="mt-1 font-display text-hero text-ink">{roleLabel(role)}</h2>
              <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">{ROLE_BLURBS[role]}</p>
            </div>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-10 gap-y-3 border-t border-line px-6 py-4 text-sm">
          <div className="flex items-baseline gap-2">
            <dt className="text-faint">Owned</dt>
            <dd className="font-display text-[1.05rem] text-ink">{owned.length}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-faint">Still open</dt>
            <dd className="font-display text-[1.05rem] text-ink">
              {owned.filter((task) => task.status !== "done").length}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-faint">Blocked</dt>
            <dd
              className={`font-display text-[1.05rem] ${
                blocked.length > 0 ? "text-clay" : "text-ink"
              }`}
            >
              {blocked.length}
            </dd>
          </div>
        </dl>
      </section>

      {blocked.length > 0 && (
        <Callout
          title={`${count(blocked.length, "task")} cannot move without a decision`}
          tone="clay"
          icon={<IconWarn className="h-4 w-4" />}
        >
          These are owned by {roleLabel(role)} and marked blocked. Escalate before the
          session they belong to starts.
        </Callout>
      )}

      {/* ── The board ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-title text-ink">
            {roleLabel(role)}&apos;s board
          </h2>
          <Link
            href="/change"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Record a change
            <IconArrow className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BOARD.map((column) => {
            const items = owned.filter((task) => task.status === column.status);
            return (
              <div
                key={column.status}
                className={`rounded-card border p-4 ${
                  column.tone === "clay"
                    ? "border-clay/30 bg-clay-soft"
                    : column.tone === "ochre"
                      ? "border-ochre/25 bg-ochre-soft"
                      : column.tone === "moss"
                        ? "border-moss/25 bg-moss-soft"
                        : "border-line bg-surface-sunk"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-[1.05rem] text-ink">
                    {taskStatusLabel(column.status)}
                  </h3>
                  <span className="text-xs tabular-nums text-muted">{items.length}</span>
                </div>
                <p className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.12em] text-faint">
                  {column.blurb}
                </p>

                <ul className="mt-3 space-y-2.5">
                  {items.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-lg border border-line bg-surface p-3 shadow-[var(--shadow-card)]"
                    >
                      <p className="text-sm leading-snug text-ink">{task.title}</p>
                      <p className="mt-1.5 text-[0.6875rem] text-faint">
                        {sessionTitle(task.sessionId)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-muted">
                        <IconCheck className="h-3 w-3" />
                        due {formatDateTime(task.dueAt)}
                      </p>
                      {task.ownerPersonId ? (
                        <p className="mt-1 text-[0.6875rem] text-ink-soft">
                          {personName(task.ownerPersonId) ?? task.ownerPersonId}
                        </p>
                      ) : null}
                      {task.sourceChangeId ? (
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-plum/25 bg-plum-soft px-2 py-0.5 text-[0.625rem] text-plum">
                          from a change
                        </p>
                      ) : null}
                    </li>
                  ))}
                  {items.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-line-strong px-3 py-3 text-xs text-faint">
                      Nothing here.
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── What changed for this role ───────────────────────────────────── */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-title text-ink">
              What changed for {roleLabel(role)}
            </h2>
            <Chip tone="plum">{count(relevantChanges.length, "change")}</Chip>
          </div>

          {relevantChanges.length === 0 ? (
            <div className="mt-5">
              <Empty>
                No change has added work for this role yet. Changes are recorded in the{" "}
                <Link href="/change" className="text-accent underline">
                  change console
                </Link>
                .
              </Empty>
            </div>
          ) : (
            <ol className="mt-6 grid gap-4 sm:grid-cols-2">
              {relevantChanges.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-card border border-line bg-surface-sunk p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="plum">{titleCase(entry.changeType)}</Chip>
                    <span className="text-xs text-faint">{formatDay(entry.createdAt)}</span>
                  </div>
                  <p className="mt-2.5 font-display text-[1.05rem] text-ink">
                    {entry.changeLabel}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {entry.summary}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      <p className="text-xs leading-relaxed text-faint">
        Each role sees the same approved records, filtered to what it owns — a
        briefing, not a permission system. There is no login, and anyone can open
        another role&apos;s board from the picker above. Reading{" "}
        {source.kind === "notion" ? "your Notion workspace" : "the bundled demo data"}
        : {count(owned.length, "task")} owned by {roleLabel(role)}, all counted from
        records rather than written by a model.
      </p>
    </div>
  );
}
