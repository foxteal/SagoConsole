interface ContainerInfo {
  name: string;
  state: string;
  project: string;
}

interface ProjectGroup {
  name: string;
  containers: ContainerInfo[];
}

interface ServerContainers {
  server: string;
  total: number;
  running: number;
  projects: ProjectGroup[];
}

interface ContainerGridProps {
  servers: ServerContainers[];
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
      <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-bg-card border border-border rounded px-2 py-1 text-xs font-mono text-text-primary whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        {container.name}
      </div>
    </div>
  );
}

function ProjectCluster({ project }: { project: ProjectGroup }) {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-md px-2.5 py-2 flex items-center gap-1.5 transition-all hover:border-border hover:bg-bg-card-hover">
      <span className="text-[13px] text-text-secondary font-medium mr-1">{project.name}</span>
      <div className="flex items-center gap-[3px]">
        {project.containers.map((c) => (
          <ContainerDot key={c.name} container={c} />
        ))}
      </div>
    </div>
  );
}

export default function ContainerGrid({ servers }: ContainerGridProps) {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
      <div className="text-xs font-medium uppercase tracking-[1px] text-text-secondary mb-3.5">
        Container Status
      </div>
      {servers.map((server) => (
        <div key={server.server} className="mb-4 last:mb-0">
          <div className="text-sm font-semibold text-text-primary mb-2.5 flex items-center gap-2">
            {server.server}
            <span className="font-mono text-[13px] text-text-tertiary font-light">
              {server.running}/{server.total} running
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {server.projects.map((project) => (
              <ProjectCluster key={project.name} project={project} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
