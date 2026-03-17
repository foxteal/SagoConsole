import { config } from "../config";

interface PortainerContainer {
  Names: string[];
  State: string;
  Labels: Record<string, string>;
}

interface EndpointDef {
  id: number;
  name: string;
}

const ENDPOINTS: EndpointDef[] = [
  { id: 3, name: "Fideo" },
  { id: 5, name: "Ava" },
  { id: 4, name: "Kai" },
  { id: 8, name: "VPS" },
];

export interface ContainerInfo {
  name: string;
  state: string;
  project: string;
}

export interface ServerContainers {
  server: string;
  endpointId: number;
  total: number;
  running: number;
  containers: ContainerInfo[];
  projects: ProjectGroup[];
}

export interface ProjectGroup {
  name: string;
  containers: ContainerInfo[];
}

async function fetchContainers(endpoint: EndpointDef): Promise<ServerContainers> {
  const url = `${config.portainer.url}/api/endpoints/${endpoint.id}/docker/containers/json?all=true`;
  const res = await fetch(url, {
    headers: { "X-API-Key": config.portainer.apiKey },
  });

  if (!res.ok) {
    console.error(`Portainer endpoint ${endpoint.name} failed: ${res.status}`);
    return {
      server: endpoint.name,
      endpointId: endpoint.id,
      total: 0,
      running: 0,
      containers: [],
      projects: [],
    };
  }

  const data = (await res.json()) as PortainerContainer[];

  const containers: ContainerInfo[] = data.map((c) => ({
    name: c.Names[0]?.replace(/^\//, "") || "unknown",
    state: c.State,
    project: c.Labels["com.docker.compose.project"] || "other",
  }));

  // Group by project
  const projectMap = new Map<string, ContainerInfo[]>();
  for (const c of containers) {
    const list = projectMap.get(c.project) || [];
    list.push(c);
    projectMap.set(c.project, list);
  }

  const projects: ProjectGroup[] = Array.from(projectMap.entries())
    .map(([name, conts]) => ({
      name,
      containers: conts.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    server: endpoint.name,
    endpointId: endpoint.id,
    total: containers.length,
    running: containers.filter((c) => c.state === "running").length,
    containers,
    projects,
  };
}

export async function getAllContainers(): Promise<ServerContainers[]> {
  const results = await Promise.all(ENDPOINTS.map(fetchContainers));
  return results;
}
