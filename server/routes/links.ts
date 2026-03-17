import { Router } from "express";
import { getDb } from "../db";

const router = Router();

interface LinkRow {
  id: number;
  title: string;
  url: string;
  icon_url: string | null;
  category: string;
  sort_order: number;
}

const CATEGORY_ORDER = ["AI", "Media", "Gaming", "Productivity", "Projects", "Obsidian", "Monitoring", "Infrastructure"];

router.get("/api/links", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM links ORDER BY category, sort_order").all() as LinkRow[];

  const grouped = new Map<string, LinkRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.category) || [];
    list.push(row);
    grouped.set(row.category, list);
  }

  const categories = CATEGORY_ORDER
    .filter((name) => grouped.has(name))
    .map((name) => ({
      name,
      links: grouped.get(name)!,
    }));

  // Include any categories not in the predefined order
  for (const [name, links] of grouped) {
    if (!CATEGORY_ORDER.includes(name)) {
      categories.push({ name, links });
    }
  }

  res.json({ categories });
});

export default router;
