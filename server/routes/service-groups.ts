import { Router } from "express";
import { getDb } from "../db";

const router = Router();

interface ServiceGroupRow {
  id: number;
  name: string;
  sort_order: number;
}

interface ServiceGroupContainerRow {
  id: number;
  group_id: number;
  container_name: string;
}

// GET /api/service-groups — all groups with their container names
router.get("/api/service-groups", (_req, res) => {
  try {
    const db = getDb();
    const groups = db.prepare("SELECT * FROM service_groups ORDER BY sort_order").all() as ServiceGroupRow[];
    const containers = db.prepare("SELECT * FROM service_group_containers").all() as ServiceGroupContainerRow[];

    const containersByGroup = new Map<number, string[]>();
    for (const c of containers) {
      const list = containersByGroup.get(c.group_id) || [];
      list.push(c.container_name);
      containersByGroup.set(c.group_id, list);
    }

    res.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        sort_order: g.sort_order,
        containers: containersByGroup.get(g.id) || [],
      })),
    });
  } catch (err) {
    console.error("Fetch service groups error:", err);
    res.status(500).json({ error: "Failed to fetch service groups" });
  }
});

// POST /api/service-groups — create group
router.post("/api/service-groups", (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const db = getDb();
    const maxOrder = db.prepare("SELECT MAX(sort_order) as max FROM service_groups").get() as { max: number | null };
    const result = db.prepare(
      "INSERT INTO service_groups (name, sort_order) VALUES (?, ?)"
    ).run(name, (maxOrder.max ?? -1) + 1);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error("Create service group error:", err);
    res.status(500).json({ error: "Failed to create service group" });
  }
});

// PUT /api/service-groups/reorder — batch sort_order update
router.put("/api/service-groups/reorder", (req, res) => {
  try {
    const items: { id: number; sort_order: number }[] = req.body.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items array required" });
      return;
    }
    const db = getDb();
    const stmt = db.prepare("UPDATE service_groups SET sort_order = ? WHERE id = ?");
    const tx = db.transaction(() => {
      for (const item of items) {
        stmt.run(item.sort_order, item.id);
      }
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    console.error("Reorder service groups error:", err);
    res.status(500).json({ error: "Failed to reorder service groups" });
  }
});

// PUT /api/service-groups/:id — update name/sort_order
router.put("/api/service-groups/:id", (req, res) => {
  try {
    const { name, sort_order } = req.body;
    const fields: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) { fields.push("name = ?"); values.push(name); }
    if (sort_order !== undefined) { fields.push("sort_order = ?"); values.push(sort_order); }

    if (fields.length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }

    const db = getDb();
    values.push(req.params.id);
    const result = db.prepare(`UPDATE service_groups SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    if (result.changes === 0) {
      res.status(404).json({ error: "Service group not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Update service group error:", err);
    res.status(500).json({ error: "Failed to update service group" });
  }
});

// DELETE /api/service-groups/:id
router.delete("/api/service-groups/:id", (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare("DELETE FROM service_groups WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ error: "Service group not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete service group error:", err);
    res.status(500).json({ error: "Failed to delete service group" });
  }
});

// PUT /api/service-groups/:id/containers — set container list for a group
router.put("/api/service-groups/:id/containers", (req, res) => {
  try {
    const { containers } = req.body;
    if (!Array.isArray(containers)) {
      res.status(400).json({ error: "containers array required" });
      return;
    }
    const db = getDb();
    const groupId = Number(req.params.id);

    // Verify group exists
    const group = db.prepare("SELECT id FROM service_groups WHERE id = ?").get(groupId);
    if (!group) {
      res.status(404).json({ error: "Service group not found" });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare("DELETE FROM service_group_containers WHERE group_id = ?").run(groupId);
      const stmt = db.prepare("INSERT INTO service_group_containers (group_id, container_name) VALUES (?, ?)");
      for (const name of containers) {
        stmt.run(groupId, name);
      }
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    console.error("Update service group containers error:", err);
    res.status(500).json({ error: "Failed to update containers" });
  }
});

export default router;
