import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../api/client";

interface Link {
  id: number;
  title: string;
  url: string;
  icon_url: string | null;
  category: string;
  sort_order: number;
}

interface Category {
  id: number;
  name: string;
  sort_order: number;
  link_count: number;
}

interface LinkGroup {
  name: string;
  links: Link[];
}

const emptyForm = { title: "", url: "", icon_url: "", category: "" };

export default function LinksSettings() {
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [catModalOpen, setCatModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [linksRes, catsRes] = await Promise.all([
        apiClient("/api/links"),
        apiClient("/api/link-categories"),
      ]);
      const linksData = await linksRes.json();
      const catsData = await catsRes.json();
      setGroups(linksData.categories);
      setCategories(catsData.categories);
    } catch (err) {
      console.error("Failed to fetch links:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditingLink(null);
    setForm({ ...emptyForm, category: categories[0]?.name || "" });
    setModalOpen(true);
  };

  const openEdit = (link: Link) => {
    setEditingLink(link);
    setForm({ title: link.title, url: link.url, icon_url: link.icon_url || "", category: link.category });
    setModalOpen(true);
  };

  const saveLink = async () => {
    const body = { ...form, icon_url: form.icon_url || null, sort_order: editingLink?.sort_order ?? 0 };
    if (editingLink) {
      await apiClient(`/api/links/${editingLink.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await apiClient("/api/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setModalOpen(false);
    fetchData();
  };

  const deleteLink = async (id: number) => {
    await apiClient(`/api/links/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  };

  const moveLink = async (link: Link, direction: "up" | "down") => {
    const group = groups.find((g) => g.name === link.category);
    if (!group) return;
    const idx = group.links.findIndex((l) => l.id === link.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= group.links.length) return;

    const items = [
      { id: link.id, sort_order: group.links[swapIdx].sort_order },
      { id: group.links[swapIdx].id, sort_order: link.sort_order },
    ];
    await apiClient("/api/links/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    fetchData();
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await apiClient("/api/link-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategory.trim() }) });
    setNewCategory("");
    setCatModalOpen(false);
    fetchData();
  };

  const deleteCategory = async (cat: Category) => {
    if (cat.link_count > 0) return;
    await apiClient(`/api/link-categories/${cat.id}`, { method: "DELETE" });
    fetchData();
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  const totalLinks = groups.reduce((s, g) => s + g.links.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Service Links</h2>
          <p className="text-xs text-text-tertiary font-mono font-light mt-0.5">
            {totalLinks} links across {groups.length} categories
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCatModalOpen(true)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-bg-surface text-text-secondary transition-colors">
            + Category
          </button>
          <button onClick={openAdd} className="px-3 py-1.5 text-xs rounded-md bg-accent text-bg-deep font-medium hover:bg-accent/90 transition-colors">
            + Add Link
          </button>
        </div>
      </div>

      {/* Category groups */}
      {groups.map((group) => (
        <div key={group.name} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-text-primary">{group.name}</h3>
            <span className="text-[10px] text-text-tertiary font-mono">{group.links.length}</span>
          </div>
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            {group.links.map((link, idx) => (
              <div key={link.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle last:border-b-0 hover:bg-bg-surface/50 transition-colors">
                {/* Move buttons */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveLink(link, "up")} disabled={idx === 0} className="text-text-tertiary hover:text-text-primary disabled:opacity-20 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button onClick={() => moveLink(link, "down")} disabled={idx === group.links.length - 1} className="text-text-tertiary hover:text-text-primary disabled:opacity-20 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
                {/* Icon */}
                {link.icon_url && (
                  <img src={link.icon_url} alt="" className="w-5 h-5 rounded-sm object-contain" />
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-text-primary truncate">{link.title}</div>
                  <div className="text-[11px] text-text-tertiary font-mono truncate">{new URL(link.url).hostname}</div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(link)} className="px-2 py-1 text-[11px] rounded border border-border text-text-secondary hover:bg-bg-surface transition-colors">
                    Edit
                  </button>
                  {deleteConfirm === link.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => deleteLink(link.id)} className="px-2 py-1 text-[11px] rounded bg-red/20 text-red hover:bg-red/30 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-[11px] rounded border border-border text-text-secondary hover:bg-bg-surface transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(link.id)} className="px-2 py-1 text-[11px] rounded border border-border text-text-secondary hover:text-red hover:border-red/30 transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Categories management */}
      {categories.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-text-primary mb-2">Category Order</h3>
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-3 py-2 border-b border-border-subtle last:border-b-0">
                <span className="text-[13px] text-text-primary">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-tertiary font-mono">{cat.link_count} links</span>
                  {cat.link_count === 0 && (
                    <button onClick={() => deleteCategory(cat)} className="px-2 py-0.5 text-[11px] rounded border border-border text-text-tertiary hover:text-red hover:border-red/30 transition-colors">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Link Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-bg-card border border-border rounded-xl p-5 w-[420px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4">{editingLink ? "Edit Link" : "Add Link"}</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1 block">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-bg-deep border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1 block">URL</label>
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full bg-bg-deep border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1 block">Icon URL</label>
                <input value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })} placeholder="Optional" className="w-full bg-bg-deep border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1 block">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-bg-deep border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs rounded-md border border-border text-text-secondary hover:bg-bg-surface transition-colors">
                Cancel
              </button>
              <button onClick={saveLink} disabled={!form.title || !form.url || !form.category} className="px-3 py-1.5 text-xs rounded-md bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors">
                {editingLink ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setCatModalOpen(false)}>
          <div className="bg-bg-card border border-border rounded-xl p-5 w-[340px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4">Add Category</h3>
            <div>
              <label className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1 block">Name</label>
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-bg-deep border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" onKeyDown={(e) => e.key === "Enter" && addCategory()} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCatModalOpen(false)} className="px-3 py-1.5 text-xs rounded-md border border-border text-text-secondary hover:bg-bg-surface transition-colors">
                Cancel
              </button>
              <button onClick={addCategory} disabled={!newCategory.trim()} className="px-3 py-1.5 text-xs rounded-md bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
