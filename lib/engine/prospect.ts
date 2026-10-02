import type { ChangeRequest, Session } from "@/lib/domain/types";

/**
 * The session as it would be *after* the change. Every rule evaluates against
 * this view, so rules never branch on change type for the common fields.
 */
export function proposedSession(session: Session, change: ChangeRequest): Session {
  switch (change.changeType) {
    case "venue_change":
      return { ...session, venueId: change.newVenueId };
    case "time_change":
      return { ...session, startTime: change.newStart, endTime: change.newEnd };
    case "resource_change": {
      const removed = new Set(change.removeEquipmentIds);
      const next = session.requiredEquipmentIds.filter((id) => !removed.has(id));
      for (const id of change.addEquipmentIds) {
        if (!next.includes(id)) next.push(id);
      }
      return { ...session, requiredEquipmentIds: next };
    }
    case "person_change": {
      const removed = new Set(change.removePersonIds);
      const next = session.assignedPersonIds.filter((id) => !removed.has(id));
      for (const id of change.addPersonIds) {
        if (!next.includes(id)) next.push(id);
      }
      return { ...session, assignedPersonIds: next };
    }
  }
}

/** A one-line, human readable description of the proposed change. */
export function describeChange(
  change: ChangeRequest,
  session: Session,
  names: {
    venue: (id: string) => string;
    equipment: (id: string) => string;
    person: (id: string) => string;
    time: (iso: string) => string;
  },
): string {
  switch (change.changeType) {
    case "venue_change":
      return `${names.venue(session.venueId)} → ${names.venue(change.newVenueId)}`;
    case "time_change":
      return `${names.time(session.startTime)} → ${names.time(change.newStart)}`;
    case "resource_change": {
      const parts: string[] = [];
      if (change.addEquipmentIds.length > 0) {
        parts.push(`add ${change.addEquipmentIds.map(names.equipment).join(", ")}`);
      }
      if (change.removeEquipmentIds.length > 0) {
        parts.push(
          `remove ${change.removeEquipmentIds.map(names.equipment).join(", ")}`,
        );
      }
      return parts.join("; ") || "no equipment change";
    }
    case "person_change": {
      const parts: string[] = [];
      if (change.addPersonIds.length > 0) {
        parts.push(`add ${change.addPersonIds.map(names.person).join(", ")}`);
      }
      if (change.removePersonIds.length > 0) {
        parts.push(`remove ${change.removePersonIds.map(names.person).join(", ")}`);
      }
      return parts.join("; ") || "no assignment change";
    }
  }
}
