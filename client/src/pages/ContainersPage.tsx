import { useEffect, useState, useMemo, useCallback } from "react";
import { apiClient } from "../api/client";

interface ContainerInfo {
  id: string;
  name: string;
  state: string;
  image: string;
  status: string;
  project: string;
}

interface ServerContainers {
  server: string;
  endpointId: number;
  total: number;
  running: number;
  containers: ContainerInfo[];
}

interface DiunUpdate {
  id: number;
  name: string;
  host: string;
  image: string;
}

type StateFilter = "all" | "running" | "stopped";
type SortKey = "name" | "state" | "image" | "status";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  running: { bg: "bg-green-dim", text: "text-green" },
  exited: { bg: "bg-red-dim", text: "text-red" },
  paused: { bg: "bg-amber-dim", text: "text-amber" },
  created: { bg: "bg-accent-glow", text: "text-accent" },
  restarting: { bg: "bg-amber-dim", text: "text-amber" },
  dead: { bg: "bg-red-dim", text: "text-red" },
};

function StateBadge({ state }: { state: string }) {
  const colors = STATE_COLORS[state] || { bg: "bg-bg-card", text: "text-text-secondary" };
  return (
    <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-lg ${colors.bg} ${colors.text}`}>
      {state}
    </span>
  );
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  start: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M6 4l15 8-15 8V4z" />
    </svg>
  ),
  stop: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="5" y="5" width="14" height="14" rx="1.5" />
    </svg>
  ),
  restart: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  ),
  update: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M5 12l7 7 7-7M5 21h14" />
    </svg>
  ),
};

function ActionButton({
  action,
  title,
  disabled,
  loading,
  variant,
  onClick,
}: {
  action: string;
  title: string;
  disabled?: boolean;
  loading?: boolean;
  variant: "default" | "danger" | "accent" | "dim";
  onClick: () => void;
}) {
  const base = "w-7 h-7 flex items-center justify-center rounded border transition-all active:scale-[0.93] disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    default: "bg-bg-card border-border-subtle text-text-secondary hover:border-border hover:text-text-primary",
    danger: "bg-red-dim/50 border-red-dim text-red hover:bg-red-dim",
    accent: "bg-accent-glow border-accent-dim text-accent hover:bg-accent-glow/80",
    dim: "bg-bg-card border-border-subtle text-text-tertiary/50 hover:border-border hover:text-text-tertiary",
  };

  return (
    <button
      className={`${base} ${variants[variant]}`}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
    >
      {loading ? <span className="text-xs font-mono">...</span> : ACTION_ICONS[action]}
    </button>
  );
}

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return <span className="ml-1 text-accent">{dir === "asc" ? "\u2191" : "\u2193"}</span>;
}

export default function ContainersPage() {
  const [servers, setServers] = useState<ServerContainers[]>([]);
  const [updates, setUpdates] = useState<DiunUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sortStates, setSortStates] = useState<Record<string, SortState>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [actionFeedback, setActionFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const fetchData = useCallback(async () => {
    try {
      const [containersRes, updatesRes] = await Promise.all([
        apiClient("/api/containers?raw=true"),
        apiClient("/api/updates"),
      ]);
      if (containersRes.ok) {
        const data = await containersRes.json();
        setServers(data.servers);
      }
      if (updatesRes.ok) {
        const data = await updatesRes.json();
        setUpdates(data.updates);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Build a set of "Host::image" keys for quick update lookup
  const updateSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of updates) {
      set.add(`${u.host}::${u.image}`);
    }
    return set;
  }, [updates]);

  const hasUpdate = (host: string, image: string) => updateSet.has(`${host}::${image}`);

  const toggleCollapse = (server: string) => {
    setCollapsed((prev) => ({ ...prev, [server]: !prev[server] }));
  };

  const toggleSort = (server: string, key: SortKey) => {
    setSortStates((prev) => {
      const current = prev[server];
      if (current?.key === key) {
        return { ...prev, [server]: { key, dir: current.dir === "asc" ? "desc" : "asc" } };
      }
      return { ...prev, [server]: { key, dir: "asc" } };
    });
  };

  const doAction = async (endpointId: number, containerId: string, action: string) => {
    setActionLoading((prev) => ({ ...prev, [containerId]: action }));
    setActionFeedback((prev) => {
      const next = { ...prev };
      delete next[containerId];
      return next;
    });

    try {
      const res = await apiClient(`/api/container-actions/${endpointId}/${containerId}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        setActionFeedback((prev) => ({ ...prev, [containerId]: { ok: true, msg: `${action} OK` } }));
        setTimeout(fetchData, 1500);
      } else {
        setActionFeedback((prev) => ({ ...prev, [containerId]: { ok: false, msg: data.error || "Failed" } }));
      }
    } catch {
      setActionFeedback((prev) => ({ ...prev, [containerId]: { ok: false, msg: "Network error" } }));
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[containerId];
        return next;
      });
    }

    setTimeout(() => {
      setActionFeedback((prev) => {
        const next = { ...prev };
        delete next[containerId];
        return next;
      });
    }, 4000);
  };

  const filteredServers = useMemo(() => {
    const q = search.toLowerCase();
    return servers.map((s) => {
      let containers = s.containers;

      if (q) {
        containers = containers.filter((c) => c.name.toLowerCase().includes(q));
      }

      if (stateFilter === "running") {
        containers = containers.filter((c) => c.state === "running");
      } else if (stateFilter === "stopped") {
        containers = containers.filter((c) => c.state !== "running");
      }

      const sort = sortStates[s.server] || { key: "name" as SortKey, dir: "asc" as SortDir };
      containers = [...containers].sort((a, b) => {
        const aVal = a[sort.key];
        const bVal = b[sort.key];
        const cmp = aVal.localeCompare(bVal);
        return sort.dir === "asc" ? cmp : -cmp;
      });

      return { ...s, containers, running: s.containers.filter((c) => c.state === "running").length };
    });
  }, [servers, search, stateFilter, sortStates]);

  const totalContainers = servers.reduce((sum, s) => sum + s.total, 0);
  const totalRunning = servers.reduce((sum, s) => sum + s.running, 0);

  const stateFilters: { label: string; value: StateFilter }[] = [
    { label: "All", value: "all" },
    { label: "Running", value: "running" },
    { label: "Stopped", value: "stopped" },
  ];

  const thClass = "text-left px-3 py-2 text-xs uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle cursor-pointer select-none hover:text-text-secondary transition-colors";

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Containers</h1>
          <p className="text-[13px] text-text-secondary font-mono font-light mt-0.5">
            {totalRunning} running &middot; {totalContainers} total
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search containers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-dim w-64"
        />
        <div className="flex gap-1.5">
          {stateFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStateFilter(f.value)}
              className={`px-3 py-1 rounded-lg text-[13px] font-medium border transition-all active:scale-[0.97] ${
                stateFilter === f.value
                  ? "bg-accent-glow border-accent-dim text-accent"
                  : "bg-bg-surface border-border-subtle text-text-secondary hover:border-border hover:text-text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-[13px] text-text-tertiary font-mono font-light">Loading containers...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredServers.map((server) => {
            if (server.containers.length === 0 && (search || stateFilter !== "all")) return null;
            const isCollapsed = collapsed[server.server] ?? false;
            const sort = sortStates[server.server] || { key: "name", dir: "asc" };

            return (
              <div key={server.server} className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
                {/* Host header */}
                <button
                  onClick={() => toggleCollapse(server.server)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-card/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">{server.server}</span>
                    <span className="text-xs font-mono text-text-tertiary font-light">
                      {server.running}/{server.total} running
                    </span>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-text-tertiary transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {!isCollapsed && (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle">
                          Actions
                        </th>
                        <th className={thClass} onClick={() => toggleSort(server.server, "name")}>
                          Name<SortArrow active={sort.key === "name"} dir={sort.dir} />
                        </th>
                        <th className={thClass} onClick={() => toggleSort(server.server, "state")}>
                          State<SortArrow active={sort.key === "state"} dir={sort.dir} />
                        </th>
                        <th className={`${thClass} hidden lg:table-cell`} onClick={() => toggleSort(server.server, "image")}>
                          Image<SortArrow active={sort.key === "image"} dir={sort.dir} />
                        </th>
                        <th className={`${thClass} hidden md:table-cell`} onClick={() => toggleSort(server.server, "status")}>
                          Status<SortArrow active={sort.key === "status"} dir={sort.dir} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {server.containers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-[13px] text-text-tertiary font-mono">
                            No containers
                          </td>
                        </tr>
                      ) : (
                        server.containers.map((c) => {
                          const isRunning = c.state === "running";
                          const loadingAction = actionLoading[c.id];
                          const feedback = actionFeedback[c.id];
                          const updateAvailable = hasUpdate(server.server, c.image);

                          return (
                            <tr key={c.id} className="hover:bg-bg-card/20">
                              <td className="px-3 py-2 border-b border-border-subtle">
                                <div className="flex items-center gap-1.5">
                                  {feedback && (
                                    <span className={`text-xs font-mono mr-1 ${feedback.ok ? "text-green" : "text-red"}`}>
                                      {feedback.msg}
                                    </span>
                                  )}
                                  <ActionButton
                                    action="start"
                                    title="Start"
                                    disabled={isRunning}
                                    loading={loadingAction === "start"}
                                    variant="default"
                                    onClick={() => doAction(server.endpointId, c.id, "start")}
                                  />
                                  <ActionButton
                                    action="stop"
                                    title="Stop"
                                    disabled={!isRunning}
                                    loading={loadingAction === "stop"}
                                    variant="danger"
                                    onClick={() => doAction(server.endpointId, c.id, "stop")}
                                  />
                                  <ActionButton
                                    action="restart"
                                    title="Restart"
                                    disabled={!isRunning}
                                    loading={loadingAction === "restart"}
                                    variant="default"
                                    onClick={() => doAction(server.endpointId, c.id, "restart")}
                                  />
                                  <ActionButton
                                    action="update"
                                    title={updateAvailable ? "Update available" : "Update"}
                                    loading={loadingAction === "update"}
                                    variant={updateAvailable ? "accent" : "dim"}
                                    onClick={() => doAction(server.endpointId, c.id, "update")}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2 border-b border-border-subtle">
                                <span className="font-mono text-[13px] text-text-primary font-light">{c.name}</span>
                              </td>
                              <td className="px-3 py-2 border-b border-border-subtle">
                                <StateBadge state={c.state} />
                              </td>
                              <td className="px-3 py-2 border-b border-border-subtle hidden lg:table-cell">
                                <span className="font-mono text-[13px] text-text-tertiary font-light truncate block max-w-[300px]" title={c.image}>
                                  {c.image}
                                </span>
                              </td>
                              <td className="px-3 py-2 border-b border-border-subtle hidden md:table-cell">
                                <span className="text-[13px] text-text-secondary font-light">{c.status}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
