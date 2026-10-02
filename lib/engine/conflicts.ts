import type {
  ChangeRequest,
  Conflict,
  EventGraph,
  Session,
} from "@/lib/domain/types";
import {
  byId,
  indexGraph,
  overlaps,
  participantsForSession,
  requiredEquipment,
  sessionsInVenue,
  tasksForSession,
} from "./graph";

/**
 * Rules determine the impact. These checks are deterministic and each one
 * cites the exact records it read, so the UI can point back at source facts.
 */
export function detectConflicts(
  graph: EventGraph,
  session: Session,
  change: ChangeRequest,
): Conflict[] {
  const index = indexGraph(graph);
  const target = index.venues.get(change.newVenueId);
  const conflicts: Conflict[] = [];
  if (!target) return conflicts;

  // 1. Capacity: everybody invited must physically fit.
  const groups = participantsForSession(graph, session);
  const crowd = groups.reduce((total, group) => total + group.size, 0);
  if (crowd > target.capacity) {
    conflicts.push({
      id: `conf-capacity-${session.id}`,
      severity: "blocking",
      kind: "capacity_exceeded",
      message: `${target.name} seats ${target.capacity}, but ${crowd} attendees are invited to "${session.title}".`,
      recordIds: [session.id, target.id, ...groups.map((g) => g.id)],
    });
  }

  // 2. Missing equipment: the new venue must already host every required item.
  const venueEquipment = new Set(target.equipmentIds);
  const missing = requiredEquipment(graph, session).filter(
    (item) => !venueEquipment.has(item.id),
  );
  if (missing.length > 0) {
    conflicts.push({
      id: `conf-equipment-missing-${session.id}`,
      severity: "blocking",
      kind: "equipment_missing",
      message: `${target.name} is missing required equipment: ${missing
        .map((item) => item.name)
        .join(", ")}.`,
      recordIds: [session.id, target.id, ...missing.map((item) => item.id)],
    });
  }

  // 3. Unavailable equipment anywhere in the requirement set.
  const unavailable = requiredEquipment(graph, session).filter(
    (item) => item.status !== "available",
  );
  if (unavailable.length > 0) {
    conflicts.push({
      id: `conf-equipment-status-${session.id}`,
      severity: "warning",
      kind: "equipment_unavailable",
      message: `Required equipment not currently available: ${unavailable
        .map((item) => `${item.name} (${item.status})`)
        .join(", ")}.`,
      recordIds: unavailable.map((item) => item.id),
    });
  }

  // 4. Schedule overlap: nobody else can already own that room and time slot.
  const clashes = sessionsInVenue(graph, change.newVenueId).filter(
    (other) => other.id !== session.id && overlaps(session, other),
  );
  if (clashes.length > 0) {
    conflicts.push({
      id: `conf-overlap-${session.id}`,
      severity: "blocking",
      kind: "schedule_overlap",
      message: `${target.name} is already booked during this slot: ${clashes
        .map((other) => other.title)
        .join(", ")}.`,
      recordIds: [session.id, ...clashes.map((other) => other.id)],
    });
  }

  // 5. Communication gap: a venue change nobody told attendees about.
  const hasOpenCommsTask = tasksForSession(graph, session.id).some(
    (task) => task.ownerRole === "communications" && task.status !== "done",
  );
  if (!hasOpenCommsTask) {
    conflicts.push({
      id: `conf-comms-gap-${session.id}`,
      severity: "warning",
      kind: "communication_gap",
      message: `No open communications task references "${session.title}", so attendees may miss the venue change.`,
      recordIds: [session.id, ...groups.map((g) => g.id)],
    });
  }

  // 6. Coverage: the sessions assigned people should span the roles it needs.
  const assignedRoles = new Set(
    session.assignedPersonIds.flatMap((id) => byId(graph.people).get(id)?.roles ?? []),
  );
  if (!assignedRoles.has("logistics")) {
    conflicts.push({
      id: `conf-coverage-${session.id}`,
      severity: "info",
      kind: "coverage_gap",
      message: `No logistics owner is assigned to "${session.title}"; move coordination is unowned.`,
      recordIds: [session.id, ...session.assignedPersonIds],
    });
  }

  return conflicts;
}

/** Convenience re-export so callers import from one module. */
export { sessionsInVenue };
