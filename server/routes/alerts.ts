import { Router } from "express";
import { getRecentAlerts, getActiveAlerts, getActiveAlertCount, dismissAlert, dismissAlerts } from "../services/alerts";

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

router.post("/api/alerts/:id/dismiss", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid alert ID" });
      return;
    }
    dismissAlert(id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Dismiss alert error:", err);
    res.status(500).json({ error: "Failed to dismiss alert" });
  }
});

router.post("/api/alerts/dismiss", (req, res) => {
  try {
    const { ids } = req.body as { ids: number[] };
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "number")) {
      res.status(400).json({ error: "Invalid alert IDs" });
      return;
    }
    dismissAlerts(ids);
    res.json({ ok: true });
  } catch (err) {
    console.error("Dismiss alerts error:", err);
    res.status(500).json({ error: "Failed to dismiss alerts" });
  }
});

export default router;
