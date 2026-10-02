import type { ChangeLogEntry, Conflict, EventGraph } from "@/lib/domain/types";
import { GENERATOR_LABEL } from "./summary";

export interface ReportLesson {
  id: string;
  text: string;
  sourceRecordIds: string[];
  occurrences: number;
}

export interface GeneratedReport {
  eventId: string;
  generated: true;
  generator: string;
  changes: ChangeLogEntry[];
  lessons: ReportLesson[];
  summaryText: string;
  sourceRecordIds: string[];
}

/**
 * Lessons are keyed off conflict kinds. Deterministic: the same recorded
 * conflicts always produce the same lessons, and each lesson links the records
 * that produced it.
 */
const LESSONS: Record<string, string> = {
  capacity_exceeded:
    "Reserve a fallback venue sized for the largest invited group before locking the program.",
  equipment_missing:
    "Add a per-venue equipment checklist to planning, so a room change surfaces missing gear up front.",
  equipment_unavailable:
    "Track equipment maintenance windows against session dates, and block assignments during service.",
  schedule_overlap:
    "Run a venue conflict check automatically when a change is proposed, not after it is applied.",
  communication_gap:
    "Create the attendee notification task the moment a change is proposed, not after approval.",
  coverage_gap:
    "Assign a named owner to every role a session needs at planning time.",
};

function lessonFor(kind: string): string {
  return (
    LESSONS[kind] ??
    "Review this class of conflict and add a rule or checklist step so it is caught earlier."
  );
}

function collectConflicts(changes: ChangeLogEntry[]): Conflict[] {
  return changes.flatMap((entry) => entry.conflicts ?? []);
}

export function buildReport(graph: EventGraph, eventId: string): GeneratedReport {
  const changes = graph.changeLog
    .filter((entry) => entry.eventId === eventId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const conflicts = collectConflicts(changes);

  const byKind = new Map<string, Conflict[]>();
  for (const conflict of conflicts) {
    const group = byKind.get(conflict.kind) ?? [];
    group.push(conflict);
    byKind.set(conflict.kind, group);
  }

  const lessons: ReportLesson[] = Array.from(byKind.entries()).map(
    ([kind, group]) => ({
      id: `lesson-${kind}`,
      text: lessonFor(kind),
      sourceRecordIds: Array.from(new Set(group.flatMap((c) => c.recordIds))),
      occurrences: group.length,
    }),
  );

  const affected = new Set(changes.flatMap((entry) => entry.affectedRecordIds));
  const sourceRecordIds = Array.from(
    new Set([eventId, ...affected, ...conflicts.flatMap((c) => c.recordIds)]),
  );

  const event = graph.events.find((item) => item.id === eventId);
  const summaryText =
    changes.length === 0
      ? `No approved changes recorded for ${event?.name ?? eventId} yet.`
      : `${changes.length} approved change(s) for ${event?.name ?? eventId} touched ` +
        `${affected.size} distinct records, and the rules found ${conflicts.length} ` +
        `conflict(s) across ${lessons.length} category(ies). Consider: ` +
        lessons.map((lesson) => lesson.text).join(" ");

  return {
    eventId,
    generated: true,
    generator: GENERATOR_LABEL,
    changes,
    lessons,
    summaryText,
    sourceRecordIds,
  };
}
