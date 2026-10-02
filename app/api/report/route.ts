import { NextResponse } from "next/server";
import { getSource } from "@/lib/data/source";
import { buildReport } from "@/lib/engine/report";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const source = await getSource();
  const graph = await source.readGraph();

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId") ?? graph.events[0]?.id ?? "";
  if (!eventId) {
    return NextResponse.json({ error: "No event loaded in the graph." }, { status: 422 });
  }

  return NextResponse.json({
    source: source.kind,
    report: buildReport(graph, eventId),
  });
}
