import { Router } from "express";
import { getDb } from "../db";
import type { ScreenConfig } from "../adapters/types";

const router = Router();

interface ScreenRow {
  id: number;
  slug: string;
  name: string;
  icon: string;
  type: string;
  api_source: string;
  refresh_seconds: number;
  summary_template: string | null;
  columns: string;
  row_actions: string;
  global_actions: string;
  sort_order: number;
}

function rowToConfig(row: ScreenRow): ScreenConfig {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    type: row.type as ScreenConfig["type"],
    apiSource: row.api_source,
    refreshSeconds: row.refresh_seconds,
    summaryTemplate: row.summary_template,
    columns: JSON.parse(row.columns),
    rowActions: JSON.parse(row.row_actions),
    globalActions: JSON.parse(row.global_actions),
    sortOrder: row.sort_order,
  };
}

// List all screens (for sidebar)
router.get("/api/screens", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM screens ORDER BY sort_order").all() as ScreenRow[];
    res.json({ screens: rows.map(rowToConfig) });
  } catch (err) {
    console.error("Screens error:", err);
    res.status(500).json({ error: "Failed to fetch screens" });
  }
});

// Get single screen config
router.get("/api/screens/:slug", (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM screens WHERE slug = ?").get(req.params.slug) as ScreenRow | undefined;
    if (!row) {
      res.status(404).json({ error: "Screen not found" });
      return;
    }
    res.json(rowToConfig(row));
  } catch (err) {
    console.error("Screen error:", err);
    res.status(500).json({ error: "Failed to fetch screen" });
  }
});

// POST /api/screens — create screen
router.post("/api/screens", (req, res) => {
  try {
    const { slug, name, icon, type, api_source, refresh_seconds, summary_template, columns, row_actions, global_actions, sort_order } = req.body;
    if (!slug || !name || !api_source) {
      res.status(400).json({ error: "slug, name, and api_source are required" });
      return;
    }
    const db = getDb();
    const result = db.prepare(
      `INSERT INTO screens (slug, name, icon, type, api_source, refresh_seconds, summary_template, columns, row_actions, global_actions, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      slug, name, icon || "grid", type || "data-table", api_source,
      refresh_seconds ?? 30, summary_template || null,
      JSON.stringify(columns || []), JSON.stringify(row_actions || []), JSON.stringify(global_actions || []),
      sort_order ?? 0
    );
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error("Create screen error:", err);
    res.status(500).json({ error: "Failed to create screen" });
  }
});

// PUT /api/screens/:slug — update screen
router.put("/api/screens/:slug", (req, res) => {
  try {
    const { name, icon, type, api_source, refresh_seconds, summary_template, columns, row_actions, global_actions, sort_order } = req.body;
    const db = getDb();
    const result = db.prepare(
      `UPDATE screens SET name = ?, icon = ?, type = ?, api_source = ?, refresh_seconds = ?,
       summary_template = ?, columns = ?, row_actions = ?, global_actions = ?, sort_order = ?
       WHERE slug = ?`
    ).run(
      name, icon || "grid", type || "data-table", api_source,
      refresh_seconds ?? 30, summary_template || null,
      JSON.stringify(columns || []), JSON.stringify(row_actions || []), JSON.stringify(global_actions || []),
      sort_order ?? 0, req.params.slug
    );
    if (result.changes === 0) {
      res.status(404).json({ error: "Screen not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Update screen error:", err);
    res.status(500).json({ error: "Failed to update screen" });
  }
});

// DELETE /api/screens/:slug — delete screen
router.delete("/api/screens/:slug", (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare("DELETE FROM screens WHERE slug = ?").run(req.params.slug);
    if (result.changes === 0) {
      res.status(404).json({ error: "Screen not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete screen error:", err);
    res.status(500).json({ error: "Failed to delete screen" });
  }
});

export default router;
