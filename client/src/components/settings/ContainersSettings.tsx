import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../api/client";

interface ContainerInfo {
  name: string;
  state: string;
  project: string;
}

interface ProjectGroup {
  name: string;
  displayName?: string;
  containers: ContainerInfo[];
}

interface ServerContainers {
  server: string;
  total: number;
  running: number;
  projects: ProjectGroup[];
}

interface ContainerPref {
  server: string;
  project_name: string;
  display_name: string | null;
  hidden: boolean;
  sort_order: number;
}

export default function ContainersSettings() {
  const [servers, setServers] = useState<ServerContainers[]>([]);
  const [prefs, setPrefs] = useState<ContainerPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Local edits keyed by "server::project_name"
  const [edits, setEdits] = useState<Map<string, { display_name: string; hidden: boolean }>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      // Fetch raw containers (without prefs applied) and prefs separately
      const [containersRes, prefsRes] = await Promise.all([
        apiClient("/api/containers?raw=true"),
        apiClient("/api/container-prefs"),
      ]);
      const containersData = await containersRes.json();
      const prefsData = await prefsRes.json();
      setServers(containersData.servers);
      setPrefs(prefsData.prefs);

      // Initialize edits from existing prefs
      const editMap = new Map<string, { display_name: string; hidden: boolean }>();
      for (const p of prefsData.prefs as ContainerPref[]) {
        editMap.set(`${p.server}::${p.project_name}`, { display_name: p.display_name || "", hidden: p.hidden });
      }
      setEdits(editMap);
    } catch (err) {
      console.error("Failed to fetch containers:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getEdit = (server: string, project: string) => {
    return edits.get(`${server}::${project}`) || { display_name: "", hidden: false };
  };

  const updateEdit = (server: string, project: string, field: "display_name" | "hidden", value: string | boolean) => {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(`${server}::${project}`) || { display_name: "", hidden: false };
      next.set(`${server}::${project}`, { ...current, [field]: value });
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const items: { server: string; project_name: string; display_name: string | null; hidden: boolean; sort_order: number }[] = [];

    for (const [key, edit] of edits) {
      const [server, project_name] = key.split("::");
      if (edit.display_name || edit.hidden) {
        items.push({
          server,
          project_name,
          display_name: edit.display_name || null,
          hidden: edit.hidden,
          sort_order: 0,
        });
      }
    }

    await apiClient("/api/container-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSaving(false);
    setDirty(false);
    fetchData();
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  // Build a full project list from raw container data (ignoring prefs filtering)
  // We need all projects including hidden ones for the settings UI
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Containers</h2>
          <p className="text-xs text-text-tertiary font-mono font-light mt-0.5">
            Hide containers, rename project groups
          </p>
        </div>
        {dirty && (
          <button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs rounded-md bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      {servers.map((server) => (
        <div key={server.server} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-text-primary">{server.server}</h3>
            <span className="text-[10px] text-text-tertiary font-mono">{server.projects.length} projects</span>
          </div>
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            {server.projects.map((project) => {
              const edit = getEdit(server.server, project.name);
              return (
                <div key={project.name} className={`flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle last:border-b-0 transition-colors ${edit.hidden ? "opacity-40" : ""}`}>
                  {/* Visibility toggle */}
                  <button
                    onClick={() => updateEdit(server.server, project.name, "hidden", !edit.hidden)}
                    className="text-text-tertiary hover:text-text-primary transition-colors"
                    title={edit.hidden ? "Show" : "Hide"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      {edit.hidden ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                          <path d="M1 1l22 22" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                  {/* Project name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text-primary font-mono">{project.name}</div>
                    <div className="text-[11px] text-text-tertiary">
                      {project.containers.length} container{project.containers.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {/* Display name override */}
                  <input
                    value={edit.display_name}
                    onChange={(e) => updateEdit(server.server, project.name, "display_name", e.target.value)}
                    placeholder="Display name"
                    className="w-40 bg-bg-deep border border-border rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
