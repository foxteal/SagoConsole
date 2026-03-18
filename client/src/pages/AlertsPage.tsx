import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

interface Alert {
  id: number;
  source: string;
  severity: string;
  message: string;
  details: string | null;
  fired_at: string;
  resolved_at: string | null;
  dismissed_at: string | null;
}

type Filter = "all" | "critical" | "warning" | "resolved";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Warning", value: "warning" },
  { label: "Resolved", value: "resolved" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmDismissAll, setConfirmDismissAll] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await apiClient("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = alerts.filter((a) => !a.resolved_at && !a.dismissed_at).length;
  const resolvedCount = alerts.filter((a) => a.resolved_at).length;

  const filtered = alerts
    .filter((a) => !a.dismissed_at)
    .filter((a) => {
      if (filter === "all") return true;
      if (filter === "resolved") return a.resolved_at !== null;
      if (filter === "critical") return a.severity === "critical" && !a.resolved_at;
      if (filter === "warning") return a.severity === "warning" && !a.resolved_at;
      return true;
    });

  const dismissOne = async (id: number) => {
    try {
      const res = await apiClient(`/api/alerts/${id}/dismiss`, { method: "POST" });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, dismissed_at: new Date().toISOString() } : a))
        );
      }
    } catch {
      // silent
    }
  };

  const dismissFiltered = async () => {
    const ids = filtered.map((a) => a.id);
    if (ids.length === 0) return;
    try {
      const res = await apiClient("/api/alerts/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const now = new Date().toISOString();
        const idSet = new Set(ids);
        setAlerts((prev) =>
          prev.map((a) => (idSet.has(a.id) ? { ...a, dismissed_at: now } : a))
        );
      }
    } catch {
      // silent
    }
    setConfirmDismissAll(false);
  };

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-text-secondary font-mono font-light mt-0.5">
            {activeCount} active &middot; {resolvedCount} resolved
          </p>
        </div>
        <div className="flex items-center gap-2">
          {confirmDismissAll ? (
            <>
              <span className="text-sm text-text-secondary">
                Dismiss {filtered.length} alert{filtered.length !== 1 ? "s" : ""}?
              </span>
              <button
                onClick={dismissFiltered}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-all active:scale-[0.97]"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDismissAll(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border transition-all active:scale-[0.97]"
              >
                Cancel
              </button>
            </>
          ) : (
            filtered.length > 0 && (
              <button
                onClick={() => setConfirmDismissAll(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border transition-all active:scale-[0.97]"
              >
                Dismiss All
              </button>
            )
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 mb-4">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setConfirmDismissAll(false); }}
            className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all active:scale-[0.97] ${
              filter === f.value
                ? "bg-accent-glow border-accent-dim text-accent"
                : "bg-bg-surface border-border-subtle text-text-secondary hover:border-border hover:text-text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alerts table */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-[30px] text-left px-3 py-2 text-[13px] uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle" />
              <th className="text-left px-3 py-2 text-[13px] uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle">
                Source
              </th>
              <th className="text-left px-3 py-2 text-[13px] uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle">
                Message
              </th>
              <th className="text-left px-3 py-2 text-[13px] uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle">
                Time
              </th>
              <th className="text-left px-3 py-2 text-[13px] uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle">
                Status
              </th>
              <th className="w-[44px] border-b border-border-subtle" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-text-tertiary font-mono">
                  No alerts match this filter
                </td>
              </tr>
            ) : (
              filtered.map((alert) => (
                <tr key={alert.id} className="hover:bg-bg-surface/50">
                  <td className="px-3 py-2.5 border-b border-border-subtle">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        alert.severity === "critical"
                          ? "bg-red shadow-[0_0_4px_rgba(248,113,113,0.4)]"
                          : "bg-amber shadow-[0_0_4px_rgba(251,191,36,0.3)]"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2.5 border-b border-border-subtle">
                    <span className="font-mono text-[13px] px-1.5 py-0.5 rounded bg-bg-card border border-border-subtle">
                      {alert.source}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 border-b border-border-subtle text-sm font-light text-text-primary">
                    {alert.message}
                  </td>
                  <td className="px-3 py-2.5 border-b border-border-subtle font-mono text-sm text-text-secondary font-light whitespace-nowrap">
                    {timeAgo(alert.fired_at)}
                  </td>
                  <td className="px-3 py-2.5 border-b border-border-subtle">
                    {alert.resolved_at ? (
                      <span className="text-[13px] font-mono font-medium px-2 py-0.5 rounded-lg bg-green-dim text-green">
                        resolved
                      </span>
                    ) : (
                      <span className="text-[13px] font-mono font-medium px-2 py-0.5 rounded-lg bg-red-dim text-red">
                        active
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 border-b border-border-subtle">
                    <button
                      onClick={() => dismissOne(alert.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-card transition-colors"
                      title="Dismiss"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
