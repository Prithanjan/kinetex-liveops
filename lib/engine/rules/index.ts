import type { ChangeType, Conflict } from "@/lib/domain/types";
import { communicationGapRule } from "./communication";
import {
  coverageGapRule,
  skillGapRule,
  unassignedRoleRule,
} from "./coverage";
import {
  equipmentElsewhereRule,
  maintenanceWindowRule,
  transportLeadTimeRule,
} from "./resource";
import {
  attendeeOverlapRule,
  eventHoursRule,
  personDoubleBookingRule,
  scheduleOverlapRule,
} from "./schedule";
import type { Rule, RuleContext } from "./types";
import {
  capacityRule,
  equipmentPresenceRule,
  equipmentStatusRule,
} from "./venue";

/**
 * The registry. Adding a rule is one file plus one line here.
 * Order is stable, so conflict ordering is deterministic.
 */
export const RULES: Rule[] = [
  capacityRule,
  equipmentPresenceRule,
  equipmentStatusRule,
  scheduleOverlapRule,
  eventHoursRule,
  personDoubleBookingRule,
  attendeeOverlapRule,
  equipmentElsewhereRule,
  maintenanceWindowRule,
  transportLeadTimeRule,
  coverageGapRule,
  unassignedRoleRule,
  skillGapRule,
  communicationGapRule,
];

export function rulesFor(changeType: ChangeType): Rule[] {
  return RULES.filter((rule) => rule.appliesTo.includes(changeType));
}

/** Run every rule that applies, in registry order. */
export function evaluateRules(ctx: RuleContext): Conflict[] {
  return rulesFor(ctx.change.changeType).flatMap((rule) => rule.evaluate(ctx));
}

export { candidatesFor, neededRoles } from "./coverage";
export type { Rule, RuleContext } from "./types";
