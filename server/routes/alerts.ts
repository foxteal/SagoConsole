import { Router } from "express";
import { getRecentAlerts, getActiveAlerts, getActiveAlertCount } from "../services/alerts";

const router = Router();

router.get("/api/alerts", (_req, res) => {
  try {
    const alerts = getRecentAlerts();
    res.json({ alerts });
  } catch (err) {
    console.error("Alerts error:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.get("/api/alerts/active", (_req, res) => {
  try {
    const alerts = getActiveAlerts();
    const count = getActiveAlertCount();
    res.json({ alerts, count });
  } catch (err) {
    console.error("Active alerts error:", err);
    res.status(500).json({ error: "Failed to fetch active alerts" });
  }
});

export default router;
