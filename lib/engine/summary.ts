import type {
  AffectedRecord,
  Conflict,
  GeneratedSummary,
  ProposedFollowUp,
  Session,
} from "@/lib/domain/types";

export const GENERATOR_LABEL = "rules-based explanation v0 (not an LLM call)";

/**
 * The summary explains the impact; it never decides it. It is labeled as
 * generated and links every source record it read, so generated text stays
 * distinguishable from verified source facts.
 */
export function buildSummary(
  session: Session,
  changeLabel: string,
  affected: AffectedRecord[],
  conflicts: Conflict[],
  followUps: ProposedFollowUp[],
): GeneratedSummary {
  const blocking = conflicts.filter((c) => c.severity === "blocking");
  const warnings = conflicts.filter((c) => c.severity === "warning");
  const owners = Array.from(new Set(followUps.map((f) => f.ownerRole)));

  const parts: string[] = [];
  parts.push(
    `Changing "${session.title}" (${changeLabel}) touches ${affected.length} connected records.`,
  );

  if (conflicts.length === 0) {
    parts.push("No conflicts were detected by the current rules.");
  } else {
    parts.push(
      `${conflicts.length} conflict(s) detected: ${blocking.length} blocking, ${warnings.length} warning.`,
    );
    parts.push(conflicts.map((c) => c.message).join(" "));
  }

  parts.push(
    `Proposed ${followUps.length} follow-up(s) owned by: ${owners.join(", ") || "none"}.`,
  );

  const sourceRecordIds = Array.from(
    new Set([
      session.id,
      ...affected.map((record) => record.id),
      ...conflicts.flatMap((conflict) => conflict.recordIds),
    ]),
  );

  return {
    text: parts.join(" "),
    generated: true,
    generator: GENERATOR_LABEL,
    sourceRecordIds,
  };
}
