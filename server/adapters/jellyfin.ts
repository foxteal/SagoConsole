import type { Adapter, ScreenData } from "./types";

const JELLYFIN_URL = process.env.JELLYFIN_URL || "http://host.docker.internal:8096";
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || "";

function jfHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (JELLYFIN_API_KEY) {
    headers["Authorization"] = `MediaBrowser Token="${JELLYFIN_API_KEY}"`;
  }
  return headers;
}

interface JellyfinLibrary {
  ItemId: string;
  Name: string;
  CollectionType: string;
}

async function getLibraries(): Promise<JellyfinLibrary[]> {
  try {
    const res = await fetch(`${JELLYFIN_URL}/Library/VirtualFolders`, {
      headers: jfHeaders(),
    });
    if (!res.ok) return [];
    return (await res.json()) as JellyfinLibrary[];
  } catch {
    return [];
  }
}

export class JellyfinAdapter implements Adapter {
  async fetchData(): Promise<ScreenData> {
    // Action-only screen, no table data
    return { rows: [], summary: {} };
  }

  async executeAction(actionId: string): Promise<{ ok: boolean; message?: string }> {
    if (!JELLYFIN_API_KEY) {
      return { ok: false, message: "Jellyfin API key not configured" };
    }

    try {
      if (actionId === "refresh-all") {
        const res = await fetch(`${JELLYFIN_URL}/Library/Refresh`, {
          method: "POST",
          headers: jfHeaders(),
        });
        return { ok: res.ok || res.status === 204, message: "Library refresh started" };
      }

      if (actionId === "refresh-movies" || actionId === "refresh-tv") {
        const targetType = actionId === "refresh-movies" ? "movies" : "tvshows";
        const libraries = await getLibraries();
        const lib = libraries.find((l) => l.CollectionType === targetType);
        if (!lib) return { ok: false, message: `No ${targetType} library found` };

        const res = await fetch(`${JELLYFIN_URL}/Items/${lib.ItemId}/Refresh`, {
          method: "POST",
          headers: { ...jfHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ Recursive: true, RefreshLibrary: true }),
        });
        return { ok: res.ok || res.status === 204, message: `${lib.Name} refresh started` };
      }

      return { ok: false, message: "Unknown action" };
    } catch (err) {
      return { ok: false, message: String(err) };
    }
  }
}
