import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../api/client";

interface AlertMonitor {
  id: number;
  type: string;
  name: string;
  enabled: number;
  config: string;
}

interface ParsedBackrestConfig {
  planId: string;
  interval: string;
  graceHours: number;
}

interface ParsedSyncthingConfig {
  folderId: string;
}

const inputClass =
  "w-full bg-bg-surface border border-transparent rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors";
const selectClass =
  "bg-bg-surface border border-transparent rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors";
const btnPrimary =
  "px-3 py-2 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors active:scale-[0.97]";
const btnSecondary =
  "px-3 py-2 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-card transition-colors active:scale-[0.97]";
const btnDelete =
  "px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:text-red hover:border-red/30 transition-colors active:scale-[0.97]";
const btnDeleteConfirm =
  "px-2 py-1 text-xs rounded-lg bg-red/20 text-red hover:bg-red/30 transition-colors active:scale-[0.97]";

function parseConfig<T>(config: string, fallback: T): T {
  try {
    return JSON.parse(config) as T;
  } catch {
    return fallback;
  }
}

export default function AlertMonitorsSettings() {
  const [monitors, setMonitors] = useState<AlertMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Add form state per type
  const [addingType, setAddingType] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPlanId, setNewPlanId] = useState("");
  const [newInterval, setNewInterval] = useState("daily");
  const [newGraceHours, setNewGraceHours] = useState(2);
  const [newFolderId, setNewFolderId] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPlanId, setEditPlanId] = useState("");
  const [editInterval, setEditInterval] = useState("daily");
  const [editGraceHours, setEditGraceHours] = useState(2);
  const [editFolderId, setEditFolderId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient("/api/alert-monitors");
      const data = await res.json();
      setMonitors(data.monitors);
    } catch (err) {
      console.error("Failed to fetch alert monitors:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleEnabled = async (monitor: AlertMonitor) => {
    await apiClient(`/api/alert-monitors/${monitor.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !monitor.enabled }),
    });
    fetchData();
  };

  const deleteMonitor = async (id: number) => {
    await apiClient(`/api/alert-monitors/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  };

  const resetAddForm = () => {
    setAddingType(null);
    setNewName("");
    setNewPlanId("");
    setNewInterval("daily");
    setNewGraceHours(2);
    setNewFolderId("");
  };

  const addMonitor = async (type: string) => {
    if (!newName.trim()) return;

    let config: Record<string, unknown> = {};
    if (type === "backrest") {
      config = { planId: newPlanId || newName.trim(), interval: newInterval, graceHours: newGraceHours };
    } else if (type === "syncthing") {
      config = { folderId: newFolderId || newName.trim() };
    }

    await apiClient("/api/alert-monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: newName.trim(), config }),
    });
    resetAddForm();
    fetchData();
  };

  const startEdit = (monitor: AlertMonitor) => {
    setEditingId(monitor.id);
    setEditName(monitor.name);
    if (monitor.type === "backrest") {
      const cfg = parseConfig<ParsedBackrestConfig>(monitor.config, { planId: "", interval: "daily", graceHours: 2 });
      setEditPlanId(cfg.planId);
      setEditInterval(cfg.interval);
      setEditGraceHours(cfg.graceHours);
    } else if (monitor.type === "syncthing") {
      const cfg = parseConfig<ParsedSyncthingConfig>(monitor.config, { folderId: "" });
      setEditFolderId(cfg.folderId);
    }
  };

  const saveEdit = async (monitor: AlertMonitor) => {
    if (!editName.trim()) return;

    let config: Record<string, unknown> = {};
    if (monitor.type === "backrest") {
      config = { planId: editPlanId, interval: editInterval, graceHours: editGraceHours };
    } else if (monitor.type === "syncthing") {
      config = { folderId: editFolderId };
    }

    await apiClient(`/api/alert-monitors/${monitor.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), config }),
    });
    setEditingId(null);
    fetchData();
  };

  const byType = (type: string) => monitors.filter((m) => m.type === type);

  if (loading)
    return (
      <div>
        <div className="h-7 w-48 bg-bg-card rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-bg-card rounded animate-pulse mb-6" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-bg-surface border border-border-subtle rounded-lg animate-pulse mb-2" />
        ))}
      </div>
    );

  const renderSection = (type: string, label: string) => {
    const items = byType(type);

    return (
      <div key={type} className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{label}</h3>
            <p className="text-[13px] text-text-secondary font-mono font-light mt-0.5">
              {items.length} monitor{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => {
              resetAddForm();
              setAddingType(addingType === type ? null : type);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 transition-colors active:scale-[0.97]"
          >
            + Add
          </button>
        </div>

        {/* Add form */}
        {addingType === type && (
          <div className="mb-3 bg-bg-surface border border-border-subtle rounded-lg p-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMonitor(type)}
                  className={inputClass}
                  autoFocus
                />
              </div>
              {type === "backrest" && (
                <>
                  <div className="min-w-[140px]">
                    <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Plan ID</label>
                    <input value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)} className={inputClass} />
                  </div>
                  <div className="min-w-[100px]">
                    <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Interval</label>
                    <select value={newInterval} onChange={(e) => setNewInterval(e.target.value)} className={selectClass}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div className="w-[90px]">
                    <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Grace Hrs</label>
                    <input type="number" value={newGraceHours} onChange={(e) => setNewGraceHours(Number(e.target.value))} className={inputClass} min={0} />
                  </div>
                </>
              )}
              {type === "syncthing" && (
                <div className="min-w-[180px]">
                  <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Folder ID</label>
                  <input value={newFolderId} onChange={(e) => setNewFolderId(e.target.value)} className={inputClass} />
                </div>
              )}
              <button onClick={() => addMonitor(type)} disabled={!newName.trim()} className={btnPrimary}>
                Add
              </button>
              <button onClick={resetAddForm} className={btnSecondary}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Monitor list */}
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          {items.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-text-tertiary">No {label.toLowerCase()} monitors.</div>
          )}
          {items.map((monitor) => (
            <div key={monitor.id} className="border-b border-border-subtle last:border-b-0">
              <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-bg-surface/50 transition-colors">
                {/* Enable toggle */}
                <button
                  onClick={() => toggleEnabled(monitor)}
                  className={`w-9 h-5 rounded-full relative transition-colors ${monitor.enabled ? "bg-accent" : "bg-bg-card border border-border"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${monitor.enabled ? "left-[18px]" : "left-0.5"}`}
                  />
                </button>

                {/* Content */}
                {editingId === monitor.id ? (
                  <div className="flex-1 flex items-end gap-3 flex-wrap">
                    <div className="min-w-[160px]">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(monitor);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="bg-bg-surface border border-accent rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none"
                        autoFocus
                      />
                    </div>
                    {monitor.type === "backrest" && (
                      <>
                        <input value={editPlanId} onChange={(e) => setEditPlanId(e.target.value)} placeholder="Plan ID" className="bg-bg-surface border border-accent rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none w-[130px]" />
                        <select value={editInterval} onChange={(e) => setEditInterval(e.target.value)} className="bg-bg-surface border border-accent rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none">
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                        <input type="number" value={editGraceHours} onChange={(e) => setEditGraceHours(Number(e.target.value))} className="bg-bg-surface border border-accent rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none w-[70px]" min={0} />
                      </>
                    )}
                    {monitor.type === "syncthing" && (
                      <input value={editFolderId} onChange={(e) => setEditFolderId(e.target.value)} placeholder="Folder ID" className="bg-bg-surface border border-accent rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none w-[160px]" />
                    )}
                    <button onClick={() => saveEdit(monitor)} className="px-2 py-1 text-xs rounded-lg bg-accent text-bg-deep active:scale-[0.97]">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary active:scale-[0.97]">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${monitor.enabled ? "text-text-primary" : "text-text-tertiary"}`}>
                          {monitor.name}
                        </span>
                        {monitor.type === "backrest" && (() => {
                          const cfg = parseConfig<ParsedBackrestConfig>(monitor.config, { planId: "", interval: "daily", graceHours: 2 });
                          return (
                            <span className="text-xs text-text-tertiary font-mono">
                              {cfg.interval} / {cfg.graceHours}h grace
                            </span>
                          );
                        })()}
                        {monitor.type === "syncthing" && (() => {
                          const cfg = parseConfig<ParsedSyncthingConfig>(monitor.config, { folderId: "" });
                          return (
                            <span className="text-xs text-text-tertiary font-mono">{cfg.folderId}</span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => startEdit(monitor)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:bg-bg-surface transition-colors active:scale-[0.97]">
                        Edit
                      </button>
                      {deleteConfirm === monitor.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => deleteMonitor(monitor.id)} className={btnDeleteConfirm}>
                            Confirm
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:bg-bg-surface transition-colors active:scale-[0.97]">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(monitor.id)} className={btnDelete}>
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-1">Alert Monitors</h2>
      <p className="text-[13px] text-text-secondary font-mono font-light mb-6">
        {monitors.length} monitors, {monitors.filter((m) => m.enabled).length} enabled
      </p>
      {renderSection("container", "Containers")}
      {renderSection("backrest", "Backrest Plans")}
      {renderSection("syncthing", "Syncthing Folders")}
    </div>
  );
}
