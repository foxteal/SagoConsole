import fs from "fs";
import path from "path";
import { getDb } from "../../db";

const TDARR_URL = process.env.TDARR_URL || "http://host.docker.internal:8265";

// Container mount paths — mapped in docker-compose.yml
const SOURCE_BASE = "/tdarr-source";
const OUTPUT_BASE = "/tdarr-output";
const LIBRARIES = ["arr-tv", "arr-movies", "arr-adult"];

// --- Types ---

export interface TdarrFile {
  id: string;
  file: string;
  fileName: string;
  library: string;
  folder: string;
  transcodeStatus: string;
  healthCheck: string;
  size: number;
  recommendedAction: "move" | "reprocess" | "none";
  activeWorker: boolean;
}

export interface CleanupHistoryItem {
  id: number;
  file_path: string;
  file_name: string;
  library: string;
  action: string;
  size: number;
  acted_at: string;
}

// --- Database ---

export function ensureTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS tdarr_cleanup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      library TEXT NOT NULL,
      action TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      acted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tdarr_cleanup_acted_at
      ON tdarr_cleanup_history(acted_at);
  `);
}

function recordHistory(filePath: string, fileName: string, library: string, action: string, size: number): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO tdarr_cleanup_history (file_path, file_name, library, action, size) VALUES (?, ?, ?, ?, ?)"
  ).run(filePath, fileName, library, action, size);
}

// --- Tdarr API ---

async function getActiveWorkerFiles(): Promise<Set<string>> {
  const active = new Set<string>();
  try {
    const res = await fetch(`${TDARR_URL}/api/v2/get-nodes`);
    if (!res.ok) return active;
    const nodes = (await res.json()) as Record<
      string,
      { workers?: Array<{ file?: string }> }
    >;
    for (const node of Object.values(nodes)) {
      if (node.workers) {
        for (const w of node.workers) {
          if (w.file) active.add(w.file);
        }
      }
    }
  } catch (err) {
    console.error("Tdarr cleanup: failed to get active workers:", err);
  }
  return active;
}

interface TdarrDbEntry {
  _id: string;
  TranscodeDecisionMaker?: string;
  HealthCheck?: string;
  container?: string;
  outputFilePath?: string;
}

async function getAllTdarrFiles(): Promise<TdarrDbEntry[]> {
  const res = await fetch(`${TDARR_URL}/api/v2/cruddb`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: { collection: "FileJSONDB", mode: "getAll" },
    }),
  });
  if (!res.ok) throw new Error(`Tdarr cruddb: ${res.status}`);
  const data = (await res.json()) as Record<string, TdarrDbEntry>;
  // API returns object keyed by _id
  return Object.values(data);
}

function getFileSize(filePath: string): number {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

function getFolderSize(folderPath: string): number {
  try {
    let total = 0;
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        total += getFolderSize(full);
      } else {
        total += fs.statSync(full).size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

// --- Core logic ---

export async function fetchFiles(): Promise<TdarrFile[]> {
  const [activeFiles, allFiles] = await Promise.all([
    getActiveWorkerFiles(),
    getAllTdarrFiles(),
  ]);

  const results: TdarrFile[] = [];

  for (const entry of allFiles) {
    if (!entry.TranscodeDecisionMaker || !entry._id) continue;

    const filePath = entry._id;
    const isActive = activeFiles.has(filePath);

    // Extract library prefix from path like /source/arr-tv/...
    const libMatch = filePath.match(/^\/source\/([^/]+)\//);
    if (!libMatch) continue;
    const library = libMatch[1];
    if (!LIBRARIES.includes(library)) continue;

    // Map to container mount paths
    const containerPath = filePath.replace(
      `/source/${library}`,
      `${SOURCE_BASE}/${library}`
    );

    // Check if file actually exists on disk
    if (!fs.existsSync(containerPath)) continue;

    const relPath = filePath.replace(`/source/${library}/`, "");
    const folder = path.dirname(relPath);
    const fileName = path.basename(relPath);

    const transcodeStatus = entry.TranscodeDecisionMaker;
    const healthCheck = entry.HealthCheck || "unknown";

    let recommendedAction: TdarrFile["recommendedAction"] = "none";
    if (isActive) {
      recommendedAction = "none";
    } else if (
      transcodeStatus === "Not required" &&
      healthCheck === "Success"
    ) {
      recommendedAction = "move";
    } else if (transcodeStatus === "Transcode error") {
      recommendedAction = "reprocess";
    }

    // Only show actionable files (skip files with no recommended action unless active)
    if (recommendedAction === "none" && !isActive) continue;

    results.push({
      id: filePath,
      file: relPath,
      fileName,
      library,
      folder,
      transcodeStatus,
      healthCheck,
      size: getFileSize(containerPath),
      recommendedAction,
      activeWorker: isActive,
    });
  }

  return results;
}

// --- Actions ---

function copyRecursiveSync(src: string, dest: string): void {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

export async function moveFile(
  fileId: string
): Promise<{ ok: boolean; message: string }> {
  const libMatch = fileId.match(/^\/source\/([^/]+)\//);
  if (!libMatch) return { ok: false, message: "Cannot determine library" };
  const library = libMatch[1];

  const relPath = fileId.replace(`/source/${library}/`, "");
  const folder = path.dirname(relPath);

  const sourceFolder = path.join(SOURCE_BASE, library, folder);
  const outputFolder = path.join(OUTPUT_BASE, library, folder);

  if (!fs.existsSync(sourceFolder)) {
    return { ok: false, message: `Source folder not found: ${folder}` };
  }

  const sourceSize = getFolderSize(sourceFolder);

  try {
    copyRecursiveSync(sourceFolder, outputFolder);

    const destSize = getFolderSize(outputFolder);
    if (sourceSize !== destSize) {
      return {
        ok: false,
        message: `Size mismatch after copy: source=${sourceSize}, dest=${destSize}`,
      };
    }

    fs.rmSync(sourceFolder, { recursive: true, force: true });

    // Clean empty parent dirs
    const parentDir = path.dirname(sourceFolder);
    try {
      const remaining = fs.readdirSync(parentDir);
      if (remaining.length === 0) {
        fs.rmdirSync(parentDir);
      }
    } catch {
      // ignore
    }

    const fileName = path.basename(relPath);
    recordHistory(fileId, fileName, library, "move", sourceSize);

    return {
      ok: true,
      message: `Moved ${folder} (${formatBytes(sourceSize)})`,
    };
  } catch (err) {
    return {
      ok: false,
      message: `Move failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function skipFile(
  fileId: string
): Promise<{ ok: boolean; message: string }> {
  const libMatch = fileId.match(/^\/source\/([^/]+)\//);
  if (!libMatch) return { ok: false, message: "Cannot determine library" };
  const library = libMatch[1];

  const relPath = fileId.replace(`/source/${library}/`, "");
  const fileName = path.basename(relPath);
  const containerPath = fileId.replace(
    `/source/${library}`,
    `${SOURCE_BASE}/${library}`
  );
  const size = getFileSize(containerPath);

  recordHistory(fileId, fileName, library, "skip", size);
  return { ok: true, message: `Skipped ${fileName}` };
}

export async function reprocessFile(
  fileId: string
): Promise<{ ok: boolean; message: string }> {
  const libMatch = fileId.match(/^\/source\/([^/]+)\//);
  if (!libMatch) return { ok: false, message: "Cannot determine library" };
  const library = libMatch[1];

  const relPath = fileId.replace(`/source/${library}/`, "");
  const fileName = path.basename(relPath);
  const containerPath = fileId.replace(
    `/source/${library}`,
    `${SOURCE_BASE}/${library}`
  );
  const size = getFileSize(containerPath);

  try {
    // Reset the file in Tdarr's DB so it gets re-queued
    const res = await fetch(`${TDARR_URL}/api/v2/cruddb`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          collection: "FileJSONDB",
          mode: "update",
          docID: fileId,
          update: {
            TranscodeDecisionMaker: "Queued",
            HealthCheck: "",
          },
        },
      }),
    });

    if (!res.ok) {
      return { ok: false, message: `Tdarr API error: ${res.status}` };
    }

    recordHistory(fileId, fileName, library, "reprocess", size);
    return { ok: true, message: `Requeued ${fileName}` };
  } catch (err) {
    return {
      ok: false,
      message: `Reprocess failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function getHistory(limit = 50): CleanupHistoryItem[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, file_path, file_name, library, action, size, acted_at FROM tdarr_cleanup_history ORDER BY acted_at DESC LIMIT ?"
    )
    .all(limit) as CleanupHistoryItem[];
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
