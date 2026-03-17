import type { Adapter, ScreenData } from "./types";

const QBT_URL = process.env.QBT_URL || "http://host.docker.internal:8204";
const QBT_USERNAME = process.env.QBT_USERNAME || "admin";
const QBT_PASSWORD = process.env.QBT_PASSWORD || "";

let sessionCookie: string | null = null;

async function login(): Promise<void> {
  const res = await fetch(`${QBT_URL}/api/v2/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: QBT_USERNAME, password: QBT_PASSWORD }).toString(),
  });

  if (!res.ok) {
    throw new Error(`qBittorrent login failed: ${res.status}`);
  }

  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length > 0) {
    sessionCookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  } else {
    const raw = res.headers.get("set-cookie");
    if (raw) sessionCookie = raw.split(";")[0];
  }
}

async function qbtFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!sessionCookie) await login();

  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  if (sessionCookie) headers["Cookie"] = sessionCookie;

  let res = await fetch(`${QBT_URL}${path}`, { ...options, headers });

  if (res.status === 403) {
    sessionCookie = null;
    await login();
    if (sessionCookie) headers["Cookie"] = sessionCookie;
    res = await fetch(`${QBT_URL}${path}`, { ...options, headers });
  }

  return res;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function mapState(state: string): string {
  if (state === "downloading" || state === "forcedDL") return "downloading";
  if (state === "uploading" || state === "forcedUP" || state === "stalledUP") return "seeding";
  if (state === "pausedDL" || state === "pausedUP") return "paused";
  if (state === "stalledDL") return "stalled";
  if (state === "queuedDL" || state === "queuedUP") return "queued";
  if (state === "error" || state === "missingFiles") return "error";
  if (state === "checkingDL" || state === "checkingUP" || state === "checkingResumeData") return "checking";
  if (state === "metaDL") return "downloading";
  return state;
}

export class QBittorrentAdapter implements Adapter {
  async fetchData(): Promise<ScreenData> {
    try {
      const res = await qbtFetch("/api/v2/torrents/info");
      if (!res.ok) throw new Error(`qBittorrent API: ${res.status}`);

      const torrents = (await res.json()) as Array<{
        hash: string;
        name: string;
        size: number;
        progress: number;
        dlspeed: number;
        state: string;
      }>;

      const active = torrents.filter((t) => mapState(t.state) === "downloading").length;

      return {
        rows: torrents.map((t) => ({
          id: t.hash,
          name: t.name,
          size: t.size,
          progress: Math.round(t.progress * 100),
          speed: t.dlspeed > 0 ? formatSpeed(t.dlspeed) : "",
          status: mapState(t.state),
        })),
        summary: { active, total: torrents.length },
      };
    } catch (err) {
      console.error("qBittorrent adapter error:", err);
      return { rows: [], summary: { active: 0, total: 0 } };
    }
  }

  async executeAction(actionId: string, rowId?: string): Promise<{ ok: boolean; message?: string }> {
    try {
      if (actionId === "pause" && rowId) {
        const res = await qbtFetch("/api/v2/torrents/pause", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `hashes=${rowId}`,
        });
        return { ok: res.ok };
      }
      if (actionId === "resume" && rowId) {
        const res = await qbtFetch("/api/v2/torrents/resume", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `hashes=${rowId}`,
        });
        return { ok: res.ok };
      }
      if (actionId === "delete" && rowId) {
        const res = await qbtFetch("/api/v2/torrents/delete", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `hashes=${rowId}&deleteFiles=false`,
        });
        return { ok: res.ok };
      }
      return { ok: false, message: "Unknown action" };
    } catch (err) {
      return { ok: false, message: String(err) };
    }
  }
}
