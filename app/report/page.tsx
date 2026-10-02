import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { buildReport } from "@/lib/engine/report";
import { formatDateTime, roleLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const source = await getSource();
  const graph = await source.readGraph();
  const eventId = graph.events[0]?.id ?? "";
  const report = buildReport(graph, eventId);
  const event = graph.events.find((item) => item.id === eventId);
  const venueName = (id: string) =>
    graph.venues.find((venue) => venue.id === id)?.name ?? id;

  const recordLabel = (id: string) =>
    graph.sessions.find((s) => s.id === id)?.title ??
    graph.venues.find((v) => v.id === id)?.name ??
    graph.equipment.find((e) => e.id === id)?.name ??
    graph.people.find((p) => p.id === id)?.name ??
    graph.participantGroups.find((g) => g.id === id)?.name ??
    graph.tasks.find((t) => t.id === id)?.title ??
    graph.events.find((e) => e.id === id)?.name ??
    id;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">
          Step 7 · capture lessons
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-50">
          Post-event report
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Built from the approved change log, so it reflects decisions that were
          actually recorded, not a reconstruction.
        </p>
      </header>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-500/50 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">
            generated · {report.generator}
          </span>
          <span className="text-xs text-slate-500">
            {report.sourceRecordIds.length} source records linked
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-200">{report.summaryText}</p>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Recorded changes · {report.changes.length}
        </h2>
        {report.changes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No approved changes yet. Run one in the{" "}
            <Link href="/change" className="text-cyan-400 underline">
              Change Console
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {report.changes.map((entry) => (
              <li key={entry.id} className="border-l-2 border-cyan-500/60 pl-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono text-cyan-300">{entry.id}</span>
                  <span>{venueName(entry.fromVenueId)} → {venueName(entry.toVenueId)}</span>
                  <span>· approved by {roleLabel(entry.approvedByRole)}</span>
                  <span>· {formatDateTime(entry.createdAt)}</span>
                </div>
                {entry.reason && (
                  <div className="mt-1 text-xs text-slate-500">Reason: {entry.reason}</div>
                )}
                <div className="mt-1 text-xs text-slate-500">
                  {entry.affectedRecordIds.length} affected ·{" "}
                  {entry.followUpTaskIds.length} follow-up tasks ·{" "}
                  {entry.conflicts?.length ?? 0} conflicts recorded
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Reusable lessons · {report.lessons.length}
        </h2>
        {report.lessons.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Lessons appear once a change is approved, one per conflict category.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {report.lessons.map((lesson) => (
              <li
                key={lesson.id}
                className="rounded-md border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="text-sm text-slate-100">{lesson.text}</div>
                <div className="mt-1 text-xs text-slate-500">
                  from {lesson.occurrences} recorded conflict(s) ·{" "}
                  {lesson.sourceRecordIds.length} source records
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Source records
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {report.sourceRecordIds.map((id) => (
            <span
              key={id}
              title={id}
              className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-300"
            >
              {recordLabel(id)}
            </span>
          ))}
          {report.sourceRecordIds.length === 0 && (
            <span className="text-sm text-slate-500">No records yet.</span>
          )}
        </div>
      </section>
    </div>
  );
}
