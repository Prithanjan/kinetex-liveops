import Link from "next/link";
import { getSource } from "@/lib/data/source";
import {
  count,
  countdownLabel,
  formatDay,
  formatTime,
  roleLabel,
  ROLE_TAGLINES,
  titleCase,
} from "@/lib/format";
import { ROLES, type Role } from "@/lib/domain/types";
import {
  Avatar,
  Card,
  CardBody,
  Chip,
  Empty,
  IconTile,
  SectionTitle,
  toneFor,
} from "@/components/ui";
import { BarSeries, ProgressRing } from "@/components/charts";
import {
  IconArrow,
  IconBox,
  IconCalendar,
  IconCheck,
  IconPin,
  IconRoute,
  IconSparkle,
  IconWarn,
  ROLE_ICONS,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const EVENT_STATUS_LABEL: Record<string, string> = {
  planned: "On the calendar",
  in_planning: "Still being planned",
  live: "Happening now",
  closed: "Wrapped up",
};

export default async function DashboardPage() {
  const source = await getSource();
  const graph = await source.readGraph();
  const event = graph.events[0];

  const venueOf = (id: string) => graph.venues.find((item) => item.id === id);
  const personOf = (id: string) => graph.people.find((item) => item.id === id);

  const sessions = [...graph.sessions].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const openTasks = graph.tasks.filter((task) => task.status !== "done");
  const blockedTasks = graph.tasks.filter((task) => task.status === "blocked");
  const doneTasks = graph.tasks.length - openTasks.length;
  const latestChange = graph.changeLog[graph.changeLog.length - 1];

  return (
    <div className="space-y-12">
      {/* ── The briefing ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-xl2 border border-line shadow-[var(--shadow-lift)]">
        <div className="hero-art absolute inset-0" />
        <div className="hero-grid absolute inset-0 opacity-70" />
        <div className="relative grid gap-10 px-7 py-9 sm:px-10 sm:py-12 lg:grid-cols-[1.45fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="accent" icon={<IconCalendar className="h-3.5 w-3.5" />}>
                {event ? countdownLabel(event.date) : "no event loaded"}
              </Chip>
              {event ? (
                <Chip tone={event.status === "live" ? "clay" : "moss"}>
                  {EVENT_STATUS_LABEL[event.status] ?? titleCase(event.status)}
                </Chip>
              ) : null}
              <Chip tone="slate">{count(sessions.length, "session")}</Chip>
            </div>

            <h1 className="mt-5 max-w-2xl font-display text-display text-ink">
              {event?.name ?? "No event loaded"}
            </h1>
            <p className="mt-4 max-w-xl text-lead text-ink-soft">
              Change a plan, see what it disturbs, hand the work to the right people,
              and keep a record you can learn from.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/change"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-colors hover:bg-accent-hover"
              >
                Something has changed
                <IconArrow className="h-4 w-4" />
              </Link>
              <Link
                href="/roles"
                className="rounded-lg border border-line-strong bg-surface/80 px-4 py-2.5 text-sm font-medium text-ink-soft backdrop-blur transition-colors hover:border-accent/40 hover:text-ink"
              >
                What each role is doing
              </Link>
              <Link
                href="/report"
                className="rounded-lg border border-line-strong bg-surface/80 px-4 py-2.5 text-sm font-medium text-ink-soft backdrop-blur transition-colors hover:border-accent/40 hover:text-ink"
              >
                The post-event report
              </Link>
            </div>
          </div>

          {/* The one number that matters before doors open. */}
          <div className="rounded-card border border-line bg-surface/85 p-6 shadow-[var(--shadow-card)] backdrop-blur">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-faint">
              Work closed off
            </p>
            <div className="mt-4 flex items-center gap-6">
              <ProgressRing
                value={doneTasks}
                max={Math.max(graph.tasks.length, 1)}
                center={`${graph.tasks.length === 0 ? 0 : Math.round((doneTasks / graph.tasks.length) * 100)}%`}
                tone={blockedTasks.length > 0 ? "ochre" : "moss"}
                size={124}
              />
              <dl className="min-w-0 space-y-3">
                <div>
                  <dt className="text-xs text-faint">Still open</dt>
                  <dd className="font-display text-title text-ink">
                    {openTasks.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Blocked</dt>
                  <dd
                    className={`font-display text-title ${
                      blockedTasks.length > 0 ? "text-clay" : "text-ink"
                    }`}
                  >
                    {blockedTasks.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Last change</dt>
                  <dd className="text-sm text-ink-soft">
                    {latestChange ? latestChange.changeLabel : "none recorded yet"}
                  </dd>
                </div>
              </dl>
            </div>
            {blockedTasks.length > 0 ? (
              <p className="mt-4 rounded-lg border border-clay/25 bg-clay-soft px-3 py-2 text-xs text-clay">
                {count(blockedTasks.length, "task")} blocked — those need escalating
                before the first session starts.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Run of show ──────────────────────────────────────────────────── */}
      <Card>
        <CardBody>
          <SectionTitle
            icon={<IconCalendar className="h-5 w-5" />}
            meta={event ? formatDay(event.date) : undefined}
          >
            The run of show
          </SectionTitle>

          <ol className="mt-7 space-y-8">
            {sessions.map((session) => {
              const host = venueOf(session.venueId);
              const invited = session.participantGroupIds
                .map((id) => graph.participantGroups.find((group) => group.id === id)?.size ?? 0)
                .reduce((total, size) => total + size, 0);
              const over = host ? invited > host.capacity : false;
              return (
                <li key={session.id} className="grid grid-cols-[5rem_1fr] gap-5">
                  <div className="pt-1 text-right">
                    <div className="font-display text-[1.15rem] tabular-nums text-ink">
                      {formatTime(session.startTime)}
                    </div>
                    <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
                      {formatTime(session.endTime)}
                    </div>
                  </div>

                  <div className="relative border-l border-line pl-6">
                    <span
                      className={`absolute -left-[7px] top-2 h-3.5 w-3.5 rounded-full border-2 border-surface ${
                        over ? "bg-clay" : "bg-moss"
                      }`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[1.15rem] text-ink">
                        {session.title}
                      </span>
                      <Chip tone={toneFor(session.venueId)} icon={<IconPin className="h-3.5 w-3.5" />}>
                        {host?.name ?? "no room yet"}
                      </Chip>
                      {over ? <Chip tone="clay">over capacity</Chip> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <IconSparkle className="h-3.5 w-3.5" />
                        {count(session.requiredEquipmentIds.length, "kit item")}
                      </span>
                      <span className="flex items-center gap-1">
                        {session.assignedPersonIds.map((id) => {
                          const person = personOf(id);
                          return person ? <Avatar key={id} name={person.name} /> : null;
                        })}
                        {session.assignedPersonIds.length === 0 ? (
                          <span className="text-clay">nobody assigned yet</span>
                        ) : null}
                      </span>
                    </div>

                    {host ? (
                      <div className="mt-4 max-w-sm">
                        <BarSeries
                          items={[
                            {
                              label: "Guests invited",
                              value: invited,
                              max: Math.max(host.capacity, invited, 1),
                              tone: over ? "clay" : "moss",
                              note: over
                                ? `${invited - host.capacity} over ${host.capacity} seats`
                                : `${invited} of ${host.capacity} seats`,
                            },
                          ]}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {sessions.length === 0 ? (
              <li>
                <Empty>No sessions on the timetable yet.</Empty>
              </li>
            ) : null}
          </ol>
        </CardBody>
      </Card>

      {/* ── Who is carrying what ─────────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-title text-ink">Who is carrying what</h2>
          <Link
            href="/roles"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Open the role briefings
            <IconArrow className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((role: Role) => {
            const owned = graph.tasks.filter((task) => task.ownerRole === role);
            const open = owned.filter((task) => task.status !== "done");
            const blocked = owned.filter((task) => task.status === "blocked");
            const Icon = ROLE_ICONS[role] ?? IconBox;
            return (
              <Link
                key={role}
                href={`/roles?role=${role}`}
                className={`group flex flex-col rounded-card border bg-surface p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] ${
                  blocked.length > 0 ? "border-clay/30" : "border-line"
                }`}
              >
                <IconTile tone={toneFor(role)}>
                  <Icon className="h-5 w-5" />
                </IconTile>
                <span className="mt-3.5 font-display text-[1.05rem] text-ink">
                  {roleLabel(role)}
                </span>
                <span className="mt-0.5 text-xs text-faint">{ROLE_TAGLINES[role]}</span>
                <span className="mt-3 text-sm text-ink-soft">
                  {open.length === 0 ? "Nothing open" : count(open.length, "open task")}
                </span>
                {blocked.length > 0 ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-clay">
                    <IconWarn className="h-3.5 w-3.5" />
                    {count(blocked.length, "blocker")}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── The change journal ───────────────────────────────────────────── */}
      <Card>
        <CardBody>
          <SectionTitle
            icon={<IconRoute className="h-5 w-5" />}
            meta={count(graph.changeLog.length, "recorded change")}
          >
            Changes people approved
          </SectionTitle>

          {graph.changeLog.length === 0 ? (
            <div className="mt-6 rounded-card border border-dashed border-line-strong bg-surface-sunk p-6">
              <p className="font-display text-[1.05rem] text-ink">
                Nothing has changed yet — which is a good day.
              </p>
              <Link
                href="/change"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
              >
                Record the first change
                <IconArrow className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <ol className="mt-6 space-y-4">
              {[...graph.changeLog].reverse().map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-card border border-line bg-surface-sunk p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="plum">{titleCase(entry.changeType)}</Chip>
                    <Chip tone="moss" icon={<IconCheck className="h-3.5 w-3.5" />}>
                      approved by {roleLabel(entry.approvedByRole)}
                    </Chip>
                    <span className="text-xs text-faint">
                      {formatDay(entry.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 font-display text-[1.15rem] text-ink">
                    {entry.changeLabel}
                  </p>
                  {entry.reason ? (
                    <p className="mt-1 text-xs text-faint">Because {entry.reason}</p>
                  ) : null}
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">
                    {entry.summary}
                  </p>
                  <p className="mt-3 text-xs text-faint">
                    {count(entry.affectedRecordIds.length, "record")} touched ·{" "}
                    {count(entry.followUpTaskIds.length, "follow-up")} created ·{" "}
                    {count(entry.conflicts?.length ?? 0, "conflict")} found
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-faint">
        Reading {count(sessions.length, "session")} and{" "}
        {count(graph.tasks.length, "task")} from{" "}
        {source.kind === "notion" ? "your Notion workspace" : "the bundled demo data"}.
        Nothing is written back until a person approves a change.
      </p>
    </div>
  );
}
