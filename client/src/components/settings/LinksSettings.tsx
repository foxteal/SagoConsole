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

const inputClass = "w-full bg-bg-surface border border-transparent rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors";

export default function LinksSettings() {
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [showCatForm, setShowCatForm] = useState(false);

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
    setEditingLinkId(null);
    setForm({ ...emptyForm, category: categories[0]?.name || "" });
    setShowAddForm(true);
  };

  const openEdit = (link: Link) => {
    setEditingLinkId(link.id);
    setForm({ title: link.title, url: link.url, icon_url: link.icon_url || "", category: link.category });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingLinkId(null);
    setShowAddForm(false);
    setForm(emptyForm);
  };

  const saveLink = async () => {
    const body = { ...form, icon_url: form.icon_url || null, sort_order: 0 };
    if (editingLinkId) {
      await apiClient(`/api/links/${editingLinkId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await apiClient("/api/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    cancelEdit();
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
    setShowCatForm(false);
    fetchData();
  };

  const deleteCategory = async (cat: Category) => {
    if (cat.link_count > 0) return;
    await apiClient(`/api/link-categories/${cat.id}`, { method: "DELETE" });
    fetchData();
  };

  if (loading) return (
    <div>
      <div className="h-7 w-40 bg-bg-card rounded animate-pulse mb-2" />
      <div className="h-4 w-56 bg-bg-card rounded animate-pulse mb-6" />
      {[...Array(2)].map((_, i) => (
        <div key={i} className="mb-6">
          <div className="h-4 w-24 bg-bg-card rounded animate-pulse mb-2" />
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-12 border-b border-border-subtle last:border-b-0 bg-bg-surface animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const totalLinks = groups.reduce((s, g) => s + g.links.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Service Links</h2>
          <p className="text-[13px] text-text-secondary font-mono font-light mt-0.5">
            {totalLinks} links across {groups.length} categories
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowCatForm(!showCatForm); setShowAddForm(false); }} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-bg-surface text-text-secondary transition-colors active:scale-[0.97]">
            + Category
          </button>
          <button onClick={openAdd} className="px-3 py-1.5 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 transition-colors active:scale-[0.97]">
            + Add Link
          </button>
        </div>
      </div>

      {/* Inline Add Category form */}
      {showCatForm && (
        <div className="mb-4 bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">New Category Name</label>
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                className={inputClass}
                autoFocus
              />
            </div>
            <button onClick={addCategory} disabled={!newCategory.trim()} className="px-3 py-2 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors active:scale-[0.97]">
              Add
            </button>
            <button onClick={() => { setShowCatForm(false); setNewCategory(""); }} className="px-3 py-2 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-card transition-colors active:scale-[0.97]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline Add Link form */}
      {showAddForm && (
        <div className="mb-4 bg-bg-surface border border-border-subtle rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Add Link</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">URL</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Icon URL</label>
              <input value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })} placeholder="Optional" className={inputClass + " placeholder:text-text-tertiary"} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={cancelEdit} className="px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-card transition-colors active:scale-[0.97]">
              Cancel
            </button>
            <button onClick={saveLink} disabled={!form.title || !form.url || !form.category} className="px-3 py-1.5 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors active:scale-[0.97]">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Category groups */}
      {groups.map((group) => (
        <div key={group.name} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-text-primary">{group.name}</h3>
            <span className="text-xs text-text-tertiary font-mono">{group.links.length}</span>
          </div>
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            {group.links.map((link, idx) => (
              <div key={link.id}>
                {editingLinkId === link.id ? (
                  /* Inline edit form replaces the row */
                  <div className="px-3 py-3 border-b border-border-subtle last:border-b-0 bg-bg-surface/50">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Title</label>
                        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
                      </div>
                      <div>
                        <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">URL</label>
                        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Icon URL</label>
                        <input value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })} placeholder="Optional" className={inputClass + " placeholder:text-text-tertiary"} />
                      </div>
                      <div>
                        <label className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 block">Category</label>
                        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-card transition-colors active:scale-[0.97]">
                        Cancel
                      </button>
                      <button onClick={saveLink} disabled={!form.title || !form.url || !form.category} className="px-3 py-1.5 text-sm rounded-lg bg-accent text-bg-deep font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors active:scale-[0.97]">
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal display row */
                  <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle last:border-b-0 hover:bg-bg-surface/50 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveLink(link, "up")} disabled={idx === 0} className="text-text-tertiary hover:text-text-primary disabled:opacity-20 transition-colors active:scale-[0.97]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                      </button>
                      <button onClick={() => moveLink(link, "down")} disabled={idx === group.links.length - 1} className="text-text-tertiary hover:text-text-primary disabled:opacity-20 transition-colors active:scale-[0.97]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                    </div>
                    {link.icon_url && (
                      <img src={link.icon_url} alt="" className="w-5 h-5 rounded-sm object-contain" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">{link.title}</div>
                      <div className="text-[13px] text-text-tertiary font-mono font-light truncate">{new URL(link.url).hostname}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(link)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:bg-bg-surface transition-colors active:scale-[0.97]">
                        Edit
                      </button>
                      {deleteConfirm === link.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => deleteLink(link.id)} className="px-2 py-1 text-xs rounded-lg bg-red/20 text-red hover:bg-red/30 transition-colors active:scale-[0.97]">
                            Confirm
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:bg-bg-surface transition-colors active:scale-[0.97]">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(link.id)} className="px-2 py-1 text-xs rounded-lg border border-border text-text-secondary hover:text-red hover:border-red/30 transition-colors active:scale-[0.97]">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
                <span className="text-sm text-text-primary">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-tertiary font-mono font-light">{cat.link_count} links</span>
                  {cat.link_count === 0 && (
                    <button onClick={() => deleteCategory(cat)} className="px-2 py-0.5 text-xs rounded-lg border border-border text-text-tertiary hover:text-red hover:border-red/30 transition-colors active:scale-[0.97]">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
