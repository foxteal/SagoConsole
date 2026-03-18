import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../api/client";

interface ContainerInfo {
  name: string;
  state: string;
}

interface ServerContainers {
  server: string;
  containers: ContainerInfo[];
}

interface ServiceGroup {
  id: number;
  name: string;
  sort_order: number;
  containers: string[];
}

const inputClass = "w-full bg-bg-surface border border-transparent rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors";

export default function ServiceGroupsSettings() {
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [allContainers, setAllContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, containersRes] = await Promise.all([
        apiClient("/api/service-groups"),
        apiClient("/api/containers?raw=true"),
      ]);
      const groupsData = await groupsRes.json();
      const containersData = await containersRes.json();

      setGroups(groupsData.groups);

      // Flatten all containers from all servers
      const flat: ContainerInfo[] = [];
      const seen = new Set<string>();
      for (const server of containersData.servers as ServerContainers[]) {
        for (const c of server.containers) {
          if (!seen.has(c.name)) {
            seen.add(c.name);
            flat.push(c);
          }
        }
      }
      flat.sort((a, b) => a.name.localeCompare(b.name));
      setAllContainers(flat);
    } catch (err) {
      console.error("Failed to fetch service groups:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addGroup = async () => {
    if (!newName.trim()) return;
    await apiClient("/api/service-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setShowAddForm(false);
    fetchData();
  };

  const renameGroup = async (id: number) => {
    if (!editName.trim()) return;
    await apiClient(`/api/service-groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchData();
  };

  const deleteGroup = async (id: number) => {
    await apiClient(`/api/service-groups/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  };

  const moveGroup = async (group: ServiceGroup, direction: "up" | "down") => {
    const idx = groups.findIndex((g) => g.id === group.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= groups.length) return;

    const items = [
      { id: group.id, sort_order: groups[swapIdx].sort_order },
      { id: groups[swapIdx].id, sort_order: group.sort_order },
    ];
    await apiClient("/api/service-groups/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    fetchData();
  };

  const toggleContainer = async (groupId: number, containerName: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const newContainers = group.containers.includes(containerName)
      ? group.containers.filter((n) => n !== containerName)
      : [...group.containers, containerName];

    await apiClient(`/api/service-groups/${groupId}/containers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ containers: newContainers }),
    });
    fetchData();
  };

  if (loading) return (
    <div>
      <div className="h-7 w-40 bg-bg-card rounded animate-pulse mb-2" />
      <div className="h-4 w-56 bg-bg-card rounded animate-pulse mb-6" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-14 bg-bg-surface border border-border-subtle rounded-lg animate-pulse mb-2" />
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Service Groups</h2>
          <p className="text-[13px] text-text-secondary font-mono font-light mt-0.5">
            {groups.length} groups, {allContainers.length} containers total
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 transition-colors active:scale-[0.97]"
        >
          + Add Group
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Group Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGroup()}
                className={inputClass}
                autoFocus
              />
            </div>
            <button onClick={addGroup} disabled={!newName.trim()} className="px-3 py-2 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors active:scale-[0.97]">
              Add
            </button>
            <button onClick={() => { setShowAddForm(false); setNewName(""); }} className="px-3 py-2 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-card transition-colors active:scale-[0.97]">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="border border-border-subtle rounded-lg overflow-hidden">
        {groups.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            No service groups yet. Create one to start organizing containers.
          </div>
        )}
        {groups.map((group, idx) => (
          <div key={group.id} className="border-b border-border-subtle last:border-b-0">
            <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-bg-surface/50 transition-colors">
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveGroup(group, "up")} disabled={idx === 0} className="text-text-tertiary hover:text-text-primary disabled:opacity-20 transition-colors active:scale-[0.97]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                </button>
                <button onClick={() => moveGroup(group, "down")} disabled={idx === groups.length - 1} className="text-text-tertiary hover:text-text-primary disabled:opacity-20 transition-colors active:scale-[0.97]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>

              {/* Expand/collapse toggle */}
              <button
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                className="text-text-tertiary hover:text-text-primary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${expandedGroup === group.id ? "rotate-90" : ""}`}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>

              {/* Name */}
              <div className="flex-1 min-w-0">
                {editingId === group.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") renameGroup(group.id); if (e.key === "Escape") setEditingId(null); }}
                      className="bg-bg-surface border border-accent rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none"
                      autoFocus
                    />
                    <button onClick={() => renameGroup(group.id)} className="px-2 py-1 text-xs rounded-lg bg-accent text-bg-deep active:scale-[0.97]">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary active:scale-[0.97]">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-primary font-medium">{group.name}</span>
                    <span className="text-xs text-text-tertiary font-mono">{group.containers.length} containers</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {editingId !== group.id && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setEditingId(group.id); setEditName(group.name); }} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:bg-bg-surface transition-colors active:scale-[0.97]">
                    Rename
                  </button>
                  {deleteConfirm === group.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => deleteGroup(group.id)} className="px-2 py-1 text-xs rounded-lg bg-red/20 text-red hover:bg-red/30 transition-colors active:scale-[0.97]">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:bg-bg-surface transition-colors active:scale-[0.97]">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(group.id)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:text-red hover:border-red/30 transition-colors active:scale-[0.97]">
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Expanded container picker */}
            {expandedGroup === group.id && (
              <div className="px-4 py-3 bg-bg-surface/30 border-t border-border-subtle">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Assign Containers</div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-1">
                  {allContainers.map((c) => {
                    const isAssigned = group.containers.includes(c.name);
                    const isUp = c.state === "running";
                    return (
                      <label key={c.name} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-bg-surface transition-colors ${isAssigned ? "bg-bg-surface" : ""}`}>
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => toggleContainer(group.id, c.name)}
                          className="rounded border-border accent-accent"
                        />
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isUp ? "bg-green" : "bg-red"}`} />
                        <span className="text-xs text-text-primary font-mono truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
