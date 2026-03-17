import { Router } from "express";
import { RommSorterAdapter } from "../adapters/romm-sorter";

const router = Router();
const adapter = new RommSorterAdapter();

router.get("/api/romm-sorter/downloads", async (_req, res) => {
  try {
    const downloads = await adapter.getDownloads();
    res.json(downloads);
  } catch (err) {
    console.error("Romm-sorter downloads error:", err);
    res.status(502).json({ error: "Failed to fetch downloads" });
  }
});

router.get("/api/romm-sorter/platforms", async (_req, res) => {
  try {
    const platforms = await adapter.getPlatforms();
    res.json(platforms);
  } catch (err) {
    console.error("Romm-sorter platforms error:", err);
    res.status(502).json({ error: "Failed to fetch platforms" });
  }
});

router.get("/api/romm-sorter/inspect/:itemPath", async (req, res) => {
  try {
    const platform = req.query.platform as string | undefined;
    const files = await adapter.inspect(String(req.params.itemPath), platform);
    res.json(files);
  } catch (err) {
    console.error("Romm-sorter inspect error:", err);
    res.status(502).json({ error: "Failed to inspect item" });
  }
});

router.post("/api/romm-sorter/process", async (req, res) => {
  try {
    const { source_path, platform, selected_files } = req.body;
    const result = await adapter.process(source_path, platform, selected_files);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("Romm-sorter process error:", err);
    res.status(500).json({ error: message });
  }
});

router.get("/api/romm-sorter/history", async (_req, res) => {
  try {
    const history = await adapter.getHistory();
    res.json(history);
  } catch (err) {
    console.error("Romm-sorter history error:", err);
    res.status(502).json({ error: "Failed to fetch history" });
  }
});

export default router;
