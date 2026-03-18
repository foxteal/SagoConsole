import { Router, Request, Response } from "express";
import { config } from "../config";
import { getDb } from "../db";

const router = Router();

const HOST_MAP: Record<string, string> = {
  fideo: "Fideo",
  ava: "Ava",
  kai: "Kai",
  vps: "VPS",
};

interface DiunPayload {
  diun_version?: string;
  hostname?: string;
  status?: string;
  provider?: string;
  image?: string;
  hub_link?: string;
  mime_type?: string;
  digest?: string;
  platform?: string;
  metadata?: Record<string, string>;
}

router.post("/api/diun/webhook", (req: Request, res: Response) => {
  const token = req.headers["x-diun-token"];
  if (!config.diun.webhookToken || token !== config.diun.webhookToken) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const body = req.body as DiunPayload;
  const status = body.status?.toLowerCase();

  // Only store new or update notifications
  if (status !== "new" && status !== "update") {
    res.json({ ok: true, skipped: true });
    return;
  }

  const hostname = body.hostname?.toLowerCase() || "unknown";
  const host = HOST_MAP[hostname] || hostname;
  const image = body.image || "unknown";

  const db = getDb();
  db.prepare(`
    INSERT INTO diun_updates (host, image, latest_digest, hub_link, platform, detected_at, dismissed)
    VALUES (?, ?, ?, ?, ?, datetime('now'), 0)
    ON CONFLICT(host, image) DO UPDATE SET
      latest_digest = excluded.latest_digest,
      hub_link = excluded.hub_link,
      platform = excluded.platform,
      detected_at = datetime('now'),
      dismissed = 0
  `).run(host, image, body.digest || null, body.hub_link || null, body.platform || null);

  console.log(`Diun: ${status} update for ${image} on ${host}`);
  res.json({ ok: true });
});

export default router;
