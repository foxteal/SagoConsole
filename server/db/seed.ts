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
