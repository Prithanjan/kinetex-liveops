import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { ROLES, type Role } from "@/lib/domain/types";
import { formatDateTime, roleLabel } from "@/lib/format";
import {
  Card,
  CardBody,
  Callout,
  Chip,
  Empty,
  IconTile,
  PageHeader,
  SectionTitle,
  Stat,
  titleCase,
  toneFor,
} from "@/components/ui";
import { ROLE_ICONS, IconShield, IconSparkle, IconWarn } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: requested } = await searchParams;
  const role: Role = ROLES.includes(requested as Role)
    ? (requested as Role)
    : "organizer";

  const source = await getSource();
  const graph = await source.readGraph();

  const owned = graph.tasks.filter((task) => task.ownerRole === role);
  const open = owned.filter((task) => task.status !== "done");
  const blockers = owned.filter((task) => task.status === "blocked");
  const recentChanges = graph.changeLog.slice(-3).reverse();
  const sessionTitle = (id?: string) =>
    graph.sessions.find((session) => session.id === id)?.title ?? "Event-wide";
  const ActiveIcon = ROLE_ICONS[role] ?? IconShield;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Role briefing"
        title="Who owns what now"
        aside={
          <Chip tone="slate" icon={<IconShield className="h-3.5 w-3.5" />}>
            filtered view, not access control
          </Chip>
        }
      >
        Role-specific interfaces over the same approved records. Pick a role to see
        its tasks, deadlines, and blockers.
      </PageHeader>

      {/* Role picker as cards, the way a template would lay out sections */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ROLES.map((item) => {
          const Icon = ROLE_ICONS[item] ?? IconShield;
          const count = graph.tasks.filter(
            (task) => task.ownerRole === item && task.status !== "done",
          ).length;
          const active = item === role;
          return (
            <Link
              key={item}
              href={`/roles?role=${item}`}
              className={`group rounded-card border p-4 transition-all ${
                active
                  ? "border-accent/40 bg-accent-soft shadow-[var(--shadow-card)]"
                  : "border-line bg-surface hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              }`}
            >
              <IconTile tone={active ? "accent" : toneFor(item)}>
                <Icon className="h-5 w-5" />
              </IconTile>
              <div className="mt-3 text-sm font-medium text-ink">
                {roleLabel(item)}
              </div>
              <div className="mt-0.5 text-xs text-faint">
                {count} open {count === 1 ? "task" : "tasks"}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Owned"
          value={owned.length}
          icon={<ActiveIcon className="h-4 w-4" />}
          tone={toneFor(role)}
        />
        <Stat
          label="Open"
          value={open.length}
          icon={<IconSparkle className="h-4 w-4" />}
          tone="ochre"
        />
        <Stat
          label="Blockers"
          value={blockers.length}
          icon={<IconWarn className="h-4 w-4" />}
          tone="clay"
        />
      </div>

      {blockers.length > 0 && (
        <Callout
          title={`${blockers.length} blocker(s) need escalation`}
          tone="clay"
          icon={<IconWarn className="h-4 w-4" />}
        >
          These are owned tasks marked blocked. Escalate before the session start
          window closes.
        </Callout>
      )}

      <Card>
        <CardBody>
          <SectionTitle
            icon={<ActiveIcon className="h-5 w-5" />}
            meta={`${owned.length} tasks`}
          >
            {roleLabel(role)} tasks
          </SectionTitle>
          <ul className="mt-6 space-y-4">
            {owned.map((task) => (
              <li
                key={task.id}
                className="flex items-start justify-between gap-5 border-b border-line pb-4 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="text-sm text-ink">{task.title}</div>
                  <div className="mt-1 text-xs text-faint">
                    {sessionTitle(task.sessionId)} · due{" "}
                    {formatDateTime(task.dueAt)}
                    {task.sourceChangeId ? ` · from ${task.sourceChangeId}` : ""}
                  </div>
                </div>
                <Chip
                  tone={
                    task.status === "done"
                      ? "moss"
                      : task.status === "blocked"
                        ? "clay"
                        : "neutral"
                  }
                >
                  {task.status.replace("_", " ")}
                </Chip>
              </li>
            ))}
            {owned.length === 0 && <Empty>No tasks currently owned by this role.</Empty>}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionTitle
            icon={<IconSparkle className="h-5 w-5" />}
            meta={`${recentChanges.length} recent`}
          >
            Recent approved changes
          </SectionTitle>
          {recentChanges.length === 0 ? (
            <div className="mt-5">
              <Empty>
                No changes recorded yet. Apply one in the{" "}
                <Link href="/change" className="text-accent underline">
                  change console
                </Link>
                .
              </Empty>
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {recentChanges.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-card border border-line bg-surface-sunk p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-accent">{entry.id}</span>
                    <Chip tone="plum">{titleCase(entry.changeType)}</Chip>
                    <span className="text-xs text-faint">{entry.changeLabel}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {entry.summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
