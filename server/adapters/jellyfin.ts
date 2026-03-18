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

interface RecentItem {
  name: string;
  type: string;
  dateAdded: string;
}

export interface LibraryDetail {
  id: string;
  name: string;
  type: string;
  itemCount: number;
  recentItems: RecentItem[];
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

export async function getLibraryDetails(): Promise<LibraryDetail[]> {
  const libraries = await getLibraries();

  const details = await Promise.all(
    libraries.map(async (lib) => {
      const [countRes, recentRes] = await Promise.all([
        fetch(
          `${JELLYFIN_URL}/Items?ParentId=${lib.ItemId}&Recursive=true&Limit=0`,
          { headers: jfHeaders() }
        ).catch(() => null),
        fetch(
          `${JELLYFIN_URL}/Items?ParentId=${lib.ItemId}&Recursive=true&SortBy=DateCreated&SortOrder=Descending&Limit=3&Fields=DateCreated`,
          { headers: jfHeaders() }
        ).catch(() => null),
      ]);

      let itemCount = 0;
      if (countRes?.ok) {
        const countData = (await countRes.json()) as { TotalRecordCount?: number };
        itemCount = countData.TotalRecordCount ?? 0;
      }

      const recentItems: RecentItem[] = [];
      if (recentRes?.ok) {
        const recentData = (await recentRes.json()) as {
          Items?: { Name?: string; Type?: string; DateCreated?: string }[];
        };
        for (const item of recentData.Items ?? []) {
          recentItems.push({
            name: item.Name ?? "Unknown",
            type: item.Type ?? "",
            dateAdded: item.DateCreated ?? "",
          });
        }
      }

      return {
        id: lib.ItemId,
        name: lib.Name,
        type: lib.CollectionType || "unknown",
        itemCount,
        recentItems,
      };
    })
  );

  return details;
}

export async function refreshLibrary(
  libraryId: string
): Promise<{ ok: boolean; message: string }> {
  if (!JELLYFIN_API_KEY) {
    return { ok: false, message: "Jellyfin API key not configured" };
  }

  try {
    const res = await fetch(`${JELLYFIN_URL}/Items/${libraryId}/Refresh`, {
      method: "POST",
      headers: { ...jfHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ Recursive: true, RefreshLibrary: true }),
    });
    return {
      ok: res.ok || res.status === 204,
      message: res.ok || res.status === 204 ? "Library refresh started" : "Refresh failed",
    };
  } catch (err) {
    return { ok: false, message: String(err) };
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
