import { NextResponse } from "next/server";
import { getSource } from "@/lib/data/source";
import { applyChange } from "@/lib/engine/apply";
import { ROLES, type Role } from "@/lib/domain/types";
import { isChangeRequest } from "@/lib/engine/validate";

export const dynamic = "force-dynamic";

interface ApplyBody {
  change?: unknown;
  approvedByRole?: unknown;
  selectedFollowUpIds?: unknown;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ApplyBody | null;

  if (!body || !isChangeRequest(body.change)) {
    return NextResponse.json(
      { error: "Expected an approved change request in the `change` field." },
      { status: 400 },
    );
  }

  const approvedByRole = body.approvedByRole;
  if (typeof approvedByRole !== "string" || !ROLES.includes(approvedByRole as Role)) {
    return NextResponse.json(
      { error: `approvedByRole must be one of: ${ROLES.join(", ")}.` },
      { status: 400 },
    );
  }

  const selectedFollowUpIds = Array.isArray(body.selectedFollowUpIds)
    ? body.selectedFollowUpIds.filter((id): id is string => typeof id === "string")
    : undefined;

  const source = await getSource();
  const graph = await source.readGraph();

  try {
    const result = applyChange(graph, body.change, approvedByRole as Role, {
      selectedFollowUpIds,
    });
    await source.applyApprovedChange(result);
    return NextResponse.json({ source: source.kind, entry: result.entry, report: result.report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Apply failed." },
      { status: 422 },
    );
  }
}
