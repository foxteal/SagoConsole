import type { Adapter, ScreenData } from "./types";

const TDARR_URL = "http://host.docker.internal:8265";

export class TdarrQueueAdapter implements Adapter {
  async fetchData(): Promise<ScreenData> {
    try {
      // Tdarr v2 API — get staging/queue data
      const res = await fetch(`${TDARR_URL}/api/v2/get-nodes`);
      if (!res.ok) throw new Error(`Tdarr API: ${res.status}`);

      const nodes = await res.json() as Record<string, {
        workers?: Record<string, {
          _id: string;
          file: string;
          percentage: number;
          status: string;
          lastPluginDetails?: { id?: string };
          CLIType?: string;
        }>;
      }>;

      // Also get the queue files
      const queueRes = await fetch(`${TDARR_URL}/api/v2/client/status-tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            start: 0,
            pageSize: 50,
            filters: [],
            sorts: [],
            opts: { table: "table1" },
          },
        }),
      });

      const rows: ScreenData["rows"] = [];

      // Add active workers (workers is an object keyed by worker name)
      for (const node of Object.values(nodes)) {
        if (node.workers) {
          for (const w of Object.values(node.workers)) {
            rows.push({
              id: w._id,
              file: w.file?.split("/").pop() || w.file || "unknown",
              status: "transcoding",
              progress: Math.round(w.percentage || 0),
              codec: w.CLIType || "",
            });
          }
        }
      }

      // Add queued items
      if (queueRes.ok) {
        const queueData = await queueRes.json() as { array?: Array<{ _id: string; file: string; video_codec_name?: string }> };
        if (queueData.array) {
          for (const item of queueData.array) {
            rows.push({
              id: item._id,
              file: item.file?.split("/").pop() || item.file || "unknown",
              status: "queued",
              progress: 0,
              codec: item.video_codec_name || "",
            });
          }
        }
      }

      return {
        rows,
        summary: { count: rows.length },
      };
    } catch (err) {
      console.error("Tdarr queue adapter error:", err);
      return { rows: [], summary: { count: 0 } };
    }
  }

  async executeAction(): Promise<{ ok: boolean; message?: string }> {
    return { ok: false, message: "No actions available" };
  }
}
