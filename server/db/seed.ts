import Database from "better-sqlite3";

interface LinkSeed {
  title: string;
  url: string;
  icon_url: string;
  category: string;
  sort_order: number;
}

const links: LinkSeed[] = [
  // AI
  { title: "Open WebUI", url: "https://chat.sagocactus.com", icon_url: "https://raw.githubusercontent.com/unslothai/unsloth/main/images/ollama.png", category: "AI", sort_order: 0 },
  { title: "LiteLLM", url: "https://litellm.sagocactus.com/ui", icon_url: "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fphoenix.arize.com%2Fwp-content%2Fuploads%2F2025%2F03%2Flitellm.png&f=1&nofb=1&ipt=c91ee30b126121f9830fe52a9261476270cf556f2ca1ce18eb4fa479c0749dce", category: "AI", sort_order: 1 },

  // Media
  { title: "Jellyfin", url: "https://jelly.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/jellyfin.png", category: "Media", sort_order: 0 },
  { title: "Bazarr", url: "https://bazarr.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/bazarr.webp", category: "Media", sort_order: 1 },
  { title: "Prowlarr", url: "https://prowlarr.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/prowlarr.webp", category: "Media", sort_order: 2 },
  { title: "qBittorrent", url: "https://qbt.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/qbittorrent.webp", category: "Media", sort_order: 3 },
  { title: "Radarr", url: "https://radarr.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/radarr.webp", category: "Media", sort_order: 4 },
  { title: "Seerr", url: "https://requests.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/overseerr.webp", category: "Media", sort_order: 5 },
  { title: "Sonarr", url: "https://sonarr.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/sonarr.webp", category: "Media", sort_order: 6 },
  { title: "Tdarr", url: "https://tdarr.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/tdarr.webp", category: "Media", sort_order: 7 },
  { title: "Whisparr", url: "https://whisp.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/whisparr.webp", category: "Media", sort_order: 8 },
  { title: "Immich", url: "https://photos.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/immich.webp", category: "Media", sort_order: 9 },

  // Gaming
  { title: "Minecraft", url: "https://minecraft.sagocactus.com", icon_url: "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fgyazo.com%2Fa4abc5fdb965d1b97db38453012efc73%2Fthumb%2F1000&f=1&nofb=1&ipt=7f87b99bd323386721196bf15083e4a403fede5a999516279219c9c6a48a8809", category: "Gaming", sort_order: 0 },
  { title: "RomM", url: "https://romm.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/romm.webp", category: "Gaming", sort_order: 1 },
  { title: "Sago Servers", url: "https://servers.sagocactus.com", icon_url: "https://static-00.iconduck.com/assets.00/gamepad-icon-512x512-v0rni1jl.png", category: "Gaming", sort_order: 2 },

  // Productivity
  { title: "Nextcloud", url: "https://cloud.sagocactus.com", icon_url: "https://cdn.icon-icons.com/icons2/2699/PNG/512/nextcloud_logo_icon_168948.png", category: "Productivity", sort_order: 0 },
  { title: "Stirling PDF", url: "https://pdf.sagocactus.com", icon_url: "https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/main/docs/stirling.png", category: "Productivity", sort_order: 1 },
  { title: "Vaultwarden", url: "https://bwvault.foxteal.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/vaultwarden.webp", category: "Productivity", sort_order: 2 },

  // Projects
  { title: "APK Build", url: "https://apkbuild.sagocactus.com", icon_url: "https://static-00.iconduck.com/assets.00/android-icon-2048x2048-rrqjcm46.png", category: "Projects", sort_order: 0 },
  { title: "DueSlinger", url: "https://dueslinger.sagocactus.com", icon_url: "https://static-00.iconduck.com/assets.00/file-invoice-dollar-icon-512x512-g3ol0oih.png", category: "Projects", sort_order: 1 },
  { title: "Kijova", url: "https://kijova.sagocactus.com", icon_url: "https://static-00.iconduck.com/assets.00/film-icon-512x512-sb2bfxlr.png", category: "Projects", sort_order: 2 },
  { title: "ObsiDnD", url: "https://obsidnd.sagocactus.com", icon_url: "https://static-00.iconduck.com/assets.00/d20-icon-512x512-kl1g0whb.png", category: "Projects", sort_order: 3 },
  { title: "PSC Dashboard", url: "https://pscdashboard.foxteal.com", icon_url: "https://static-00.iconduck.com/assets.00/chart-line-icon-512x512-j10jpdyz.png", category: "Projects", sort_order: 4 },
  { title: "ThinDime", url: "https://thindime.foxteal.com", icon_url: "https://static-00.iconduck.com/assets.00/wallet-icon-512x512-ip498lkj.png", category: "Projects", sort_order: 5 },

  // Obsidian
  { title: "PSC", url: "https://192.168.90.183:8101", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/obsidian.webp", category: "Obsidian", sort_order: 0 },
  { title: "TTRPG", url: "https://192.168.90.183:8102", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/obsidian.webp", category: "Obsidian", sort_order: 1 },
  { title: "SagoCactus", url: "https://192.168.90.183:8103", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/obsidian.webp", category: "Obsidian", sort_order: 2 },

  // Monitoring
  { title: "Beszel", url: "https://status.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/beszel.webp", category: "Monitoring", sort_order: 0 },
  { title: "Uptime Kuma", url: "https://kuma.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/uptime-kuma.webp", category: "Monitoring", sort_order: 1 },

  // Infrastructure
  { title: "Backrest", url: "https://backrest.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/backrest.webp", category: "Infrastructure", sort_order: 0 },
  { title: "NPM", url: "https://npm.sagocactus.com", icon_url: "https://nginxproxymanager.com/icon.png", category: "Infrastructure", sort_order: 1 },
  { title: "Pi-hole Ava", url: "https://piava.sagocactus.com/admin/", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/pi-hole.webp", category: "Infrastructure", sort_order: 2 },
  { title: "Pi-hole Kai", url: "https://pikai.sagocactus.com/admin", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/pi-hole.webp", category: "Infrastructure", sort_order: 3 },
  { title: "Portainer", url: "https://portainer.sagocactus.com", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/portainer.webp", category: "Infrastructure", sort_order: 4 },
  { title: "Sync Ava", url: "http://192.168.90.176:8384", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/syncthing.webp", category: "Infrastructure", sort_order: 5 },
  { title: "Sync Fideo", url: "http://192.168.90.183:8384", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/syncthing.webp", category: "Infrastructure", sort_order: 6 },
  { title: "Sync Kai", url: "http://192.168.90.177:8384", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/syncthing.webp", category: "Infrastructure", sort_order: 7 },
  { title: "Twingate", url: "https://lazylab.twingate.com/", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/twingate.webp", category: "Infrastructure", sort_order: 8 },
  { title: "Cloudflare", url: "https://dash.cloudflare.com/20e9a0d7b80035e5ed9742711332e8b2/home/domains", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/cloudflare.webp", category: "Infrastructure", sort_order: 9 },
  { title: "Authentik", url: "https://auth.foxteal.com/", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/authentik.webp", category: "Infrastructure", sort_order: 10 },
  { title: "Tugtainer", url: "https://tugtainer.sagocactus.com/", icon_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/tugtainer.webp", category: "Infrastructure", sort_order: 11 },
];

export function seedLinks(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as count FROM links").get() as { count: number };
  if (count.count > 0) return;

  const insert = db.prepare(
    "INSERT INTO links (title, url, icon_url, category, sort_order) VALUES (?, ?, ?, ?, ?)"
  );

  const tx = db.transaction(() => {
    for (const link of links) {
      insert.run(link.title, link.url, link.icon_url, link.category, link.sort_order);
    }
  });

  tx();
  console.log(`Seeded ${links.length} service links`);
}

interface ScreenSeed {
  slug: string;
  name: string;
  icon: string;
  type: string;
  api_source: string;
  refresh_seconds: number;
  summary_template: string | null;
  columns: string;
  row_actions: string;
  global_actions: string;
  sort_order: number;
}

const screens: ScreenSeed[] = [
  {
    slug: "downloads",
    name: "Downloads",
    icon: "download",
    type: "data-table",
    api_source: "/api/proxy/qbittorrent",
    refresh_seconds: 10,
    summary_template: "{active} downloading, {total} total",
    columns: JSON.stringify([
      { key: "name", label: "Name", type: "text" },
      { key: "size", label: "Size", type: "filesize" },
      { key: "progress", label: "Progress", type: "progress" },
      { key: "speed", label: "Speed", type: "text" },
      { key: "status", label: "Status", type: "badge", badgeMap: { downloading: "accent", seeding: "green", paused: "amber", stalled: "red", queued: "text-secondary" } },
    ]),
    row_actions: JSON.stringify([
      { id: "pause", label: "Pause", method: "POST", url: "/api/proxy/qbittorrent/action/pause/{id}" },
      { id: "resume", label: "Resume", method: "POST", url: "/api/proxy/qbittorrent/action/resume/{id}" },
      { id: "delete", label: "Delete", method: "POST", url: "/api/proxy/qbittorrent/action/delete/{id}", confirm: true },
    ]),
    global_actions: JSON.stringify([]),
    sort_order: 1,
  },
  {
    slug: "tdarr-queue",
    name: "Tdarr Queue",
    icon: "queue",
    type: "data-table",
    api_source: "/api/proxy/tdarr-queue",
    refresh_seconds: 30,
    summary_template: "{count} items in queue",
    columns: JSON.stringify([
      { key: "file", label: "File", type: "text" },
      { key: "status", label: "Status", type: "badge", badgeMap: { transcoding: "accent", queued: "amber", error: "red", success: "green" } },
      { key: "progress", label: "Progress", type: "progress" },
      { key: "codec", label: "Codec", type: "text" },
    ]),
    row_actions: JSON.stringify([]),
    global_actions: JSON.stringify([]),
    sort_order: 2,
  },
];

const CATEGORY_ORDER = ["AI", "Media", "Gaming", "Productivity", "Projects", "Obsidian", "Monitoring", "Infrastructure"];

export function seedLinkCategories(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as count FROM link_categories").get() as { count: number };
  if (count.count > 0) return;

  const insert = db.prepare("INSERT INTO link_categories (name, sort_order) VALUES (?, ?)");
  const tx = db.transaction(() => {
    CATEGORY_ORDER.forEach((name, i) => insert.run(name, i));
  });
  tx();
  console.log(`Seeded ${CATEGORY_ORDER.length} link categories`);
}

const SERVERS = ["Fideo", "Ava", "Kai", "VPS"];
const DEFAULT_THRESHOLDS = [
  { metric: "cpu", warning_value: 80, critical_value: 95 },
  { metric: "memory", warning_value: 85, critical_value: 95 },
  { metric: "disk", warning_value: 75, critical_value: 90 },
];

export function seedAlertThresholds(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as count FROM alert_thresholds").get() as { count: number };
  if (count.count > 0) return;

  const insert = db.prepare(
    "INSERT INTO alert_thresholds (server, metric, warning_value, critical_value) VALUES (?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const server of SERVERS) {
      for (const t of DEFAULT_THRESHOLDS) {
        insert.run(server, t.metric, t.warning_value, t.critical_value);
      }
    }
  });
  tx();
  console.log(`Seeded alert thresholds for ${SERVERS.length} servers`);
}

export function seedScreens(db: Database.Database): void {
  // Remove custom screens from generic screens — now custom pages
  db.prepare("DELETE FROM screens WHERE slug = 'tdarr-cleanup'").run();
  db.prepare("DELETE FROM screens WHERE slug = 'jellyfin'").run();

  const count = db.prepare("SELECT COUNT(*) as count FROM screens").get() as { count: number };
  if (count.count > 0) return;

  const insert = db.prepare(
    `INSERT INTO screens (slug, name, icon, type, api_source, refresh_seconds, summary_template, columns, row_actions, global_actions, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    for (const s of screens) {
      insert.run(s.slug, s.name, s.icon, s.type, s.api_source, s.refresh_seconds, s.summary_template, s.columns, s.row_actions, s.global_actions, s.sort_order);
    }
  });

  tx();
  console.log(`Seeded ${screens.length} screens`);
}
