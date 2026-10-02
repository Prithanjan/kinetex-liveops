import type {
  AffectedRecord,
  ChangeRequest,
  EventGraph,
  ImpactReport,
} from "@/lib/domain/types";
import { detectConflicts } from "./conflicts";
import { proposeFollowUps } from "./followups";
import {
  indexGraph,
  participantsForSession,
  requiredEquipment,
  tasksForSession,
} from "./graph";
import { buildSummary } from "./summary";

/**
 * Deterministic blast-radius traversal for a venue change.
 *
 * The changed record is the session; everything reachable from it through a
 * typed edge is reported as affected, with the relation that connected it.
 * Rules decide; the summary only explains.
 */
export function computeImpact(graph: EventGraph, change: ChangeRequest): ImpactReport {
  const index = indexGraph(graph);
  const session = index.sessions.get(change.sessionId);
  if (!session) {
    throw new Error(`Unknown session: ${change.sessionId}`);
  }
  const fromVenue = index.venues.get(session.venueId);
  const toVenue = index.venues.get(change.newVenueId);
  if (!toVenue) {
    throw new Error(`Unknown venue: ${change.newVenueId}`);
  }

  const affected: AffectedRecord[] = [
    {
      id: session.id,
      entity: "sessions",
      label: session.title,
      relation: "changed_record",
    },
  ];

  if (fromVenue) {
    affected.push({
      id: fromVenue.id,
      entity: "venues",
      label: fromVenue.name,
      relation: "releasing_venue",
    });
  }
  affected.push({
    id: toVenue.id,
    entity: "venues",
    label: toVenue.name,
    relation: "receiving_venue",
  });

  for (const item of requiredEquipment(graph, session)) {
    affected.push({
      id: item.id,
      entity: "equipment",
      label: item.name,
      relation: "required_by_session",
    });
  }
  for (const person of participantsForSessionPeople(graph, session)) {
    affected.push({
      id: person.id,
      entity: "people",
      label: person.name,
      relation: "assigned_to_session",
    });
  }
  for (const group of participantsForSession(graph, session)) {
    affected.push({
      id: group.id,
      entity: "participantGroups",
      label: group.name,
      relation: "invited_to_session",
    });
  }
  for (const task of tasksForSession(graph, session.id)) {
    affected.push({
      id: task.id,
      entity: "tasks",
      label: task.title,
      relation: "follows_session",
    });
  }

  const conflicts = detectConflicts(graph, session, change);
  const followUps = proposeFollowUps(graph, session, change, conflicts);
  const summary = buildSummary(
    session,
    fromVenue,
    toVenue,
    affected,
    conflicts,
    followUps,
  );

  return {
    change,
    fromVenueId: session.venueId,
    affected,
    conflicts,
    followUps,
    summary,
  };
}

function participantsForSessionPeople(
  graph: EventGraph,
  session: EventGraph["sessions"][number],
) {
  const index = indexGraph(graph);
  return session.assignedPersonIds
    .map((id) => index.people.get(id))
    .filter((person): person is NonNullable<typeof person> => Boolean(person));
}
