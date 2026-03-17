import { Router } from "express";
import { getDb } from "../db";
import { getAllContainers } from "../services/portainer";

const router = Router();

interface ContainerPrefRow {
  id: number;
  server: string;
  project_name: string;
  display_name: string | null;
  hidden: number;
  sort_order: number;
}

router.get("/api/containers", async (req, res) => {
  try {
    const raw = req.query.raw === "true";
    const servers = await getAllContainers(raw);
    res.json({ servers });
  } catch (err) {
    console.error("Containers error:", err);
    res.status(502).json({ error: "Failed to fetch containers" });
  }
});

// GET /api/container-prefs
router.get("/api/container-prefs", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM container_prefs ORDER BY server, sort_order").all() as ContainerPrefRow[];
    res.json({
      prefs: rows.map((r) => ({
        id: r.id,
        server: r.server,
        project_name: r.project_name,
        display_name: r.display_name,
        hidden: r.hidden === 1,
        sort_order: r.sort_order,
      })),
    });
  } catch (err) {
    console.error("Container prefs error:", err);
    res.status(500).json({ error: "Failed to fetch container prefs" });
  }
});

// PUT /api/container-prefs — batch upsert
router.put("/api/container-prefs", (req, res) => {
  try {
    const items: { server: string; project_name: string; display_name?: string; hidden?: boolean; sort_order?: number }[] = req.body.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items array required" });
      return;
    }
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO container_prefs (server, project_name, display_name, hidden, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(server, project_name) DO UPDATE SET
         display_name = excluded.display_name,
         hidden = excluded.hidden,
         sort_order = excluded.sort_order`
    );
    const tx = db.transaction(() => {
      for (const item of items) {
        stmt.run(item.server, item.project_name, item.display_name || null, item.hidden ? 1 : 0, item.sort_order ?? 0);
      }
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    console.error("Update container prefs error:", err);
    res.status(500).json({ error: "Failed to update container prefs" });
  }
});

export default router;
