import Link from "next/link";
import { getSource } from "@/lib/data/source";
import { buildReport } from "@/lib/engine/report";
import type { EventGraph } from "@/lib/domain/types";
import {
  count,
  entityLabel,
  formatDateTime,
  formatLongDay,
  roleLabel,
  titleCase,
} from "@/lib/format";
import {
  Callout,
  Card,
  CardBody,
  Chip,
  Empty,
  IconTile,
  PageHeader,
} from "@/components/ui";
import { IconInfo, IconSparkle } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const source = await getSource();
  const graph = await source.readGraph();
  const eventId = graph.events[0]?.id ?? "";
  const event = graph.events[0];
  const report = buildReport(graph, eventId);

  /** Names, never internal ids: a person reads this page. */
  const recordName = (id: string) =>
    graph.sessions.find((s) => s.id === id)?.title ??
    graph.venues.find((v) => v.id === id)?.name ??
    graph.equipment.find((e) => e.id === id)?.name ??
    graph.people.find((p) => p.id === id)?.name ??
    graph.participantGroups.find((g) => g.id === id)?.name ??
    graph.tasks.find((t) => t.id === id)?.title ??
    graph.events.find((e) => e.id === id)?.name ??
    id;

  const timeline = [...report.changes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="After the doors close"
        title="What the day taught us"
        aside={
          <Chip tone="accent" icon={<IconSparkle className="h-3.5 w-3.5" />}>
            written from the record
          </Chip>
        }
      >
        {event ? formatLongDay(event.date) : "This event"} — assembled from the
        decisions people actually approved, not from anyone&apos;s memory of them.
      </PageHeader>

      {/* ── The narrative ───────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl2 border border-line bg-surface shadow-[var(--shadow-lift)]">
        <div className="hero-art relative px-7 py-9 sm:px-10 sm:py-11">
          <div className="relative max-w-3xl">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
              In short
            </p>
            <p className="mt-4 font-display text-lead leading-relaxed text-ink sm:text-[1.35rem] sm:leading-[1.55]">
              {report.summaryText}
            </p>
            <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
              <span>{count(report.changes.length, "change")} approved by a person</span>
              <span>{count(report.lessons.length, "lesson")} worth keeping</span>
              <span>{count(report.sourceRecordIds.length, "record")} read</span>
            </p>
            <p className="mt-2 text-[0.6875rem] text-faint">{report.generator}</p>
          </div>
        </div>
      </section>

      {/* ── The timeline ────────────────────────────────────────────────── */}
      <Card>
        <CardBody>
          <h2 className="font-display text-title text-ink">How the day actually went</h2>

          {timeline.length === 0 ? (
            <div className="mt-6">
              <Empty>
                Nothing has been changed yet, so there is nothing to review. Record one
                in the{" "}
                <Link href="/change" className="text-accent underline">
                  change console
                </Link>{" "}
                and it appears here.
              </Empty>
            </div>
          ) : (
            <ol className="mt-7 space-y-7">
              {timeline.map((entry, index) => (
                <li key={entry.id} className="grid grid-cols-[5.5rem_1fr] gap-5">
                  <div className="pt-1 text-right">
                    <div className="font-display text-sm text-ink">
                      {formatDateTime(entry.createdAt).split(",")[0]}
                    </div>
                    <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
                      step {index + 1}
                    </div>
                  </div>
                  <div className="relative border-l border-line pl-6">
                    <span className="absolute -left-[7px] top-2 h-3.5 w-3.5 rounded-full border-2 border-surface bg-plum" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone="plum">{titleCase(entry.changeType)}</Chip>
                      <span className="text-xs text-faint">
                        approved by {roleLabel(entry.approvedByRole)}
                      </span>
                    </div>
                    <p className="mt-2.5 font-display text-[1.15rem] text-ink">
                      {entry.changeLabel}
                    </p>
                    {entry.reason ? (
                      <p className="mt-1 text-xs text-faint">Because {entry.reason}</p>
                    ) : null}
                    <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted">
                      {entry.summary}
                    </p>
                    <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-faint">
                      <span>{count(entry.affectedRecordIds.length, "record")} touched</span>
                      <span>{count(entry.followUpTaskIds.length, "follow-up")} created</span>
                      <span>{count(entry.conflicts?.length ?? 0, "conflict")} found</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      {/* ── Lessons ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-title text-ink">What to do differently</h2>
          <Chip tone="moss">{count(report.lessons.length, "lesson")}</Chip>
        </div>

        {report.lessons.length === 0 ? (
          <div className="mt-5">
            <Empty>
              Lessons appear once a change that hit a conflict is approved. A clean run
              leaves nothing here — which is the point.
            </Empty>
          </div>
        ) : (
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {report.lessons.map((lesson, index) => (
              <li
                key={lesson.id}
                className="flex gap-4 rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
              >
                <IconTile tone="accent" size="sm">
                  <span className="text-xs font-semibold tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </IconTile>
                <div className="min-w-0">
                  <p className="text-sm leading-relaxed text-ink">{lesson.text}</p>
                  <p className="mt-2.5 text-xs text-faint">
                    from {count(lesson.occurrences, "recorded conflict")} ·{" "}
                    {count(lesson.sourceRecordIds.length, "source record")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Sources ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-title text-ink">What this was read from</h2>
        <p className="mt-2 flex flex-wrap gap-2">
          {report.sourceRecordIds.map((id) => (
            <span
              key={id}
              className="rounded-full border border-line bg-surface-sunk px-3 py-1 text-xs text-ink-soft"
            >
              {recordName(id)}
              <span className="ml-2 text-faint">{entityLabel(guessEntity(graph, id))}</span>
            </span>
          ))}
          {report.sourceRecordIds.length === 0 && <Empty>No records yet.</Empty>}
        </p>
      </section>

      <Callout
        title="Where these words come from"
        tone="slate"
        icon={<IconInfo className="h-4 w-4" />}
      >
        Conflicts are recorded at the moment a change is previewed and saved alongside
        it, so the lessons describe what the rules actually found rather than a fresh
        guess at an already-moved schedule. The text is put together by rules and
        labelled as generated — no model is involved, and nothing here claims a measured
        operational improvement.
        {source.kind === "notion" ? " It reads your Notion workspace on demand." : " It reads the bundled demo data."}
      </Callout>
    </div>
  );
}

/** Which collection a source-record id came from, for the small type label. */
function guessEntity(graph: EventGraph, id: string): string {
  if (graph.sessions.some((item) => item.id === id)) return "sessions";
  if (graph.venues.some((item) => item.id === id)) return "venues";
  if (graph.equipment.some((item) => item.id === id)) return "equipment";
  if (graph.people.some((item) => item.id === id)) return "people";
  if (graph.participantGroups.some((item) => item.id === id)) return "participantGroups";
  if (graph.tasks.some((item) => item.id === id)) return "tasks";
  if (graph.events.some((item) => item.id === id)) return "events";
  return "changeLog";
}
