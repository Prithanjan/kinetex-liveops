import type {
  ChangeLogEntry,
  ChangeRequest,
  EventGraph,
  Role,
  Task,
} from "@/lib/domain/types";
import { computeImpact } from "./impact";
import { proposedSession } from "./prospect";

export interface ApplyResult {
  graph: EventGraph;
  entry: ChangeLogEntry;
  report: ReturnType<typeof computeImpact>;
}

export interface ApplyOptions {
  /** If omitted or empty, every proposed follow-up is applied. */
  selectedFollowUpIds?: string[];
}

function nextChangeId(graph: EventGraph): string {
  return `chg-${String(graph.changeLog.length + 1).padStart(3, "0")}`;
}

/**
 * Writes the approved change back to the graph:
 *  1. move the session to its proposed state
 *  2. create the approved follow-up tasks
 *  3. append a linked change log entry
 *
 * Nothing is written before a person approves, and the entry records who did.
 */
export function applyChange(
  graph: EventGraph,
  change: ChangeRequest,
  approvedByRole: Role,
  options: ApplyOptions = {},
): ApplyResult {
  const report = computeImpact(graph, change);
  const session = graph.sessions.find((item) => item.id === change.sessionId);
  if (!session) throw new Error(`Unknown session: ${change.sessionId}`);

  const proposed = proposedSession(session, change);

  const selected =
    options.selectedFollowUpIds && options.selectedFollowUpIds.length > 0
      ? report.followUps.filter((followUp) =>
          options.selectedFollowUpIds!.includes(followUp.id),
        )
      : report.followUps;

  const changeId = nextChangeId(graph);
  const now = new Date().toISOString();

  const nextTasks: Task[] = selected.map((followUp) => ({
    id: `tsk-${changeId}-${followUp.id}`,
    title: followUp.title,
    ownerRole: followUp.ownerRole,
    ownerPersonId: followUp.ownerPersonId,
    sessionId: change.sessionId,
    status: "todo",
    dueAt: followUp.dueAt,
    sourceChangeId: changeId,
  }));

  const entry: ChangeLogEntry = {
    id: changeId,
    createdAt: now,
    changeType: change.changeType,
    eventId: change.eventId,
    sessionId: change.sessionId,
    changeLabel: report.changeLabel,
    fromVenueId: change.changeType === "venue_change" ? session.venueId : undefined,
    toVenueId: change.changeType === "venue_change" ? change.newVenueId : undefined,
    reason: change.reason,
    affectedRecordIds: report.affected.map((record) => record.id),
    followUpTaskIds: nextTasks.map((task) => task.id),
    approvedByRole,
    summary: report.summary.text,
    conflicts: report.conflicts,
  };

  const nextGraph: EventGraph = {
    ...graph,
    sessions: graph.sessions.map((item) =>
      item.id === change.sessionId ? proposed : item,
    ),
    tasks: [...graph.tasks, ...nextTasks],
    changeLog: [...graph.changeLog, entry],
  };

  return { graph: nextGraph, entry, report };
}
