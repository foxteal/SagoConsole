import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api/client";

// Types matching server-side ScreenConfig
interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "badge" | "progress" | "filesize" | "timestamp";
  badgeMap?: Record<string, string>;
}

interface ActionDef {
  id: string;
  label: string;
  method: string;
  url: string;
  confirm?: boolean;
}

interface ScreenConfig {
  slug: string;
  name: string;
  type: "data-table" | "action-only";
  apiSource: string;
  refreshSeconds: number;
  summaryTemplate: string | null;
  columns: ColumnDef[];
  rowActions: ActionDef[];
  globalActions: ActionDef[];
}

interface ScreenRow {
  id: string;
  [key: string]: unknown;
}

// -- Formatting helpers --

function formatFileSize(bytes: unknown): string {
  const b = Number(bytes);
  if (!b || isNaN(b)) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function timeAgo(val: unknown): string {
  if (!val) return "—";
  const diff = Date.now() - new Date(String(val)).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const colorMap: Record<string, string> = {
  accent: "bg-accent-glow text-accent",
  green: "bg-green-dim text-green",
  red: "bg-red-dim text-red",
  amber: "bg-amber-dim text-amber",
  "text-secondary": "bg-bg-card text-text-secondary",
  "text-tertiary": "bg-bg-card text-text-tertiary",
};

function BadgeCell({ value, badgeMap }: { value: string; badgeMap?: Record<string, string> }) {
  const colorKey = badgeMap?.[value] || "text-secondary";
  const cls = colorMap[colorKey] || colorMap["text-secondary"];
  return (
    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-lg ${cls}`}>
      {value}
    </span>
  );
}

function ProgressCell({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-card rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-text-tertiary w-8 text-right">{value}%</span>
    </div>
  );
}

function CellValue({ col, value }: { col: ColumnDef; value: unknown }) {
  switch (col.type) {
    case "badge":
      return <BadgeCell value={String(value || "")} badgeMap={col.badgeMap} />;
    case "progress":
      return <ProgressCell value={Number(value) || 0} />;
    case "filesize":
      return <span className="font-mono text-[11px]">{formatFileSize(value)}</span>;
    case "timestamp":
      return <span className="font-mono text-[11px]">{timeAgo(value)}</span>;
    default:
      return <span className="text-xs">{String(value ?? "")}</span>;
  }
}

function renderSummary(template: string, summary: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(summary[key] ?? 0));
}

export default function GenericScreen() {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<ScreenConfig | null>(null);
  const [rows, setRows] = useState<ScreenRow[]>([]);
  const [summary, setSummary] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch screen config
  useEffect(() => {
    setLoading(true);
    setConfig(null);
    setRows([]);
    setStatusFilter("all");
    apiClient(`/api/screens/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setConfig(data);
      });
  }, [slug]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!config) return;
    try {
      const res = await apiClient(config.apiSource);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setSummary(data.summary || {});
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (!config) return;
    fetchData();
    if (config.refreshSeconds > 0) {
      intervalRef.current = setInterval(fetchData, config.refreshSeconds * 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [config, fetchData]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const executeAction = async (action: ActionDef, rowId?: string) => {
    if (action.confirm && !window.confirm(`Are you sure you want to ${action.label.toLowerCase()}?`)) {
      return;
    }

    try {
      const url = rowId
        ? `/api/proxy/${slug}/action/${action.id}/${rowId}`
        : `/api/proxy/${slug}/action/${action.id}`;
      const res = await apiClient(url, { method: "POST" });
      const data = await res.json();
      setToast({ message: data.message || (data.ok ? "Done" : "Failed"), ok: data.ok });
      if (data.ok) fetchData();
    } catch {
      setToast({ message: "Action failed", ok: false });
    }
  };

  // Derive filter options from the first badge-type column (usually "status")
  const badgeCol = config?.columns.find((c) => c.type === "badge");
  const statusValues = badgeCol
    ? [...new Set(rows.map((r) => String(r[badgeCol.key] || "")))]
        .filter(Boolean)
        .sort()
    : [];
  const filteredRows =
    statusFilter === "all" || !badgeCol
      ? rows
      : rows.filter((r) => String(r[badgeCol.key]) === statusFilter);

  if (!config) {
    return (
      <div className="p-6">
        <p className="text-text-tertiary text-sm font-mono">
          {loading ? "Loading..." : "Screen not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">{config.name}</h1>
          {config.summaryTemplate && (
            <p className="text-xs text-text-tertiary font-mono font-light mt-0.5">
              {renderSummary(config.summaryTemplate, summary)}
            </p>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 px-3 py-2 rounded-lg text-sm border ${
            toast.ok
              ? "bg-green-dim border-green/20 text-green"
              : "bg-red-dim border-red/20 text-red"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Global actions */}
      {config.globalActions.length > 0 && (
        <div className="flex gap-2 mb-4">
          {config.globalActions.map((action) => (
            <button
              key={action.id}
              onClick={() => executeAction(action)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-bg-surface border border-border-subtle text-text-secondary hover:border-border hover:text-text-primary transition-all active:scale-[0.97]"
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={fetchData}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-bg-surface border border-border-subtle text-text-secondary hover:border-border hover:text-text-primary transition-all active:scale-[0.97]"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Status filter chips */}
      {config.type === "data-table" && statusValues.length > 1 && (
        <div className="flex gap-1.5 mb-4">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              statusFilter === "all"
                ? "bg-accent-glow border-accent-dim text-accent"
                : "bg-bg-surface border-border-subtle text-text-secondary hover:border-border hover:text-text-primary"
            }`}
          >
            All ({rows.length})
          </button>
          {statusValues.map((val) => {
            const count = rows.filter((r) => String(r[badgeCol!.key]) === val).length;
            return (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  statusFilter === val
                    ? "bg-accent-glow border-accent-dim text-accent"
                    : "bg-bg-surface border-border-subtle text-text-secondary hover:border-border hover:text-text-primary"
                }`}
              >
                {val} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Action-only page — just show the buttons above */}
      {config.type === "action-only" && !loading && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-8 text-center">
          <p className="text-text-tertiary text-sm">Use the actions above to manage {config.name}</p>
        </div>
      )}

      {/* Data table */}
      {config.type === "data-table" && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {config.columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left px-3 py-2 text-[10px] uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle"
                  >
                    {col.label}
                  </th>
                ))}
                {config.rowActions.length > 0 && (
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle w-[1%]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={config.columns.length + (config.rowActions.length > 0 ? 1 : 0)}
                    className="px-3 py-6 text-center text-[11px] text-text-tertiary font-mono"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={config.columns.length + (config.rowActions.length > 0 ? 1 : 0)}
                    className="px-3 py-6 text-center text-[11px] text-text-tertiary font-mono"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-bg-surface/50">
                    {config.columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2.5 border-b border-border-subtle text-text-secondary"
                      >
                        <CellValue col={col} value={row[col.key]} />
                      </td>
                    ))}
                    {config.rowActions.length > 0 && (
                      <td className="px-3 py-2.5 border-b border-border-subtle text-right whitespace-nowrap">
                        <div className="flex gap-1 justify-end">
                          {config.rowActions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => executeAction(action, row.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-bg-card border border-border-subtle text-text-tertiary hover:text-text-primary hover:border-border transition-all"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
