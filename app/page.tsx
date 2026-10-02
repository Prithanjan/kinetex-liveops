import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { formatDateTime, roleLabel } from "@/lib/format";
import {
  Card,
  Chip,
  Empty,
  PageHeader,
  SectionTitle,
  Stat,
  titleCase,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const source = await getSource();
  const graph = await source.readGraph();
  const event = graph.events[0];
  const venueName = (id: string) =>
    graph.venues.find((venue) => venue.id === id)?.name ?? "—";

  const openTasks = graph.tasks.filter((task) => task.status !== "done");
  const fromChange = graph.tasks.filter((task) => task.sourceChangeId);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={event ? titleCase(event.status) : "no event"}
        title={event?.name ?? "No event loaded"}
      >
        One change-to-closure workflow: plan, detect dependencies, preview impact,
        assign follow-ups, approve and sync, brief each role, then capture lessons.
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/change"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Simulate a change
        </Link>
        <Link
          href="/roles"
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
        >
          Role briefings
        </Link>
        <Link
          href="/report"
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink"
        >
          Post-event report
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Sessions" value={graph.sessions.length} />
        <Stat label="Open tasks" value={openTasks.length} />
        <Stat
          label="From changes"
          value={fromChange.length}
          hint="created by an approved change"
        />
        <Stat label="Source" value={source.kind} hint={event?.date} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle meta={`${graph.sessions.length} sessions`}>
            Plan
          </SectionTitle>
          <ul className="mt-5 space-y-4">
            {graph.sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-start justify-between gap-5 border-b border-line pb-4 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">
                    {session.title}
                  </div>
                  <div className="mt-0.5 text-xs text-faint">
                    {formatDateTime(session.startTime)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Chip tone="accent">{venueName(session.venueId)}</Chip>
                  <div className="mt-1.5 text-xs text-faint">
                    {session.requiredEquipmentIds.length} equipment ·{" "}
                    {session.assignedPersonIds.length} people
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle meta={`${openTasks.length} open`}>Open tasks by role</SectionTitle>
          <ul className="mt-5 space-y-4">
            {openTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start justify-between gap-5 border-b border-line pb-4 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="text-sm text-ink">{task.title}</div>
                  <div className="mt-0.5 text-xs text-faint">
                    Due {formatDateTime(task.dueAt)}
                    {task.sourceChangeId ? ` · from ${task.sourceChangeId}` : ""}
                  </div>
                </div>
                <Chip>{roleLabel(task.ownerRole)}</Chip>
              </li>
            ))}
            {openTasks.length === 0 && (
              <li>
                <Empty>No open tasks.</Empty>
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle meta={`${graph.changeLog.length} recorded`}>
          Change log
        </SectionTitle>
        {graph.changeLog.length === 0 ? (
          <div className="mt-5">
            <Empty>
              No changes recorded yet. Run the change console to write the first
              linked entry.
            </Empty>
          </div>
        ) : (
          <ul className="mt-5 space-y-6">
            {graph.changeLog.map((entry) => (
              <li key={entry.id} className="border-l-2 border-accent/50 pl-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-accent">{entry.id}</span>
                  <Chip tone="accent">{titleCase(entry.changeType)}</Chip>
                  <span className="text-xs text-faint">
                    approved by {roleLabel(entry.approvedByRole)} ·{" "}
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <div className="mt-2 text-sm font-medium text-ink">
                  {entry.changeLabel ||
                    (entry.fromVenueId && entry.toVenueId
                      ? `${venueName(entry.fromVenueId)} → ${venueName(entry.toVenueId)}`
                      : "—")}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {entry.summary}
                </p>
                <div className="mt-2 text-xs text-faint">
                  {entry.affectedRecordIds.length} affected records ·{" "}
                  {entry.followUpTaskIds.length} follow-up tasks
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
