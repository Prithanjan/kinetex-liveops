import type {
  ChangeRequest,
  Conflict,
  EventGraph,
  ProposedFollowUp,
  Session,
} from "@/lib/domain/types";
import { hoursBefore } from "./graph";

/**
 * Each conflict becomes an owned action with a deadline, plus a small set of
 * always-on coordination steps. Owners are roles, so the command center can
 * brief each team without inventing assignments.
 */
export function proposeFollowUps(
  graph: EventGraph,
  session: Session,
  change: ChangeRequest,
  conflicts: Conflict[],
): ProposedFollowUp[] {
  const venue = graph.venues.find((item) => item.id === change.newVenueId);
  const venueName = venue?.name ?? "the new venue";
  const followUps: ProposedFollowUp[] = [];

  const add = (followUp: ProposedFollowUp) => {
    if (!followUps.some((existing) => existing.id === followUp.id)) {
      followUps.push(followUp);
    }
  };

  for (const conflict of conflicts) {
    const related = conflict.recordIds;
    switch (conflict.kind) {
      case "capacity_exceeded":
        add({
          id: `fu-capacity-${session.id}`,
          title: `Resolve capacity for "${session.title}"`,
          ownerRole: "organizer",
          dueAt: hoursBefore(session.startTime, 6),
          reason: conflict.message,
          relatedRecordIds: related,
        });
        break;
      case "equipment_missing":
        add({
          id: `fu-equipment-${session.id}`,
          title: `Move required equipment into ${venueName}`,
          ownerRole: "logistics",
          dueAt: hoursBefore(session.startTime, 12),
          reason: conflict.message,
          relatedRecordIds: related,
        });
        break;
      case "equipment_unavailable":
        add({
          id: `fu-equipment-status-${session.id}`,
          title: `Resolve unavailable equipment before setup`,
          ownerRole: "logistics",
          dueAt: hoursBefore(session.startTime, 12),
          reason: conflict.message,
          relatedRecordIds: related,
        });
        break;
      case "schedule_overlap":
        add({
          id: `fu-overlap-${session.id}`,
          title: `Clear the ${venueName} double booking`,
          ownerRole: "organizer",
          dueAt: hoursBefore(session.startTime, 8),
          reason: conflict.message,
          relatedRecordIds: related,
        });
        break;
      case "communication_gap":
        add({
          id: `fu-comms-${session.id}`,
          title: `Notify attendees that "${session.title}" moved`,
          ownerRole: "communications",
          dueAt: hoursBefore(session.startTime, 8),
          reason: conflict.message,
          relatedRecordIds: related,
        });
        break;
      case "coverage_gap":
        add({
          id: `fu-coverage-${session.id}`,
          title: `Assign a logistics owner for "${session.title}"`,
          ownerRole: "volunteer_coordinator",
          dueAt: hoursBefore(session.startTime, 16),
          reason: conflict.message,
          relatedRecordIds: related,
        });
        break;
      default:
        break;
    }
  }

  add({
    id: `fu-volunteers-${session.id}`,
    title: `Re-brief volunteers on the ${venueName} layout`,
    ownerRole: "volunteer_coordinator",
    dueAt: hoursBefore(session.startTime, 4),
    reason: "Assigned volunteers operated against the previous venue.",
    relatedRecordIds: [session.id, ...session.assignedPersonIds],
  });

  add({
    id: `fu-runbook-${session.id}`,
    title: `Update run of show and signage for ${venueName}`,
    ownerRole: "organizer",
    dueAt: hoursBefore(session.startTime, 3),
    reason: "Operational documents still reference the previous venue.",
    relatedRecordIds: [session.id, change.eventId],
  });

  add({
    id: `fu-leadership-${session.id}`,
    title: `Add the venue change to the leadership briefing`,
    ownerRole: "leadership",
    dueAt: hoursBefore(session.startTime, 1),
    reason: "Leadership tracks escalation risk for the event.",
    relatedRecordIds: [session.id, change.eventId],
  });

  return followUps;
}
