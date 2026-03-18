import { Router } from "express";
import { getDb } from "../db";

const router = Router();

interface AlertMonitorRow {
  id: number;
  type: string;
  name: string;
  enabled: number;
  config: string;
}

// GET /api/alert-monitors
router.get("/api/alert-monitors", (_req, res) => {
  try {
    const db = getDb();
    const monitors = db.prepare("SELECT * FROM alert_monitors ORDER BY type, name").all() as AlertMonitorRow[];
    res.json({ monitors });
  } catch (err) {
    console.error("Fetch alert monitors error:", err);
    res.status(500).json({ error: "Failed to fetch alert monitors" });
  }
});

// POST /api/alert-monitors
router.post("/api/alert-monitors", (req, res) => {
  try {
    const { type, name, config } = req.body;
    if (!type || !name) {
      res.status(400).json({ error: "type and name are required" });
      return;
    }
    const db = getDb();
    const result = db.prepare(
      "INSERT INTO alert_monitors (type, name, config) VALUES (?, ?, ?)"
    ).run(type, name, config ? JSON.stringify(config) : "{}");
    res.json({ monitor: { id: result.lastInsertRowid } });
  } catch (err: any) {
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ error: "A monitor with this type and name already exists" });
      return;
    }
    console.error("Create alert monitor error:", err);
    res.status(500).json({ error: "Failed to create alert monitor" });
  }
});

// PUT /api/alert-monitors/:id
router.put("/api/alert-monitors/:id", (req, res) => {
  try {
    const { name, enabled, config } = req.body;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) { fields.push("name = ?"); values.push(name); }
    if (enabled !== undefined) { fields.push("enabled = ?"); values.push(enabled ? 1 : 0); }
    if (config !== undefined) { fields.push("config = ?"); values.push(JSON.stringify(config)); }

    if (fields.length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }

    const db = getDb();
    values.push(req.params.id);
    const result = db.prepare(`UPDATE alert_monitors SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    if (result.changes === 0) {
      res.status(404).json({ error: "Alert monitor not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Update alert monitor error:", err);
    res.status(500).json({ error: "Failed to update alert monitor" });
  }
});

// DELETE /api/alert-monitors/:id
router.delete("/api/alert-monitors/:id", (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare("DELETE FROM alert_monitors WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ error: "Alert monitor not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete alert monitor error:", err);
    res.status(500).json({ error: "Failed to delete alert monitor" });
  }
});

export default router;
