import type { ChangeRequest } from "@/lib/domain/types";

/** Narrow an unknown payload to a supported venue_change request. */
export function isChangeRequest(value: unknown): value is ChangeRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.changeType === "venue_change" &&
    typeof candidate.eventId === "string" &&
    typeof candidate.sessionId === "string" &&
    typeof candidate.newVenueId === "string" &&
    (candidate.reason === undefined || typeof candidate.reason === "string")
  );
}
