import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { buildReport } from "@/lib/engine/report";
import { formatDateTime, roleLabel } from "@/lib/format";
import {
  Callout,
  Card,
  CardBody,
  Chip,
  Empty,
  IconTile,
  PageHeader,
  SectionTitle,
  Stat,
  titleCase,
} from "@/components/ui";
import {
  IconFlag,
  IconInfo,
  IconLayers,
  IconRoute,
  IconSparkle,
} from "@/components/icons";

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
      <PageHeader
        eyebrow="Capture lessons"
        title="Post-event report"
        aside={
          <Chip tone="accent" icon={<IconSparkle className="h-3.5 w-3.5" />}>
            generated · not an LLM call
          </Chip>
        }
      >
        Built from the approved change log, so it reflects decisions that were
        actually recorded, not a reconstruction.
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Recorded changes"
          value={report.changes.length}
          icon={<IconRoute className="h-4 w-4" />}
          tone="plum"
        />
        <Stat
          label="Reusable lessons"
          value={report.lessons.length}
          icon={<IconFlag className="h-4 w-4" />}
          tone="moss"
        />
        <Stat
          label="Linked records"
          value={report.sourceRecordIds.length}
          icon={<IconLayers className="h-4 w-4" />}
          tone="slate"
        />
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-accent/25 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-ink">
              generated
            </span>
            <span className="text-xs text-faint">{report.generator}</span>
          </div>
          <p className="mt-4 text-lead leading-relaxed text-ink-soft">
            {report.summaryText}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionTitle
            icon={<IconRoute className="h-5 w-5" />}
            meta={`${report.changes.length} recorded`}
          >
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
            <ul className="mt-6 space-y-4">
              {report.changes.map((entry) => (
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
                  {entry.reason && (
                    <div className="mt-1 text-xs text-faint">
                      Reason: {entry.reason}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-faint">
                    <span>{entry.affectedRecordIds.length} affected</span>
                    <span>{entry.followUpTaskIds.length} follow-up tasks</span>
                    <span>{entry.conflicts?.length ?? 0} conflicts recorded</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionTitle
            icon={<IconFlag className="h-5 w-5" />}
            meta={`${report.lessons.length} lessons`}
          >
            Reusable lessons
          </SectionTitle>
          {report.lessons.length === 0 ? (
            <div className="mt-5">
              <Empty>
                Lessons appear once a change is approved, one per conflict category.
              </Empty>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {report.lessons.map((lesson, index) => (
                <li
                  key={lesson.id}
                  className="flex gap-4 rounded-card border border-line bg-surface-sunk p-5"
                >
                  <IconTile tone="accent" size="sm">
                    <span className="text-xs font-semibold tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </IconTile>
                  <div className="min-w-0">
                    <p className="text-sm leading-relaxed text-ink">{lesson.text}</p>
                    <div className="mt-2 text-xs text-faint">
                      from {lesson.occurrences} recorded conflict(s) ·{" "}
                      {lesson.sourceRecordIds.length} source records
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionTitle
            icon={<IconLayers className="h-5 w-5" />}
            meta={`${report.sourceRecordIds.length} linked`}
          >
            Source records
          </SectionTitle>
          <div className="mt-5 flex flex-wrap gap-2">
            {report.sourceRecordIds.map((id) => (
              <span
                key={id}
                title={id}
                className="rounded-md border border-line bg-surface-sunk px-2.5 py-1 text-xs text-ink-soft"
              >
                {recordLabel(id)}
              </span>
            ))}
            {report.sourceRecordIds.length === 0 && <Empty>No records yet.</Empty>}
          </div>
        </CardBody>
      </Card>

      <Callout
        title="How this report is produced"
        tone="slate"
        icon={<IconInfo className="h-4 w-4" />}
      >
        Conflicts detected at preview time are stored with the approved change, so
        lessons come from what the rules actually found rather than a re-run against
        an already-moved schedule. The text is assembled by rules and labeled as
        generated; no model is involved, and nothing here claims measured
        operational improvement.
      </Callout>
    </div>
  );
}
