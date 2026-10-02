import type {
  AffectedRecord,
  ChangeRequest,
  EventGraph,
  ImpactReport,
  Session,
} from "@/lib/domain/types";
import { indexGraph } from "./graph";
import { describeChange, proposedSession } from "./prospect";
import { proposeFollowUps } from "./followups";
import { evaluateRules } from "./rules";
import { buildSummary } from "./summary";

const isoDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

/** Build the affected-record list by following typed edges from the session. */
function buildAffected(
  graph: EventGraph,
  session: Session,
  proposed: Session,
): AffectedRecord[] {
  const index = indexGraph(graph);
  const affected: AffectedRecord[] = [
    {
      id: session.id,
      entity: "sessions",
      label: session.title,
      relation: "changed_record",
    },
  ];

  // Both the session's own resources and anything the change proposes.
  const equipmentIds = Array.from(
    new Set([...session.requiredEquipmentIds, ...proposed.requiredEquipmentIds]),
  );
  for (const id of equipmentIds) {
    const item = index.equipment.get(id);
    if (item) {
      affected.push({
        id: item.id,
        entity: "equipment",
        label: item.name,
        relation: "required_by_session",
      });
    }
  }

  for (const id of session.assignedPersonIds) {
    const person = index.people.get(id);
    if (person) {
      affected.push({
        id: person.id,
        entity: "people",
        label: person.name,
        relation: "assigned_to_session",
      });
    }
  }

  for (const id of session.participantGroupIds) {
    const group = index.groups.get(id);
    if (group) {
      affected.push({
        id: group.id,
        entity: "participantGroups",
        label: group.name,
        relation: "invited_to_session",
      });
    }
  }

  for (const task of graph.tasks.filter((item) => item.sessionId === session.id)) {
    affected.push({
      id: task.id,
      entity: "tasks",
      label: task.title,
      relation: "follows_session",
    });
  }

  // Venues are affected for venue changes specifically.
  for (const venueId of new Set([session.venueId, proposed.venueId])) {
    const venue = index.venues.get(venueId);
    if (!venue) continue;
    affected.push({
      id: venue.id,
      entity: "venues",
      label: venue.name,
      relation:
        venueId === proposed.venueId && venueId !== session.venueId
          ? "receiving_venue"
          : "current_venue",
    });
  }

  return affected;
}

/**
 * Deterministic blast-radius traversal for any supported change type.
 *
 * The changed record is the session; everything reachable from it through a
 * typed edge is reported as affected. Rules decide; the summary only explains.
 */
export function computeImpact(graph: EventGraph, change: ChangeRequest): ImpactReport {
  const index = indexGraph(graph);
  const session = index.sessions.get(change.sessionId);
  if (!session) {
    throw new Error(`Unknown session: ${change.sessionId}`);
  }

  const proposed = proposedSession(session, change);
  if (!index.venues.get(proposed.venueId)) {
    throw new Error(`Unknown venue: ${proposed.venueId}`);
  }

  const changeLabel = describeChange(change, session, {
    venue: (id) => index.venues.get(id)?.name ?? id,
    equipment: (id) => index.equipment.get(id)?.name ?? id,
    person: (id) => index.people.get(id)?.name ?? id,
    time: isoDate,
  });

  const affected = buildAffected(graph, session, proposed);
  const conflicts = evaluateRules({
    graph,
    index,
    proposed,
    current: session,
    change,
  });
  const followUps = proposeFollowUps(graph, session, proposed, change, conflicts);
  const summary = buildSummary(
    session,
    changeLabel,
    affected,
    conflicts,
    followUps,
  );

  return { change, changeLabel, affected, conflicts, followUps, summary };
}
