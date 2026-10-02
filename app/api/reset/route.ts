import { NextResponse } from "next/server";
import { resolveSourceKind } from "@/lib/data/source";
import { resetLocalGraph } from "@/lib/data/local-source";

export const dynamic = "force-dynamic";

export async function POST() {
  if (resolveSourceKind() === "local") {
    await resetLocalGraph();
  }
  return NextResponse.json({ ok: true });
}
