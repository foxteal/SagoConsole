import { Router, Request, Response } from "express";
import { getAdapter } from "../adapters";

const router = Router();

// Fetch data for a screen
router.get("/api/proxy/:adapter", async (req, res) => {
  const adapter = getAdapter(req.params.adapter);
  if (!adapter) {
    res.status(404).json({ error: "Adapter not found" });
    return;
  }

  try {
    const data = await adapter.fetchData();
    res.json(data);
  } catch (err) {
    console.error(`Proxy fetch error (${req.params.adapter}):`, err);
    res.status(502).json({ error: "Failed to fetch data from service" });
  }
});

// Shared action handler
async function handleAction(req: Request, res: Response) {
  const adapterName = String(req.params.adapter);
  const actionId = String(req.params.actionId);
  const rowId = req.params.rowId ? String(req.params.rowId) : undefined;

  const adapter = getAdapter(adapterName);
  if (!adapter) {
    res.status(404).json({ error: "Adapter not found" });
    return;
  }

  try {
    const result = await adapter.executeAction(actionId, rowId, req.body?.input);
    res.json(result);
  } catch (err) {
    console.error(`Proxy action error (${adapterName}/${actionId}):`, err);
    res.status(502).json({ ok: false, error: "Action failed" });
  }
}

// Execute action without row ID (global actions)
router.post("/api/proxy/:adapter/action/:actionId", handleAction);

// Execute action with row ID
router.post("/api/proxy/:adapter/action/:actionId/:rowId", handleAction);

export default router;
