import { Router } from "express";
import { getLibraryDetails, refreshLibrary } from "../adapters/jellyfin";

const router = Router();

router.get("/api/jellyfin/libraries", async (_req, res) => {
  try {
    const libraries = await getLibraryDetails();
    res.json(libraries);
  } catch (err) {
    console.error("Jellyfin libraries error:", err);
    res.status(502).json({ error: "Failed to fetch Jellyfin libraries" });
  }
});

router.post("/api/jellyfin/refresh/:id", async (req, res) => {
  try {
    const result = await refreshLibrary(req.params.id);
    if (result.ok) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    console.error("Jellyfin refresh error:", err);
    res.status(500).json({ error: "Refresh failed" });
  }
});

export default router;
