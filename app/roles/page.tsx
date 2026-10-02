import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { ROLES, type Role } from "@/lib/domain/types";
import { formatDateTime, roleLabel } from "@/lib/format";
import { Card, Chip, Empty, PageHeader, SectionTitle, Stat } from "@/components/ui";

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

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Role briefing" title="Who owns what now">
        Role-specific interfaces over the same approved records. These views filter
        by role; they are not access-controlled (see the demo non-claims).
      </PageHeader>

      <nav className="flex flex-wrap gap-2">
        {ROLES.map((item) => (
          <Link
            key={item}
            href={`/roles?role=${item}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              item === role
                ? "border-accent/40 bg-accent-soft text-accent-ink"
                : "border-line-strong bg-surface text-muted hover:text-ink"
            }`}
          >
            {roleLabel(item)}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Owned" value={owned.length} />
        <Stat label="Open" value={open.length} />
        <Stat label="Blockers" value={blockers.length} />
      </div>

      <Card>
        <SectionTitle meta={`${owned.length} tasks`}>
          {roleLabel(role)} tasks
        </SectionTitle>
        <ul className="mt-5 space-y-4">
          {owned.map((task) => (
            <li
              key={task.id}
              className="flex items-start justify-between gap-5 border-b border-line pb-4 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="text-sm text-ink">{task.title}</div>
                <div className="mt-0.5 text-xs text-faint">
                  {sessionTitle(task.sessionId)} · due {formatDateTime(task.dueAt)}
                  {task.sourceChangeId ? ` · from ${task.sourceChangeId}` : ""}
                </div>
              </div>
              <Chip
                tone={
                  task.status === "done"
                    ? "success"
                    : task.status === "blocked"
                      ? "danger"
                      : "neutral"
                }
              >
                {task.status.replace("_", " ")}
              </Chip>
            </li>
          ))}
          {owned.length === 0 && (
            <li>
              <Empty>No tasks currently owned by this role.</Empty>
            </li>
          )}
        </ul>
      </Card>

      <Card>
        <SectionTitle meta={`${recentChanges.length} recent`}>
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
          <ul className="mt-5 space-y-5">
            {recentChanges.map((entry) => (
              <li key={entry.id} className="border-l-2 border-accent/50 pl-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-accent">{entry.id}</span>
                  <span className="text-xs text-faint">{entry.changeLabel}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {entry.summary}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
