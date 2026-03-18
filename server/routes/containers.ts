import { Router } from "express";
import { getDb } from "../db";
import { getAllContainers } from "../services/portainer";

const router = Router();

interface ContainerPrefRow {
  id: number;
  server: string;
  project_name: string;
  display_name: string | null;
  hidden: number;
  sort_order: number;
}

interface ServiceGroupRow {
  id: number;
  name: string;
  sort_order: number;
}

interface ServiceGroupContainerRow {
  group_id: number;
  container_name: string;
}

router.get("/api/containers", async (req, res) => {
  try {
    const raw = req.query.raw === "true";
    const servers = await getAllContainers(raw);

    if (raw) {
      res.json({ servers });
      return;
    }

    // Build service groups from DB + live container state
    const db = getDb();
    const groups = db.prepare("SELECT * FROM service_groups ORDER BY sort_order").all() as ServiceGroupRow[];
    const groupContainers = db.prepare("SELECT * FROM service_group_containers").all() as ServiceGroupContainerRow[];

    // Build a map of container_name -> group_ids
    const containerToGroups = new Map<string, number[]>();
    for (const gc of groupContainers) {
      const list = containerToGroups.get(gc.container_name) || [];
      list.push(gc.group_id);
      containerToGroups.set(gc.container_name, list);
    }

    // Build a map of group_id -> container names
    const groupToContainerNames = new Map<number, string[]>();
    for (const gc of groupContainers) {
      const list = groupToContainerNames.get(gc.group_id) || [];
      list.push(gc.container_name);
      groupToContainerNames.set(gc.group_id, list);
    }

    // Collect all live containers across all servers into a flat map by name
    const allContainers = new Map<string, { name: string; state: string }>();
    for (const server of servers) {
      for (const container of server.containers) {
        allContainers.set(container.name, { name: container.name, state: container.state });
      }
    }

    // Track which containers are assigned to at least one group
    const assignedContainers = new Set<string>();
    for (const names of groupToContainerNames.values()) {
      for (const n of names) assignedContainers.add(n);
    }

    // Build serviceGroups response
    const serviceGroups = groups.map((g) => {
      const names = groupToContainerNames.get(g.id) || [];
      const containers = names
        .map((n) => allContainers.get(n))
        .filter((c): c is { name: string; state: string } => c !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { id: g.id, name: g.name, containers };
    });

    // Ungrouped: containers not in any group
    const ungrouped = Array.from(allContainers.values())
      .filter((c) => !assignedContainers.has(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ servers, serviceGroups, ungrouped });
  } catch (err) {
    console.error("Containers error:", err);
    res.status(502).json({ error: "Failed to fetch containers" });
  }
});

// GET /api/container-prefs
router.get("/api/container-prefs", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM container_prefs ORDER BY server, sort_order").all() as ContainerPrefRow[];
    res.json({
      prefs: rows.map((r) => ({
        id: r.id,
        server: r.server,
        project_name: r.project_name,
        display_name: r.display_name,
        hidden: r.hidden === 1,
        sort_order: r.sort_order,
      })),
    });
  } catch (err) {
    console.error("Container prefs error:", err);
    res.status(500).json({ error: "Failed to fetch container prefs" });
  }
});

// PUT /api/container-prefs — batch upsert
router.put("/api/container-prefs", (req, res) => {
  try {
    const items: { server: string; project_name: string; display_name?: string; hidden?: boolean; sort_order?: number }[] = req.body.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items array required" });
      return;
    }
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO container_prefs (server, project_name, display_name, hidden, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(server, project_name) DO UPDATE SET
         display_name = excluded.display_name,
         hidden = excluded.hidden,
         sort_order = excluded.sort_order`
    );
    const tx = db.transaction(() => {
      for (const item of items) {
        stmt.run(item.server, item.project_name, item.display_name || null, item.hidden ? 1 : 0, item.sort_order ?? 0);
      }
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    console.error("Update container prefs error:", err);
    res.status(500).json({ error: "Failed to update container prefs" });
  }
});

export default router;
