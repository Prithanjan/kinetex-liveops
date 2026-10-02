import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { ROLES, type Role } from "@/lib/domain/types";
import { formatDateTime, roleLabel } from "@/lib/format";

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
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">
          Step 6 · role briefing
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-50">
          Who owns what now
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Role-specific interfaces over the same approved records. These views
          filter by role; they are not access-controlled (see the demo non-claims).
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {ROLES.map((item) => (
          <Link
            key={item}
            href={`/roles?role=${item}`}
            className={`rounded-md border px-3 py-2 text-sm transition ${
              item === role
                ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                : "border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {roleLabel(item)}
          </Link>
        ))}
      </nav>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Owned</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">
            {owned.length}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Open</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{open.length}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Blockers
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">
            {blockers.length}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          {roleLabel(role)} tasks
        </h2>
        <ul className="mt-4 space-y-3">
          {owned.map((task) => (
            <li
              key={task.id}
              className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0"
            >
              <div>
                <div className="text-sm text-slate-100">{task.title}</div>
                <div className="text-xs text-slate-500">
                  {sessionTitle(task.sessionId)} · due {formatDateTime(task.dueAt)}
                  {task.sourceChangeId ? ` · from ${task.sourceChangeId}` : ""}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  task.status === "done"
                    ? "bg-emerald-500/15 text-emerald-200"
                    : task.status === "blocked"
                      ? "bg-rose-500/15 text-rose-200"
                      : "bg-slate-800 text-slate-300"
                }`}
              >
                {task.status.replace("_", " ")}
              </span>
            </li>
          ))}
          {owned.length === 0 && (
            <li className="text-sm text-slate-500">
              No tasks currently owned by this role.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Recent approved changes
        </h2>
        {recentChanges.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No changes recorded yet. Apply one in the Change Console.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recentChanges.map((entry) => (
              <li key={entry.id} className="border-l-2 border-cyan-500/60 pl-4">
                <div className="font-mono text-xs text-cyan-300">{entry.id}</div>
                <p className="mt-1 text-sm text-slate-300">{entry.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
