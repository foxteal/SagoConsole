import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../api/client";

interface Screen {
  id: number;
  slug: string;
  name: string;
  icon: string;
  type: string;
  apiSource: string;
  refreshSeconds: number;
  summaryTemplate: string | null;
  columns: Column[];
  rowActions: Action[];
  globalActions: Action[];
  sortOrder: number;
}

interface Column {
  key: string;
  label: string;
  type: string;
  badgeMap?: Record<string, string>;
}

interface Action {
  id: string;
  label: string;
  method: string;
  url: string;
  confirm?: boolean;
}

const ICON_OPTIONS = ["grid", "film", "download", "queue", "play", "link", "alert", "gamepad", "settings"];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const emptyScreen: {
  name: string; slug: string; icon: string; type: string;
  apiSource: string; refreshSeconds: number; summaryTemplate: string;
  columns: Column[]; rowActions: Action[]; globalActions: Action[]; sortOrder: number;
} = {
  name: "", slug: "", icon: "grid", type: "data-table",
  apiSource: "", refreshSeconds: 30, summaryTemplate: "",
  columns: [], rowActions: [], globalActions: [], sortOrder: 0,
};

const inputClass = "w-full bg-bg-surface border border-transparent rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors";
const textareaClass = "w-full bg-bg-surface border border-transparent rounded-lg px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-accent transition-colors resize-y";

export default function ScreensSettings() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Screen | null>(null);
  const [form, setForm] = useState(emptyScreen);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [columnsJson, setColumnsJson] = useState("[]");
  const [rowActionsJson, setRowActionsJson] = useState("[]");
  const [globalActionsJson, setGlobalActionsJson] = useState("[]");

  const fetchScreens = useCallback(async () => {
    try {
      const res = await apiClient("/api/screens");
      const data = await res.json();
      setScreens(data.screens);
    } catch (err) {
      console.error("Failed to fetch screens:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchScreens(); }, [fetchScreens]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyScreen });
    setColumnsJson("[]");
    setRowActionsJson("[]");
    setGlobalActionsJson("[]");
    setShowForm(true);
  };

  const openEdit = (screen: Screen) => {
    setEditing(screen);
    setForm({
      name: screen.name, slug: screen.slug, icon: screen.icon, type: screen.type,
      apiSource: screen.apiSource, refreshSeconds: screen.refreshSeconds,
      summaryTemplate: screen.summaryTemplate || "", columns: screen.columns,
      rowActions: screen.rowActions, globalActions: screen.globalActions, sortOrder: screen.sortOrder,
    });
    setColumnsJson(JSON.stringify(screen.columns, null, 2));
    setRowActionsJson(JSON.stringify(screen.rowActions, null, 2));
    setGlobalActionsJson(JSON.stringify(screen.globalActions, null, 2));
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyScreen);
  };

  const saveScreen = async () => {
    let columns, row_actions, global_actions;
    try {
      columns = JSON.parse(columnsJson);
      row_actions = JSON.parse(rowActionsJson);
      global_actions = JSON.parse(globalActionsJson);
    } catch {
      alert("Invalid JSON in columns or actions");
      return;
    }

    const body = {
      slug: form.slug || slugify(form.name),
      name: form.name, icon: form.icon, type: form.type,
      api_source: form.apiSource, refresh_seconds: form.refreshSeconds,
      summary_template: form.summaryTemplate || null,
      columns, row_actions, global_actions, sort_order: form.sortOrder,
    };

    if (editing) {
      await apiClient(`/api/screens/${editing.slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await apiClient("/api/screens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    cancelForm();
    fetchScreens();
  };

  const deleteScreen = async (slug: string) => {
    await apiClient(`/api/screens/${slug}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchScreens();
  };

  if (loading) return (
    <div>
      <div className="h-7 w-48 bg-bg-card rounded animate-pulse mb-2" />
      <div className="h-4 w-40 bg-bg-card rounded animate-pulse mb-6" />
      <div className="border border-border-subtle rounded-lg overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 border-b border-border-subtle last:border-b-0 bg-bg-surface animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Generic Screens</h2>
          <p className="text-[13px] text-text-secondary font-mono font-light mt-0.5">
            {screens.length} screen{screens.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button onClick={openAdd} className="px-3 py-1.5 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 transition-colors active:scale-[0.97]">
          + Add Screen
        </button>
      </div>

      {/* Inline Add/Edit form */}
      {showForm && (
        <div className="mb-6 bg-bg-surface border border-border-subtle rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">{editing ? "Edit Screen" : "Add Screen"}</h3>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} className={inputClass} autoFocus />
              </div>
              <div>
                <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Slug</label>
                <input value={form.slug || slugify(form.name)} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass + " font-mono"} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Icon</label>
                <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputClass}>
                  {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as string })} className={inputClass}>
                  <option value="data-table">Data Table</option>
                  <option value="action-only">Action Only</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Refresh (s)</label>
                <input type="number" value={form.refreshSeconds} onChange={(e) => setForm({ ...form, refreshSeconds: parseInt(e.target.value) || 0 })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">API Source</label>
              <input value={form.apiSource} onChange={(e) => setForm({ ...form, apiSource: e.target.value })} placeholder="/api/proxy/..." className={inputClass + " placeholder:text-text-tertiary"} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Summary Template</label>
              <input value={form.summaryTemplate} onChange={(e) => setForm({ ...form, summaryTemplate: e.target.value })} placeholder="{total} items" className={inputClass + " placeholder:text-text-tertiary"} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Columns (JSON)</label>
              <textarea value={columnsJson} onChange={(e) => setColumnsJson(e.target.value)} rows={4} className={textareaClass} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Row Actions (JSON)</label>
              <textarea value={rowActionsJson} onChange={(e) => setRowActionsJson(e.target.value)} rows={3} className={textareaClass} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Global Actions (JSON)</label>
              <textarea value={globalActionsJson} onChange={(e) => setGlobalActionsJson(e.target.value)} rows={3} className={textareaClass} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={cancelForm} className="px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-card transition-colors active:scale-[0.97]">Cancel</button>
            <button onClick={saveScreen} disabled={!form.name || !form.apiSource} className="px-3 py-1.5 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors active:scale-[0.97]">
              {editing ? "Save" : "Add"}
            </button>
          </div>
        </div>
      )}

      <div className="border border-border-subtle rounded-lg overflow-hidden">
        {screens.length === 0 ? (
          <div className="px-4 py-6 text-center text-text-tertiary text-sm">No screens configured</div>
        ) : (
          screens.map((screen) => (
            <div key={screen.slug} className="flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle last:border-b-0 hover:bg-bg-surface/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary">{screen.name}</div>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-[13px] text-text-tertiary font-mono font-light">/{screen.slug}</span>
                  <span className="text-[13px] text-text-tertiary font-light">{screen.type}</span>
                  <span className="text-[13px] text-text-tertiary font-light">{screen.refreshSeconds}s refresh</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => openEdit(screen)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:bg-bg-surface transition-colors active:scale-[0.97]">
                  Edit
                </button>
                {deleteConfirm === screen.slug ? (
                  <div className="flex gap-1">
                    <button onClick={() => deleteScreen(screen.slug)} className="px-2 py-1 text-xs rounded-lg bg-red/20 text-red hover:bg-red/30 transition-colors active:scale-[0.97]">Confirm</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:bg-bg-surface transition-colors active:scale-[0.97]">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(screen.slug)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:text-red hover:border-red/30 transition-colors active:scale-[0.97]">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
