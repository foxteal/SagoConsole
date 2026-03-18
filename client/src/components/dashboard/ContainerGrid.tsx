interface ContainerInfo {
  name: string;
  state: string;
}

interface ServiceGroup {
  id: number;
  name: string;
  containers: ContainerInfo[];
}

interface ContainerGridProps {
  serviceGroups: ServiceGroup[];
  ungrouped: ContainerInfo[];
}

function ContainerDot({ container }: { container: ContainerInfo }) {
  const isUp = container.state === "running";
  return (
    <div
      className={`w-2 h-2 rounded-full relative cursor-default group ${
        isUp
          ? "bg-green shadow-[0_0_4px_rgba(52,211,153,0.3)]"
          : "bg-red shadow-[0_0_4px_rgba(248,113,113,0.3)]"
      }`}
    >
      <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-bg-card border border-border rounded px-2 py-1 text-[13px] font-mono text-text-primary whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        {container.name}
      </div>
    </div>
  );
}

function GroupCluster({ group }: { group: ServiceGroup }) {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-md px-2.5 py-2 flex items-center gap-1.5 transition-all hover:border-border hover:bg-bg-card-hover">
      <span className="text-sm text-text-secondary font-medium mr-1">{group.name}</span>
      <div className="flex items-center gap-[3px]">
        {group.containers.map((c) => (
          <ContainerDot key={c.name} container={c} />
        ))}
      </div>
    </div>
  );
}

export default function ContainerGrid({ serviceGroups, ungrouped }: ContainerGridProps) {
  const allContainers = [
    ...serviceGroups.flatMap((g) => g.containers),
    ...ungrouped,
  ];
  const totalRunning = allContainers.filter((c) => c.state === "running").length;
  const total = allContainers.length;

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
      <div className="flex items-center justify-between mb-3.5">
        <div className="text-[13px] font-medium uppercase tracking-[1px] text-text-secondary">
          Container Status
        </div>
        <span className="font-mono text-sm text-text-tertiary font-light">
          {totalRunning}/{total} running
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {serviceGroups.map((group) => (
          <GroupCluster key={group.id} group={group} />
        ))}
        {ungrouped.length > 0 && (
          <div className="bg-bg-card border border-border-subtle rounded-md px-2.5 py-2 flex items-center gap-1.5 transition-all hover:border-border hover:bg-bg-card-hover opacity-60">
            <span className="text-sm text-text-tertiary font-medium mr-1">Ungrouped</span>
            <div className="flex items-center gap-[3px]">
              {ungrouped.map((c) => (
                <ContainerDot key={c.name} container={c} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
