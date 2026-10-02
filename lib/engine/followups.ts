import type {
  ChangeRequest,
  Conflict,
  EventGraph,
  ProposedFollowUp,
  Role,
  Session,
} from "@/lib/domain/types";
import { hoursBefore } from "./graph";
import { candidatesFor, neededRoles } from "./rules";

/** Deadline pressure: how many hours before the session this work must land. */
const LEAD_HOURS: Record<string, number> = {
  capacity_exceeded: 6,
  equipment_missing: 12,
  equipment_unavailable: 12,
  schedule_overlap: 8,
  event_hours_violation: 24,
  person_double_booked: 16,
  attendee_overlap: 10,
  equipment_elsewhere: 14,
  maintenance_window: 14,
  transport_lead_time: 12,
  coverage_gap: 16,
  unassigned_role: 16,
  skill_gap: 12,
  communication_gap: 8,
};

const TITLES: Record<string, string> = {
  capacity_exceeded: "Resolve capacity for the session",
  equipment_missing: "Move required equipment into the room",
  equipment_unavailable: "Resolve unavailable equipment before setup",
  schedule_overlap: "Clear the double booking",
  event_hours_violation: "Confirm the out-of-hours slot",
  person_double_booked: "Resolve the person double booking",
  attendee_overlap: "Deconflict the overlapping audience",
  equipment_elsewhere: "Re-secure equipment promised elsewhere",
  maintenance_window: "Escalate the maintenance-blocked equipment",
  transport_lead_time: "Arrange equipment transport",
  coverage_gap: "Assign a logistics owner",
  unassigned_role: "Restore an owner for the vacated role",
  skill_gap: "Brief the newly assigned people",
  communication_gap: "Notify attendees about the change",
};

const FALLBACK_OWNER: Role = "organizer";

function ownerFor(conflict: Conflict): Role {
  return conflict.ownerRole ?? FALLBACK_OWNER;
}

/**
 * Each conflict becomes an owned action with a deadline, plus a small set of
 * always-on coordination steps. Owners are roles, so the command center can
 * brief each team without inventing assignments.
 *
 * Where a role is uncovered, candidates are *proposed* (ranked by current load)
 * for a human to accept. Nothing is reassigned automatically.
 */
export function proposeFollowUps(
  graph: EventGraph,
  session: Session,
  proposed: Session,
  change: ChangeRequest,
  conflicts: Conflict[],
): ProposedFollowUp[] {
  const followUps: ProposedFollowUp[] = [];
  const sessionTitle = session.title;

  const add = (followUp: ProposedFollowUp) => {
    if (!followUps.some((existing) => existing.id === followUp.id)) {
      followUps.push(followUp);
    }
  };

  const appendedCandidateRoles = new Set<string>();

  for (const conflict of conflicts) {
    const lead = LEAD_HOURS[conflict.kind] ?? 8;
    const role = ownerFor(conflict);
    const isCoverage =
      conflict.kind === "coverage_gap" ||
      conflict.kind === "unassigned_role" ||
      conflict.kind === "skill_gap";

    let candidatePersonIds: string[] | undefined;
    if (isCoverage) {
      const covered = new Set(
        graph.people
          .filter((person) => proposed.assignedPersonIds.includes(person.id))
          .flatMap((person) => person.roles),
      );
      const gaps = neededRoles().filter((needed) => !covered.has(needed));
      const pool = (gaps.length > 0 ? gaps : neededRoles())
        .flatMap((needed) => candidatesFor(graph, needed, session.id))
        .filter((person) => {
          if (appendedCandidateRoles.has(person.id)) return false;
          appendedCandidateRoles.add(person.id);
          return true;
        })
        .slice(0, 3)
        .map((person) => person.id);
      candidatePersonIds = pool.length > 0 ? pool : undefined;
    }

    add({
      id: `fu-${conflict.kind}-${session.id}`,
      title: `${TITLES[conflict.kind] ?? "Resolve the conflict"}: "${sessionTitle}"`,
      ownerRole: role,
      dueAt: hoursBefore(proposed.startTime, lead),
      reason: conflict.message,
      relatedRecordIds: conflict.recordIds,
      candidatePersonIds,
    });
  }

  add({
    id: `fu-volunteers-${session.id}`,
    title: `Re-brief volunteers on the updated plan for "${sessionTitle}"`,
    ownerRole: "volunteer_coordinator",
    dueAt: hoursBefore(proposed.startTime, 4),
    reason: "Assigned volunteers operated against the previous plan.",
    relatedRecordIds: [session.id, ...session.assignedPersonIds],
  });

  add({
    id: `fu-runbook-${session.id}`,
    title: `Update run of show and signage for "${sessionTitle}"`,
    ownerRole: "organizer",
    dueAt: hoursBefore(proposed.startTime, 3),
    reason: "Operational documents still reference the previous plan.",
    relatedRecordIds: [session.id, change.eventId],
  });

  add({
    id: `fu-leadership-${session.id}`,
    title: "Add the change to the leadership briefing",
    ownerRole: "leadership",
    dueAt: hoursBefore(proposed.startTime, 1),
    reason: "Leadership tracks escalation risk for the event.",
    relatedRecordIds: [session.id, change.eventId],
  });

  return followUps;
}
