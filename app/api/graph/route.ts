import { NextResponse } from "next/server";
import { getSource } from "@/lib/data/source";

export const dynamic = "force-dynamic";

export async function GET() {
  const source = await getSource();
  const graph = await source.readGraph();
  return NextResponse.json({ source: source.kind, graph });
}
