import type { Conflict, Session } from "@/lib/domain/types";
import { byId, overlaps } from "../graph";
import type { Rule, RuleContext } from "./types";

function hourInIst(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return Number.parseInt(parts, 10);
}

function clashing(graph: RuleContext["graph"], proposed: Session): Session[] {
  return graph.sessions.filter(
    (other) => other.id !== proposed.id && overlaps(other, proposed),
  );
}

/** Nobody else can already own that room and time slot. */
export const scheduleOverlapRule: Rule = {
  id: "schedule-overlap",
  appliesTo: ["venue_change", "time_change"],
  evaluate({ graph, proposed }: RuleContext): Conflict[] {
    const clashes = clashing(graph, proposed).filter(
      (other) => other.venueId === proposed.venueId,
    );
    if (clashes.length === 0) return [];
    const venue = byId(graph.venues).get(proposed.venueId);
    return [
      {
        id: `conf-overlap-${proposed.id}`,
        severity: "blocking",
        kind: "schedule_overlap",
        ownerRole: "organizer",
        message: `${venue?.name ?? "The venue"} is already booked during this slot: ${clashes
          .map((other) => other.title)
          .join(", ")}.`,
        recordIds: [proposed.id, ...clashes.map((other) => other.id)],
      },
    ];
  },
};

/** Sessions should stay inside a sane operating window. */
export const eventHoursRule: Rule = {
  id: "event-hours",
  appliesTo: ["time_change"],
  evaluate({ proposed }: RuleContext): Conflict[] {
    const start = hourInIst(proposed.startTime);
    const end = hourInIst(proposed.endTime);
    if (start >= 7 && end <= 23) return [];
    return [
      {
        id: `conf-hours-${proposed.id}`,
        severity: "info",
        kind: "event_hours_violation",
        ownerRole: "organizer",
        message: `The new slot runs ${String(start).padStart(2, "0")}:00–${String(
          end,
        ).padStart(2, "0")}:00 IST, outside the 07:00–23:00 operating window.`,
        recordIds: [proposed.id],
      },
    ];
  },
};

/** A person cannot be in two rooms at once. */
export const personDoubleBookingRule: Rule = {
  id: "person-double-booking",
  appliesTo: ["time_change", "person_change"],
  evaluate({ graph, proposed }: RuleContext): Conflict[] {
    const clashes = clashing(graph, proposed);
    const people = byId(graph.people);
    const conflicts: Conflict[] = [];

    for (const personId of proposed.assignedPersonIds) {
      const hit = clashes.filter((other) =>
        other.assignedPersonIds.includes(personId),
      );
      if (hit.length === 0) continue;
      conflicts.push({
        id: `conf-double-booked-${personId}-${proposed.id}`,
        severity: "blocking",
        kind: "person_double_booked",
        ownerRole: "volunteer_coordinator",
        message: `${people.get(personId)?.name ?? personId} is already assigned to ${hit
          .map((other) => `"${other.title}"`)
          .join(", ")} in this slot.`,
        recordIds: [personId, proposed.id, ...hit.map((other) => other.id)],
      });
    }
    return conflicts;
  },
};

/** The same audience cannot be in two places either. */
export const attendeeOverlapRule: Rule = {
  id: "attendee-overlap",
  appliesTo: ["time_change"],
  evaluate({ graph, proposed }: RuleContext): Conflict[] {
    const groups = byId(graph.participantGroups);
    const clashes = clashing(graph, proposed);
    const conflicts: Conflict[] = [];

    for (const groupId of proposed.participantGroupIds) {
      const hit = clashes.filter((other) =>
        other.participantGroupIds.includes(groupId),
      );
      if (hit.length === 0) continue;
      conflicts.push({
        id: `conf-attendee-overlap-${groupId}-${proposed.id}`,
        severity: "warning",
        kind: "attendee_overlap",
        ownerRole: "organizer",
        message: `${groups.get(groupId)?.name ?? groupId} is invited to overlapping sessions: ${hit
          .map((other) => `"${other.title}"`)
          .join(", ")}.`,
        recordIds: [groupId, proposed.id, ...hit.map((other) => other.id)],
      });
    }
    return conflicts;
  },
};
