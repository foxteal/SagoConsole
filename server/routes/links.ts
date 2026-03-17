import { Router } from "express";
import { getDb } from "../db";

const router = Router();

interface LinkRow {
  id: number;
  title: string;
  url: string;
  icon_url: string | null;
  category: string;
  sort_order: number;
}

interface CategoryRow {
  id: number;
  name: string;
  sort_order: number;
}

// GET /api/links — grouped by category in order
router.get("/api/links", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM links ORDER BY category, sort_order").all() as LinkRow[];
  const categories = db.prepare("SELECT * FROM link_categories ORDER BY sort_order").all() as CategoryRow[];

  const grouped = new Map<string, LinkRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.category) || [];
    list.push(row);
    grouped.set(row.category, list);
  }

  const categoryOrder = categories.map((c) => c.name);
  const result = categoryOrder
    .filter((name) => grouped.has(name))
    .map((name) => ({ name, links: grouped.get(name)! }));

  // Include any categories not in the managed list
  for (const [name, links] of grouped) {
    if (!categoryOrder.includes(name)) {
      result.push({ name, links });
    }
  }

  res.json({ categories: result });
});

// POST /api/links — create link
router.post("/api/links", (req, res) => {
  try {
    const { title, url, icon_url, category, sort_order } = req.body;
    if (!title || !url || !category) {
      res.status(400).json({ error: "title, url, and category are required" });
      return;
    }
    const db = getDb();
    const result = db.prepare(
      "INSERT INTO links (title, url, icon_url, category, sort_order) VALUES (?, ?, ?, ?, ?)"
    ).run(title, url, icon_url || null, category, sort_order ?? 0);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error("Create link error:", err);
    res.status(500).json({ error: "Failed to create link" });
  }
});

// PUT /api/links/reorder — batch update sort_order
router.put("/api/links/reorder", (req, res) => {
  try {
    const items: { id: number; sort_order: number }[] = req.body.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items array required" });
      return;
    }
    const db = getDb();
    const stmt = db.prepare("UPDATE links SET sort_order = ? WHERE id = ?");
    const tx = db.transaction(() => {
      for (const item of items) {
        stmt.run(item.sort_order, item.id);
      }
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    console.error("Reorder links error:", err);
    res.status(500).json({ error: "Failed to reorder links" });
  }
});

// PUT /api/links/:id — update link
router.put("/api/links/:id", (req, res) => {
  try {
    const { title, url, icon_url, category, sort_order } = req.body;
    const db = getDb();
    const result = db.prepare(
      "UPDATE links SET title = ?, url = ?, icon_url = ?, category = ?, sort_order = ? WHERE id = ?"
    ).run(title, url, icon_url || null, category, sort_order ?? 0, req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Update link error:", err);
    res.status(500).json({ error: "Failed to update link" });
  }
});

// DELETE /api/links/:id — delete link
router.delete("/api/links/:id", (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare("DELETE FROM links WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete link error:", err);
    res.status(500).json({ error: "Failed to delete link" });
  }
});

// --- Link Categories ---

// GET /api/link-categories
router.get("/api/link-categories", (_req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(
      `SELECT lc.*, COUNT(l.id) as link_count
       FROM link_categories lc
       LEFT JOIN links l ON l.category = lc.name
       GROUP BY lc.id
       ORDER BY lc.sort_order`
    ).all();
    res.json({ categories });
  } catch (err) {
    console.error("Fetch categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/link-categories
router.post("/api/link-categories", (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const db = getDb();
    const maxOrder = db.prepare("SELECT MAX(sort_order) as max FROM link_categories").get() as { max: number | null };
    const result = db.prepare(
      "INSERT INTO link_categories (name, sort_order) VALUES (?, ?)"
    ).run(name, (maxOrder.max ?? -1) + 1);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/link-categories/:id
router.put("/api/link-categories/:id", (req, res) => {
  try {
    const { name, sort_order } = req.body;
    const db = getDb();

    // If renaming, update links that reference the old name
    if (name !== undefined) {
      const existing = db.prepare("SELECT name FROM link_categories WHERE id = ?").get(req.params.id) as { name: string } | undefined;
      if (existing && existing.name !== name) {
        db.prepare("UPDATE links SET category = ? WHERE category = ?").run(name, existing.name);
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) { fields.push("name = ?"); values.push(name); }
    if (sort_order !== undefined) { fields.push("sort_order = ?"); values.push(sort_order); }

    if (fields.length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }

    values.push(req.params.id);
    db.prepare(`UPDATE link_categories SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    res.json({ ok: true });
  } catch (err) {
    console.error("Update category error:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/link-categories/:id — must be empty
router.delete("/api/link-categories/:id", (req, res) => {
  try {
    const db = getDb();
    const cat = db.prepare("SELECT name FROM link_categories WHERE id = ?").get(req.params.id) as { name: string } | undefined;
    if (!cat) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    const linkCount = db.prepare("SELECT COUNT(*) as count FROM links WHERE category = ?").get(cat.name) as { count: number };
    if (linkCount.count > 0) {
      res.status(400).json({ error: "Category must be empty before deleting" });
      return;
    }
    db.prepare("DELETE FROM link_categories WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
