import type { Adapter } from "./types";
import { QBittorrentAdapter } from "./qbittorrent";
import { TdarrQueueAdapter } from "./tdarr-queue";
import { JellyfinAdapter } from "./jellyfin";

// Registry of adapters by slug prefix
const adapters: Record<string, Adapter> = {
  qbittorrent: new QBittorrentAdapter(),
  "tdarr-queue": new TdarrQueueAdapter(),
  jellyfin: new JellyfinAdapter(),
  // tdarr-cleanup: will be added when sidecar API exists
};

export function getAdapter(slug: string): Adapter | null {
  return adapters[slug] ?? null;
}
