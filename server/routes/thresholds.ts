import { Router } from "express";
import { getDb } from "../db";

const router = Router();

interface ThresholdRow {
  id: number;
  server: string;
  metric: string;
  warning_value: number | null;
  critical_value: number | null;
}

// GET /api/thresholds
router.get("/api/thresholds", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM alert_thresholds ORDER BY server, metric").all() as ThresholdRow[];
    res.json({ thresholds: rows });
  } catch (err) {
    console.error("Thresholds error:", err);
    res.status(500).json({ error: "Failed to fetch thresholds" });
  }
});

// PUT /api/thresholds — batch upsert
router.put("/api/thresholds", (req, res) => {
  try {
    const items: { server: string; metric: string; warning_value: number; critical_value: number }[] = req.body.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items array required" });
      return;
    }
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO alert_thresholds (server, metric, warning_value, critical_value)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(server, metric) DO UPDATE SET
         warning_value = excluded.warning_value,
         critical_value = excluded.critical_value`
    );
    const tx = db.transaction(() => {
      for (const item of items) {
        stmt.run(item.server, item.metric, item.warning_value, item.critical_value);
      }
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    console.error("Update thresholds error:", err);
    res.status(500).json({ error: "Failed to update thresholds" });
  }
});

export default router;
