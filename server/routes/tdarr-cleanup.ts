import { Router } from "express";
import {
  ensureTable,
  fetchFiles,
  moveFile,
  skipFile,
  reprocessFile,
  getHistory,
} from "../tools/tdarr-cleanup";

const router = Router();

// Ensure history table exists on first import
ensureTable();

router.get("/api/tdarr-cleanup/files", async (_req, res) => {
  try {
    const files = await fetchFiles();
    res.json(files);
  } catch (err) {
    console.error("Tdarr cleanup files error:", err);
    res.status(502).json({ error: "Failed to fetch Tdarr files" });
  }
});

router.post("/api/tdarr-cleanup/action/:action", async (req, res) => {
  const { action } = req.params;
  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: "fileId is required" });
  }

  try {
    let result: { ok: boolean; message: string };

    switch (action) {
      case "move":
        result = await moveFile(fileId);
        break;
      case "skip":
        result = await skipFile(fileId);
        break;
      case "reprocess":
        result = await reprocessFile(fileId);
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    if (result.ok) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    console.error(`Tdarr cleanup action ${action} error:`, err);
    res.status(500).json({ error: "Action failed" });
  }
});

router.get("/api/tdarr-cleanup/history", async (_req, res) => {
  try {
    const history = getHistory();
    res.json(history);
  } catch (err) {
    console.error("Tdarr cleanup history error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default router;
