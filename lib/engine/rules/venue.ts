import type { Conflict } from "@/lib/domain/types";
import { byId } from "../graph";
import type { Rule, RuleContext } from "./types";

/** Everyone invited must physically fit. */
export const capacityRule: Rule = {
  id: "capacity",
  appliesTo: ["venue_change"],
  evaluate({ graph, proposed }: RuleContext): Conflict[] {
    const venue = byId(graph.venues).get(proposed.venueId);
    if (!venue) return [];
    const groups = byId(graph.participantGroups);
    const invited = proposed.participantGroupIds
      .map((id) => groups.get(id))
      .filter((group): group is NonNullable<typeof group> => Boolean(group));
    const crowd = invited.reduce((total, group) => total + group.size, 0);
    if (crowd <= venue.capacity) return [];
    return [
      {
        id: `conf-capacity-${proposed.id}`,
        severity: "blocking",
        kind: "capacity_exceeded",
        ownerRole: "organizer",
        message: `${venue.name} seats ${venue.capacity}, but ${crowd} attendees are invited to "${proposed.title}".`,
        recordIds: [proposed.id, venue.id, ...invited.map((g) => g.id)],
      },
    ];
  },
};

/** The target venue must already host every required item. */
export const equipmentPresenceRule: Rule = {
  id: "equipment-presence",
  appliesTo: ["venue_change"],
  evaluate({ graph, proposed }: RuleContext): Conflict[] {
    const venue = byId(graph.venues).get(proposed.venueId);
    if (!venue) return [];
    const equipment = byId(graph.equipment);
    const hosted = new Set(venue.equipmentIds);
    const missing = proposed.requiredEquipmentIds
      .filter((id) => !hosted.has(id))
      .map((id) => equipment.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (missing.length === 0) return [];
    return [
      {
        id: `conf-equipment-missing-${proposed.id}`,
        severity: "blocking",
        kind: "equipment_missing",
        ownerRole: "logistics",
        message: `${venue.name} is missing required equipment: ${missing
          .map((item) => item.name)
          .join(", ")}.`,
        recordIds: [proposed.id, venue.id, ...missing.map((item) => item.id)],
      },
    ];
  },
};

/** Anything required but not currently serviceable. */
export const equipmentStatusRule: Rule = {
  id: "equipment-status",
  appliesTo: ["venue_change", "resource_change"],
  evaluate({ graph, proposed }: RuleContext): Conflict[] {
    const equipment = byId(graph.equipment);
    const unavailable = proposed.requiredEquipmentIds
      .map((id) => equipment.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => item.status !== "available");
    if (unavailable.length === 0) return [];
    return [
      {
        id: `conf-equipment-status-${proposed.id}`,
        severity: "warning",
        kind: "equipment_unavailable",
        ownerRole: "logistics",
        message: `Required equipment not currently available: ${unavailable
          .map((item) => `${item.name} (${item.status})`)
          .join(", ")}.`,
        recordIds: unavailable.map((item) => item.id),
      },
    ];
  },
};
