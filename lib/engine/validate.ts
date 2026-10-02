import type { ChangeRequest } from "@/lib/domain/types";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasBase(value: Record<string, unknown>): boolean {
  return (
    typeof value.eventId === "string" &&
    typeof value.sessionId === "string" &&
    (value.reason === undefined || typeof value.reason === "string")
  );
}

/** Narrow an unknown payload to one of the supported change requests. */
export function isChangeRequest(value: unknown): value is ChangeRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!hasBase(candidate)) return false;

  switch (candidate.changeType) {
    case "venue_change":
      return typeof candidate.newVenueId === "string";
    case "time_change":
      return (
        typeof candidate.newStart === "string" && typeof candidate.newEnd === "string"
      );
    case "resource_change":
      return (
        isStringArray(candidate.addEquipmentIds) &&
        isStringArray(candidate.removeEquipmentIds)
      );
    case "person_change":
      return (
        isStringArray(candidate.addPersonIds) &&
        isStringArray(candidate.removePersonIds)
      );
    default:
      return false;
  }
}
