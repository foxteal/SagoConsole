import type { Adapter, ScreenData } from "./types";

const ROMM_SORTER_URL = process.env.ROMM_SORTER_URL || "http://host.docker.internal:8082";

async function rsFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${ROMM_SORTER_URL}${path}`, options);
}

export interface DownloadItem {
  path: string;
  name: string;
  size: number;
  type: string;
  is_media: boolean;
  processed: boolean;
  processed_platforms: string[];
}

export interface InspectedFile {
  name: string;
  full_path: string;
  size: number;
  is_rom: boolean;
  is_junk: boolean;
  is_ambiguous: boolean;
  platform_hints: string[];
}

export interface HistoryItem {
  id: number;
  source_path: string;
  dest_path: string;
  platform: string;
  file_count: number;
  files_json: string | null;
  processed_at: string | null;
  notes: string | null;
}

export class RommSorterAdapter implements Adapter {
  async fetchData(): Promise<ScreenData> {
    // Not used — custom screen fetches via specific endpoints
    return { rows: [], summary: {} };
  }

  async executeAction(): Promise<{ ok: boolean; message?: string }> {
    return { ok: false, message: "Use specific endpoints" };
  }

  async getDownloads(): Promise<DownloadItem[]> {
    const res = await rsFetch("/api/downloads");
    if (!res.ok) throw new Error(`romm-sorter downloads: ${res.status}`);
    return await res.json() as DownloadItem[];
  }

  async getPlatforms(): Promise<Record<string, { name: string; extensions: string[] }>> {
    const res = await rsFetch("/api/platforms");
    if (!res.ok) throw new Error(`romm-sorter platforms: ${res.status}`);
    return await res.json() as Record<string, { name: string; extensions: string[] }>;
  }

  async inspect(itemPath: string, platform?: string): Promise<InspectedFile[]> {
    const url = platform
      ? `/api/inspect/${encodeURIComponent(itemPath)}?platform=${platform}`
      : `/api/inspect/${encodeURIComponent(itemPath)}`;
    const res = await rsFetch(url);
    if (!res.ok) throw new Error(`romm-sorter inspect: ${res.status}`);
    return await res.json() as InspectedFile[];
  }

  async process(sourcePath: string, platform: string, selectedFiles: string[]): Promise<{ files_moved: string[]; scan_triggered: boolean }> {
    const res = await rsFetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_path: sourcePath, platform, selected_files: selectedFiles }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error || `Process failed: ${res.status}`);
    }
    return await res.json() as { files_moved: string[]; scan_triggered: boolean };
  }

  async getHistory(): Promise<HistoryItem[]> {
    const res = await rsFetch("/api/history");
    if (!res.ok) throw new Error(`romm-sorter history: ${res.status}`);
    return await res.json() as HistoryItem[];
  }
}
