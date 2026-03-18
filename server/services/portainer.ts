import { config } from "../config";
import { getDb } from "../db";

interface PortainerContainer {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
  Image: string;
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
  id: string;
  name: string;
  state: string;
  image: string;
  status: string;
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
    id: c.Id,
    name: c.Names[0]?.replace(/^\//, "") || "unknown",
    state: c.State,
    image: c.Image,
    status: c.Status || "",
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

interface ContainerPrefRow {
  server: string;
  project_name: string;
  display_name: string | null;
  hidden: number;
  sort_order: number;
}

export async function getAllContainers(raw = false): Promise<ServerContainers[]> {
  const results = await Promise.all(ENDPOINTS.map(fetchContainers));

  if (raw) return results;

  // Apply container prefs
  const db = getDb();
  const prefs = db.prepare("SELECT * FROM container_prefs").all() as ContainerPrefRow[];
  const prefMap = new Map<string, ContainerPrefRow>();
  for (const p of prefs) {
    prefMap.set(`${p.server}::${p.project_name}`, p);
  }

  return results.map((server) => {
    // Filter hidden projects and apply display names
    const filteredProjects = server.projects
      .filter((proj) => {
        const pref = prefMap.get(`${server.server}::${proj.name}`);
        return !pref || pref.hidden !== 1;
      })
      .map((proj) => {
        const pref = prefMap.get(`${server.server}::${proj.name}`);
        return {
          ...proj,
          displayName: pref?.display_name || proj.name,
          sortOrder: pref?.sort_order ?? 0,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));

    // Recount after filtering
    const visibleContainers = filteredProjects.flatMap((p) => p.containers);
    return {
      ...server,
      total: visibleContainers.length,
      running: visibleContainers.filter((c) => c.state === "running").length,
      containers: visibleContainers,
      projects: filteredProjects,
    };
  });
}

// Container actions via Portainer API

async function portainerPost(path: string, body?: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${config.portainer.url}${path}`, {
      method: "POST",
      headers: {
        "X-API-Key": config.portainer.apiKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Portainer POST ${path} failed: ${res.status} ${text}`);
      return { ok: false, error: `Portainer returned ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error(`Portainer POST ${path} error:`, err);
    return { ok: false, error: String(err) };
  }
}

export async function startContainer(endpointId: number, containerId: string) {
  return portainerPost(`/api/endpoints/${endpointId}/docker/containers/${containerId}/start`);
}

export async function stopContainer(endpointId: number, containerId: string) {
  return portainerPost(`/api/endpoints/${endpointId}/docker/containers/${containerId}/stop`);
}

export async function restartContainer(endpointId: number, containerId: string) {
  return portainerPost(`/api/endpoints/${endpointId}/docker/containers/${containerId}/restart`);
}

export async function recreateContainer(endpointId: number, containerId: string) {
  return portainerPost(`/api/docker/${endpointId}/containers/${containerId}/recreate`, { PullImage: true });
}
