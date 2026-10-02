import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { formatDateTime, roleLabel } from "@/lib/format";
import {
  Avatar,
  Callout,
  Card,
  CardBody,
  Chip,
  Empty,
  Meter,
  SectionTitle,
  Stat,
  titleCase,
  toneFor,
} from "@/components/ui";
import {
  IconArrow,
  IconBox,
  IconCalendar,
  IconLayers,
  IconPin,
  IconRoute,
  IconSparkle,
  IconUsers,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const source = await getSource();
  const graph = await source.readGraph();
  const event = graph.events[0];

  const venue = (id: string) => graph.venues.find((item) => item.id === id);
  const group = (id: string) => graph.participantGroups.find((item) => item.id === id);
  const openTasks = graph.tasks.filter((task) => task.status !== "done");
  const fromChanges = graph.tasks.filter((task) => task.sourceChangeId);
  const completion =
    graph.tasks.length === 0
      ? 0
      : Math.round(((graph.tasks.length - openTasks.length) / graph.tasks.length) * 100);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl2 border border-line shadow-[var(--shadow-lift)]">
        <div className="hero-art absolute inset-0" />
        <div className="hero-grid absolute inset-0 opacity-70" />
        <div className="relative px-7 py-9 sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="accent" icon={<IconCalendar className="h-3.5 w-3.5" />}>
              {event?.date ?? "no date"}
            </Chip>
            <Chip tone={event?.status === "in_planning" ? "ochre" : "moss"}>
              {event ? titleCase(event.status) : "no event"}
            </Chip>
            <Chip tone="slate" icon={<IconLayers className="h-3.5 w-3.5" />}>
              {source.kind} source
            </Chip>
          </div>

          <h1 className="mt-5 max-w-2xl font-display text-display text-ink">
            {event?.name ?? "No event loaded"}
          </h1>
          <p className="mt-4 max-w-2xl text-lead text-ink-soft">
            One change-to-closure workflow. When a plan changes, LiveOps shows what
            it touches, proposes role-owned follow-ups, and records the approved
            decision back into the source of truth.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/change"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-card)] transition-colors hover:bg-accent-hover"
            >
              Simulate a change
              <IconArrow className="h-4 w-4" />
            </Link>
            <Link
              href="/roles"
              className="rounded-lg border border-line-strong bg-surface/80 px-4 py-2.5 text-sm font-medium text-ink-soft backdrop-blur transition-colors hover:border-accent/40 hover:text-ink"
            >
              Role briefings
            </Link>
            <Link
              href="/report"
              className="rounded-lg border border-line-strong bg-surface/80 px-4 py-2.5 text-sm font-medium text-ink-soft backdrop-blur transition-colors hover:border-accent/40 hover:text-ink"
            >
              Post-event report
            </Link>
          </div>

          <div className="mt-8 max-w-md">
            <div className="flex items-baseline justify-between text-xs text-muted">
              <span className="font-medium uppercase tracking-[0.14em] text-faint">
                Task completion
              </span>
              <span className="tabular-nums">{completion}%</span>
            </div>
            <div className="mt-2">
              <Meter
                value={graph.tasks.length - openTasks.length}
                max={Math.max(graph.tasks.length, 1)}
                tone="moss"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Sessions"
          value={graph.sessions.length}
          icon={<IconCalendar className="h-4 w-4" />}
          tone="accent"
        />
        <Stat
          label="Open tasks"
          value={openTasks.length}
          hint={`${graph.tasks.length} total`}
          icon={<IconBox className="h-4 w-4" />}
          tone="ochre"
        />
        <Stat
          label="From changes"
          value={fromChanges.length}
          hint="created by approved changes"
          icon={<IconRoute className="h-4 w-4" />}
          tone="plum"
        />
        <Stat
          label="People"
          value={graph.people.length}
          hint={`${graph.venues.length} venues`}
          icon={<IconUsers className="h-4 w-4" />}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Timeline */}
        <Card>
          <CardBody>
            <SectionTitle
              icon={<IconCalendar className="h-5 w-5" />}
              meta={`${graph.sessions.length} sessions`}
            >
              Run of show
            </SectionTitle>
            <ol className="mt-6 space-y-5">
              {graph.sessions.map((session) => {
                const host = venue(session.venueId);
                const invited = session.participantGroupIds
                  .map(group)
                  .reduce((total, item) => total + (item?.size ?? 0), 0);
                const over = host ? invited > host.capacity : false;
                return (
                  <li
                    key={session.id}
                    className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-line pb-5 last:border-0 last:pb-0"
                  >
                    <div className="pt-0.5">
                      <div className="font-display text-[1.0625rem] tabular-nums text-ink">
                        {new Date(session.startTime).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                      <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
                        {new Date(session.startTime).toLocaleDateString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{session.title}</span>
                        <Chip
                          tone={toneFor(session.venueId)}
                          icon={<IconPin className="h-3.5 w-3.5" />}
                        >
                          {host?.name ?? "—"}
                        </Chip>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-faint">
                        <span className="inline-flex items-center gap-1.5">
                          <IconSparkle className="h-3.5 w-3.5" />
                          {session.requiredEquipmentIds.length} equipment
                        </span>
                        <span className="flex items-center gap-1">
                          {session.assignedPersonIds.map((id) => {
                            const person = graph.people.find((p) => p.id === id);
                            return person ? (
                              <Avatar key={id} name={person.name} />
                            ) : null;
                          })}
                        </span>
                      </div>
                      {host ? (
                        <div className="mt-3 max-w-xs">
                          <Meter
                            value={invited}
                            max={host.capacity}
                            tone={over ? "clay" : "moss"}
                            label={`${invited} invited · ${host.capacity} seats`}
                          />
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>

        {/* Tasks by role */}
        <Card>
          <CardBody>
            <SectionTitle
              icon={<IconBox className="h-5 w-5" />}
              meta={`${openTasks.length} open`}
            >
              Open work
            </SectionTitle>
            <ul className="mt-6 space-y-4">
              {openTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-3 border-b border-line pb-4 last:border-0 last:pb-0"
                >
                  <Chip tone={toneFor(task.ownerRole)}>{roleLabel(task.ownerRole)}</Chip>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug text-ink">{task.title}</div>
                    <div className="mt-1 text-xs text-faint">
                      Due {formatDateTime(task.dueAt)}
                      {task.sourceChangeId ? ` · from ${task.sourceChangeId}` : ""}
                    </div>
                  </div>
                </li>
              ))}
              {openTasks.length === 0 && <Empty>No open tasks.</Empty>}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Change log */}
      <Card>
        <CardBody>
          <SectionTitle
            icon={<IconRoute className="h-5 w-5" />}
            meta={`${graph.changeLog.length} recorded`}
          >
            Change log
          </SectionTitle>
          {graph.changeLog.length === 0 ? (
            <div className="mt-5">
              <Callout
                title="No changes recorded yet"
                tone="accent"
                icon={<IconSparkle className="h-4 w-4" />}
              >
                Run the change console to catch a plan change, preview its impact,
                and write the first linked entry.
              </Callout>
            </div>
          ) : (
            <ul className="mt-6 space-y-5">
              {graph.changeLog.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-card border border-line bg-surface-sunk p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-accent">{entry.id}</span>
                    <Chip tone="plum">{titleCase(entry.changeType)}</Chip>
                    <Chip tone="moss">{roleLabel(entry.approvedByRole)}</Chip>
                    <span className="text-xs text-faint">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <div className="mt-3 font-medium text-ink">{entry.changeLabel}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {entry.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-faint">
                    <span>{entry.affectedRecordIds.length} affected records</span>
                    <span>{entry.followUpTaskIds.length} follow-up tasks</span>
                    <span>{entry.conflicts?.length ?? 0} conflicts recorded</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
