import { Router } from "express";
import { getDb } from "../db";

const router = Router();

interface DiunUpdateRow {
  id: number;
  host: string;
  image: string;
  current_digest: string | null;
  latest_digest: string | null;
  hub_link: string | null;
  platform: string | null;
  detected_at: string;
  dismissed: number;
}

router.get("/api/updates", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      "SELECT * FROM diun_updates WHERE dismissed = 0 ORDER BY detected_at DESC"
    ).all() as DiunUpdateRow[];

    const updates = rows.map((r) => ({
      id: r.id,
      name: r.image.split("/").pop()?.split(":")[0] || r.image,
      host: r.host,
      image: r.image,
      hub_link: r.hub_link,
      detected_at: r.detected_at,
    }));

    res.json({ updates, count: updates.length });
  } catch (err) {
    console.error("Updates error:", err);
    res.status(500).json({ error: "Failed to fetch updates" });
  }
});

router.post("/api/updates/:id/dismiss", (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare("UPDATE diun_updates SET dismissed = 1 WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ error: "Update not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Dismiss error:", err);
    res.status(500).json({ error: "Failed to dismiss update" });
  }
});

router.post("/api/updates/dismiss-all", (_req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE diun_updates SET dismissed = 1 WHERE dismissed = 0").run();
    res.json({ ok: true });
  } catch (err) {
    console.error("Dismiss all error:", err);
    res.status(500).json({ error: "Failed to dismiss updates" });
  }
});

export default router;
