import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../api/client";

interface Threshold {
  id: number;
  server: string;
  metric: string;
  warning_value: number | null;
  critical_value: number | null;
}

const METRIC_LABELS: Record<string, string> = {
  cpu: "CPU Usage",
  memory: "Memory Usage",
  disk: "Disk Usage",
};

export default function ThresholdsSettings() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [edits, setEdits] = useState<Map<string, { warning: number; critical: number }>>(new Map());

  const fetchThresholds = useCallback(async () => {
    try {
      const res = await apiClient("/api/thresholds");
      const data = await res.json();
      setThresholds(data.thresholds);

      const editMap = new Map<string, { warning: number; critical: number }>();
      for (const t of data.thresholds as Threshold[]) {
        editMap.set(`${t.server}::${t.metric}`, { warning: t.warning_value ?? 0, critical: t.critical_value ?? 0 });
      }
      setEdits(editMap);
    } catch (err) {
      console.error("Failed to fetch thresholds:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchThresholds(); }, [fetchThresholds]);

  const getEdit = (server: string, metric: string) => {
    return edits.get(`${server}::${metric}`) || { warning: 0, critical: 0 };
  };

  const updateEdit = (server: string, metric: string, field: "warning" | "critical", value: number) => {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(`${server}::${metric}`) || { warning: 0, critical: 0 };
      next.set(`${server}::${metric}`, { ...current, [field]: value });
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const items = Array.from(edits.entries()).map(([key, edit]) => {
      const [server, metric] = key.split("::");
      return { server, metric, warning_value: edit.warning, critical_value: edit.critical };
    });

    await apiClient("/api/thresholds", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSaving(false);
    setDirty(false);
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  // Group by server
  const servers = new Map<string, Threshold[]>();
  for (const t of thresholds) {
    const list = servers.get(t.server) || [];
    list.push(t);
    servers.set(t.server, list);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Alert Thresholds</h2>
          <p className="text-xs text-text-tertiary font-mono font-light mt-0.5">
            Configure warning and critical levels per server
          </p>
        </div>
        {dirty && (
          <button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs rounded-md bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      {Array.from(servers.entries()).map(([serverName, serverThresholds]) => (
        <div key={serverName} className="mb-6">
          <h3 className="text-sm font-medium text-text-primary mb-2">{serverName}</h3>
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_120px] gap-3 px-3 py-2 bg-bg-surface/50 border-b border-border-subtle">
              <span className="text-[11px] text-text-tertiary uppercase tracking-wider">Metric</span>
              <span className="text-[11px] text-text-tertiary uppercase tracking-wider">Warning %</span>
              <span className="text-[11px] text-text-tertiary uppercase tracking-wider">Critical %</span>
            </div>
            {serverThresholds.map((t) => {
              const edit = getEdit(t.server, t.metric);
              return (
                <div key={t.metric} className="grid grid-cols-[1fr_120px_120px] gap-3 px-3 py-2.5 border-b border-border-subtle last:border-b-0 items-center">
                  <span className="text-[13px] text-text-primary">{METRIC_LABELS[t.metric] || t.metric}</span>
                  <input
                    type="number"
                    value={edit.warning}
                    onChange={(e) => updateEdit(t.server, t.metric, "warning", parseFloat(e.target.value) || 0)}
                    className="bg-bg-deep border border-border rounded-md px-2 py-1 text-xs text-amber-400 font-mono focus:outline-none focus:border-accent w-full"
                  />
                  <input
                    type="number"
                    value={edit.critical}
                    onChange={(e) => updateEdit(t.server, t.metric, "critical", parseFloat(e.target.value) || 0)}
                    className="bg-bg-deep border border-border rounded-md px-2 py-1 text-xs text-red font-mono focus:outline-none focus:border-accent w-full"
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
