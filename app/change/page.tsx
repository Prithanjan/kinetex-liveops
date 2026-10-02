import { getSource } from "@/lib/data/source";
import ChangeConsole from "@/components/ChangeConsole";
import { Chip, PageHeader, Steps } from "@/components/ui";
import { IconShield } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ChangePage() {
  const source = await getSource();
  const graph = await source.readGraph();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Something moved"
        title="Work out what it disturbs"
        aside={
          <Chip tone="slate" icon={<IconShield className="h-3.5 w-3.5" />}>
            nothing is saved until you approve
          </Chip>
        }
      >
        Plans change. What takes the time is working out everything that moved with
        them — the room, the kit, the crew, and the guests. Do that here in three
        steps.
      </PageHeader>

      <div className="rounded-card border border-line bg-surface px-5 py-3.5 shadow-[var(--shadow-card)]">
        <Steps
          current={0}
          items={["Describe the change", "See what it touches", "Approve and save"]}
        />
      </div>

      <ChangeConsole graph={graph} sourceKind={source.kind} />
    </div>
  );
}
