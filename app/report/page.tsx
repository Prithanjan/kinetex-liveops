import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { buildReport } from "@/lib/engine/report";
import { formatDateTime, roleLabel } from "@/lib/format";
import { Card, Chip, Empty, PageHeader, SectionTitle, titleCase } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const source = await getSource();
  const graph = await source.readGraph();
  const eventId = graph.events[0]?.id ?? "";
  const report = buildReport(graph, eventId);

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
    <div className="space-y-10">
      <PageHeader eyebrow="Capture lessons" title="Post-event report">
        Built from the approved change log, so it reflects decisions that were
        actually recorded, not a reconstruction.
      </PageHeader>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="accent">generated</Chip>
          <span className="text-xs text-faint">{report.generator}</span>
          <span className="text-xs text-faint">
            · {report.sourceRecordIds.length} source records linked
          </span>
        </div>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
          {report.summaryText}
        </p>
      </Card>

      <Card>
        <SectionTitle meta={`${report.changes.length} recorded`}>
          Recorded changes
        </SectionTitle>
        {report.changes.length === 0 ? (
          <div className="mt-5">
            <Empty>
              No approved changes yet. Run one in the{" "}
              <Link href="/change" className="text-accent underline">
                change console
              </Link>
              .
            </Empty>
          </div>
        ) : (
          <ul className="mt-5 space-y-5">
            {report.changes.map((entry) => (
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
                  {entry.changeLabel}
                </div>
                {entry.reason && (
                  <div className="mt-1 text-xs text-faint">
                    Reason: {entry.reason}
                  </div>
                )}
                <div className="mt-1.5 text-xs text-faint">
                  {entry.affectedRecordIds.length} affected ·{" "}
                  {entry.followUpTaskIds.length} follow-up tasks ·{" "}
                  {entry.conflicts?.length ?? 0} conflicts recorded
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle meta={`${report.lessons.length} lessons`}>
          Reusable lessons
        </SectionTitle>
        {report.lessons.length === 0 ? (
          <div className="mt-5">
            <Empty>
              Lessons appear once a change is approved, one per conflict category.
            </Empty>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {report.lessons.map((lesson) => (
              <li
                key={lesson.id}
                className="rounded-lg border border-line bg-paper p-4"
              >
                <div className="text-sm leading-relaxed text-ink">{lesson.text}</div>
                <div className="mt-1.5 text-xs text-faint">
                  from {lesson.occurrences} recorded conflict(s) ·{" "}
                  {lesson.sourceRecordIds.length} source records
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle meta={`${report.sourceRecordIds.length} linked`}>
          Source records
        </SectionTitle>
        <div className="mt-5 flex flex-wrap gap-2">
          {report.sourceRecordIds.map((id) => (
            <span
              key={id}
              title={id}
              className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs text-ink-soft"
            >
              {recordLabel(id)}
            </span>
          ))}
          {report.sourceRecordIds.length === 0 && (
            <Empty>No records yet.</Empty>
          )}
        </div>
      </Card>
    </div>
  );
}
