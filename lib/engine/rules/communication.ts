import type { Conflict } from "@/lib/domain/types";
import type { Rule, RuleContext } from "./types";

/** A change nobody told attendees about is not a change, it is a surprise. */
export const communicationGapRule: Rule = {
  id: "communication-gap",
  appliesTo: ["venue_change", "time_change", "resource_change", "person_change"],
  evaluate({ graph, proposed }: RuleContext): Conflict[] {
    const hasOpenCommsTask = graph.tasks.some(
      (task) =>
        task.sessionId === proposed.id &&
        task.ownerRole === "communications" &&
        task.status !== "done",
    );
    if (hasOpenCommsTask) return [];
    return [
      {
        id: `conf-comms-gap-${proposed.id}`,
        severity: "warning",
        kind: "communication_gap",
        ownerRole: "communications",
        message: `No open communications task references "${proposed.title}", so attendees may miss this change.`,
        recordIds: [proposed.id, ...proposed.participantGroupIds],
      },
    ];
  },
};
