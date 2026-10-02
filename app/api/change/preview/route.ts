import { NextResponse } from "next/server";
import { getSource } from "@/lib/data/source";
import { computeImpact } from "@/lib/engine/impact";
import { isChangeRequest } from "@/lib/engine/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isChangeRequest(body)) {
    return NextResponse.json(
      { error: "Expected a venue_change request with eventId, sessionId, newVenueId." },
      { status: 400 },
    );
  }

  const source = await getSource();
  const graph = await source.readGraph();

  try {
    const report = computeImpact(graph, body);
    return NextResponse.json({ source: source.kind, report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impact computation failed." },
      { status: 422 },
    );
  }
}
