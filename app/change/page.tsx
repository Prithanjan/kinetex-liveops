import { getSource } from "@/lib/data/source";
import ChangeConsole from "@/components/ChangeConsole";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ChangePage() {
  const source = await getSource();
  const graph = await source.readGraph();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Preview before anything is written"
        title="Change console"
      >
        Pick a change type and a session. LiveOps traverses the dependency graph,
        lists conflicts, and proposes role-owned follow-ups. Nothing is applied
        until a person approves it.
      </PageHeader>
      <ChangeConsole graph={graph} sourceKind={source.kind} />
    </div>
  );
}
