import type { Conflict } from "@/lib/domain/types";
import { byId, overlaps } from "../graph";
import type { Rule, RuleContext } from "./types";

/** Something already promised to another session in the same slot. */
export const equipmentElsewhereRule: Rule = {
  id: "equipment-elsewhere",
  appliesTo: ["resource_change"],
  evaluate({ graph, change, proposed }: RuleContext): Conflict[] {
    if (change.changeType !== "resource_change") return [];
    if (change.addEquipmentIds.length === 0) return [];
    const equipment = byId(graph.equipment);
    const others = graph.sessions.filter(
      (other) => other.id !== proposed.id && overlaps(other, proposed),
    );
    const conflicts: Conflict[] = [];

    for (const equipmentId of change.addEquipmentIds) {
      const clashing = others.filter((other) =>
        other.requiredEquipmentIds.includes(equipmentId),
      );
      if (clashing.length === 0) continue;
      conflicts.push({
        id: `conf-elsewhere-${equipmentId}-${proposed.id}`,
        severity: "blocking",
        kind: "equipment_elsewhere",
        ownerRole: "logistics",
        message: `${equipment.get(equipmentId)?.name ?? equipmentId} is already required by ${clashing
          .map((other) => `"${other.title}"`)
          .join(", ")} in this slot.`,
        recordIds: [equipmentId, proposed.id, ...clashing.map((other) => other.id)],
      });
    }
    return conflicts;
  },
};

/** Equipment in maintenance cannot be committed. */
export const maintenanceWindowRule: Rule = {
  id: "maintenance-window",
  appliesTo: ["resource_change"],
  evaluate({ graph, change }: RuleContext): Conflict[] {
    if (change.changeType !== "resource_change") return [];
    const equipment = byId(graph.equipment);
    const blocked = change.addEquipmentIds
      .map((id) => equipment.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => item.status === "maintenance");
    if (blocked.length === 0) return [];
    return [
      {
        id: `conf-maintenance-${blocked.map((item) => item.id).join("-")}`,
        severity: "blocking",
        kind: "maintenance_window",
        ownerRole: "logistics",
        message: `In maintenance, cannot be committed: ${blocked
          .map((item) => item.name)
          .join(", ")}.`,
        recordIds: blocked.map((item) => item.id),
      },
    ];
  },
};

/** Equipment that lives in another room has to be moved first. */
export const transportLeadTimeRule: Rule = {
  id: "transport-lead-time",
  appliesTo: ["resource_change"],
  evaluate({ graph, change, proposed }: RuleContext): Conflict[] {
    if (change.changeType !== "resource_change") return [];
    if (change.addEquipmentIds.length === 0) return [];
    const venues = graph.venues;
    const hostedElsewhere = change.addEquipmentIds.filter((equipmentId) => {
      const homeVenue = venues.find((venue) => venue.equipmentIds.includes(equipmentId));
      return !homeVenue || homeVenue.id !== proposed.venueId;
    });
    if (hostedElsewhere.length === 0) return [];
    const equipment = byId(graph.equipment);
    return [
      {
        id: `conf-transport-${proposed.id}`,
        severity: "warning",
        kind: "transport_lead_time",
        ownerRole: "logistics",
        message: `${hostedElsewhere
          .map((id) => equipment.get(id)?.name ?? id)
          .join(", ")} must be transported into the room before setup.`,
        recordIds: [proposed.id, ...hostedElsewhere],
      },
    ];
  },
};
