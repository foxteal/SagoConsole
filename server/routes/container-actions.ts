import { Router } from "express";
import {
  startContainer,
  stopContainer,
  restartContainer,
  recreateContainer,
} from "../services/portainer";

const router = Router();

router.post("/api/container-actions/:endpointId/:containerId/:action", async (req, res) => {
  const endpointId = parseInt(req.params.endpointId, 10);
  const { containerId, action } = req.params;

  if (isNaN(endpointId)) {
    res.status(400).json({ ok: false, error: "Invalid endpoint ID" });
    return;
  }

  const actions: Record<string, (eid: number, cid: string) => Promise<{ ok: boolean; error?: string }>> = {
    start: startContainer,
    stop: stopContainer,
    restart: restartContainer,
    update: recreateContainer,
  };

  const fn = actions[action];
  if (!fn) {
    res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
    return;
  }

  try {
    const result = await fn(endpointId, containerId);
    if (result.ok) {
      res.json({ ok: true, message: `${action} successful` });
    } else {
      res.status(502).json({ ok: false, error: result.error });
    }
  } catch (err) {
    console.error(`Container action ${action} error:`, err);
    res.status(502).json({ ok: false, error: `Failed to ${action} container` });
  }
});

export default router;
