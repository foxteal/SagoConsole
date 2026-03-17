import { Router } from "express";
import { getAllContainers } from "../services/portainer";

const router = Router();

router.get("/api/containers", async (_req, res) => {
  try {
    const servers = await getAllContainers();
    res.json({ servers });
  } catch (err) {
    console.error("Containers error:", err);
    res.status(502).json({ error: "Failed to fetch containers" });
  }
});

export default router;
