import { Router } from "express";
import { getServerMetrics } from "../services/prometheus";

const router = Router();

router.get("/api/metrics/servers", async (_req, res) => {
  try {
    const servers = await getServerMetrics();
    res.json({ servers });
  } catch (err) {
    console.error("Metrics error:", err);
    res.status(502).json({ error: "Failed to fetch metrics" });
  }
});

export default router;
