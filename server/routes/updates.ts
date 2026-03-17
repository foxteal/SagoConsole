import { Router } from "express";
import { getUpdates } from "../services/tugtainer";

const router = Router();

router.get("/api/updates", async (_req, res) => {
  try {
    const updates = await getUpdates();
    res.json({ updates, count: updates.length });
  } catch (err) {
    console.error("Updates error:", err);
    res.status(502).json({ error: "Failed to fetch updates" });
  }
});

export default router;
