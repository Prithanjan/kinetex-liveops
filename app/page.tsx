import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { formatDateTime, roleLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const source = await getSource();
  const graph = await source.readGraph();
  const event = graph.events[0];
  const venueName = (id: string) =>
    graph.venues.find((venue) => venue.id === id)?.name ?? "Unknown venue";

  const openTasks = graph.tasks.filter((task) => task.status !== "done");
  const blockingChanges = graph.changeLog.length;

  const stats = [
    { label: "Sessions", value: graph.sessions.length },
    { label: "Open tasks", value: openTasks.length },
    { label: "Changes recorded", value: blockingChanges },
    { label: "Source", value: source.kind },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-widest text-cyan-400">
          {event ? event.status.replace("_", " ") : "no event"}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-50">
          {event?.name ?? "No event loaded"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          One change-to-closure workflow: plan, detect dependencies, preview impact,
          assign follow-ups, approve and sync, brief each role, then capture lessons.
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href="/change"
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
          >
            Simulate a venue change
          </Link>
          <Link
            href="/roles"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            View role briefings
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
          >
            <div className="text-xs uppercase tracking-wider text-slate-500">
              {stat.label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">
              {stat.value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Sessions
          </h2>
          <ul className="mt-4 space-y-3">
            {graph.sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-medium text-slate-100">
                    {session.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(session.startTime)} · {venueName(session.venueId)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {session.requiredEquipmentIds.length} equipment ·{" "}
                  {session.assignedPersonIds.length} assigned
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Open tasks by role
          </h2>
          <ul className="mt-4 space-y-3">
            {openTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <div className="text-sm text-slate-100">{task.title}</div>
                  <div className="text-xs text-slate-500">
                    Due {formatDateTime(task.dueAt)}
                    {task.sourceChangeId ? ` · from ${task.sourceChangeId}` : ""}
                  </div>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                  {roleLabel(task.ownerRole)}
                </span>
              </li>
            ))}
            {openTasks.length === 0 && (
              <li className="text-sm text-slate-500">No open tasks.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Change log
        </h2>
        {graph.changeLog.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No changes recorded yet. Run the change console to write the first linked
            entry.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {graph.changeLog.map((entry) => (
              <li key={entry.id} className="border-l-2 border-cyan-500/60 pl-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono text-cyan-300">{entry.id}</span>
                  <span>{entry.changeType}</span>
                  <span>· approved by {roleLabel(entry.approvedByRole)}</span>
                  <span>· {formatDateTime(entry.createdAt)}</span>
                </div>
                <div className="mt-1 text-sm text-slate-200">
                  {venueName(entry.fromVenueId)} → {venueName(entry.toVenueId)}
                </div>
                <p className="mt-1 text-sm text-slate-400">{entry.summary}</p>
                <div className="mt-1 text-xs text-slate-500">
                  {entry.affectedRecordIds.length} affected records ·{" "}
                  {entry.followUpTaskIds.length} follow-up tasks
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
