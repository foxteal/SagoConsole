import { config } from "../config";
import { getDb } from "../db";

const PROMETHEUS_URL = "http://prometheus:9090";

interface PrometheusAlert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: string;
  activeAt: string;
  value: string;
}

interface AlertRow {
  id: number;
  source: string;
  severity: string;
  message: string;
  details: string | null;
  fired_at: string;
  resolved_at: string | null;
  fingerprint: string;
}

function severityFromLabels(labels: Record<string, string>): string {
  const sev = labels.severity || "";
  if (sev === "critical") return "critical";
  if (sev === "warning") return "warning";
  // Default based on alert name
  const name = labels.alertname || "";
  if (name.includes("Down") || name.includes("Critical")) return "critical";
  return "warning";
}

function fingerprintFromLabels(labels: Record<string, string>): string {
  // Create a stable fingerprint from alert identity labels
  const parts = [
    labels.alertname || "",
    labels.instance || "",
    labels.job || "",
    labels.mountpoint || "",
    labels.name || "",
  ].filter(Boolean);
  return parts.join(":");
}

function upsertAlert(
  source: string,
  severity: string,
  message: string,
  details: string | null,
  firedAt: string,
  fingerprint: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO alerts (source, severity, message, details, fired_at, fingerprint)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(fingerprint) DO UPDATE SET
       severity = excluded.severity,
       message = excluded.message,
       details = excluded.details,
       resolved_at = NULL`
  ).run(source, severity, message, details, firedAt, fingerprint);
}

function resolveAlert(fingerprint: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE alerts SET resolved_at = ? WHERE fingerprint = ? AND resolved_at IS NULL`
  ).run(new Date().toISOString(), fingerprint);
}

async function pollPrometheus(): Promise<void> {
  try {
    const res = await fetch(`${PROMETHEUS_URL}/api/v1/alerts`);
    if (!res.ok) {
      console.error("Prometheus alerts fetch failed:", res.status);
      return;
    }

    const data = (await res.json()) as {
      data: { alerts: PrometheusAlert[] };
    };

    const db = getDb();
    const now = new Date().toISOString();
    const activeFingerprints = new Set<string>();

    for (const alert of data.data.alerts) {
      if (alert.state !== "firing") continue;

      const fp = fingerprintFromLabels(alert.labels);
      activeFingerprints.add(fp);

      const source = (alert.labels.alertname || "prometheus").toLowerCase();
      const severity = severityFromLabels(alert.labels);
      const message =
        alert.annotations.summary ||
        alert.annotations.description ||
        `${alert.labels.alertname}: ${alert.labels.instance || "unknown"}`;
      const details = JSON.stringify({
        labels: alert.labels,
        annotations: alert.annotations,
      });
      const firedAt = alert.activeAt || now;

      upsertAlert(source, severity, message, details, firedAt, fp);
    }

    // Auto-resolve prometheus alerts that are no longer firing
    const unresolvedRows = db
      .prepare(
        `SELECT id, fingerprint FROM alerts WHERE resolved_at IS NULL AND source NOT IN ('backup', 'backrest', 'container', 'syncthing')`
      )
      .all() as Pick<AlertRow, "id" | "fingerprint">[];

    const resolve = db.prepare(
      `UPDATE alerts SET resolved_at = ? WHERE id = ?`
    );

    for (const row of unresolvedRows) {
      if (!activeFingerprints.has(row.fingerprint)) {
        resolve.run(now, row.id);
      }
    }
  } catch (err) {
    console.error("Prometheus alert poll error:", err);
  }
}

// --- Backrest Backup Monitoring ---

interface BackrestOperation {
  status: string;
  unixTimeStartMs?: string;
  unixTimeEndMs?: string;
  displayMessage?: string;
  operationError?: string;
}

interface AlertMonitorRow {
  id: number;
  type: string;
  name: string;
  enabled: number;
  config: string;
}

function getEnabledMonitors(type: string): AlertMonitorRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM alert_monitors WHERE type = ? AND enabled = 1").all(type) as AlertMonitorRow[];
}

async function pollBackrest(): Promise<void> {
  if (!config.backrest.password) return;

  const monitors = getEnabledMonitors("backrest");
  if (monitors.length === 0) return;

  const authHeader =
    "Basic " + Buffer.from(`${config.backrest.username}:${config.backrest.password}`).toString("base64");

  for (const monitor of monitors) {
    const plan = { id: "", interval: "daily" as string, graceHours: 2 };
    try {
      const parsed = JSON.parse(monitor.config);
      plan.id = parsed.planId || monitor.name;
      plan.interval = parsed.interval || "daily";
      plan.graceHours = parsed.graceHours ?? 2;
    } catch {
      plan.id = monitor.name;
    }
    try {
      const res = await fetch(`${config.backrest.url}/v1.Backrest/GetOperations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ selector: { planId: plan.id } }),
      });

      if (!res.ok) {
        console.error(`Backrest fetch for ${plan.id} failed: ${res.status}`);
        continue;
      }

      const data = (await res.json()) as { operations?: BackrestOperation[] };
      const ops = data.operations || [];

      if (ops.length === 0) continue;

      // Most recent operation first (API returns newest last typically)
      const sorted = [...ops].sort(
        (a, b) =>
          parseInt(b.unixTimeEndMs || b.unixTimeStartMs || "0") -
          parseInt(a.unixTimeEndMs || a.unixTimeStartMs || "0")
      );

      const latest = sorted[0];
      const now = Date.now();
      const fpFailed = `backrest:failed:${plan.id}`;
      const fpMissed = `backrest:missed:${plan.id}`;

      // Check for failed operation
      const isError =
        latest.status === "STATUS_ERROR" ||
        latest.status === "STATUS_SYSTEM_CANCELLED" ||
        !!latest.operationError;

      if (isError) {
        upsertAlert(
          "backrest",
          "critical",
          `Backrest ${plan.id}: last operation failed`,
          latest.operationError || latest.displayMessage || null,
          new Date().toISOString(),
          fpFailed
        );
      } else {
        resolveAlert(fpFailed);
      }

      // Check for missed schedule
      const lastSuccessOp = sorted.find(
        (op) =>
          op.status === "STATUS_SUCCESS" &&
          (op.unixTimeEndMs || op.unixTimeStartMs)
      );

      if (lastSuccessOp) {
        const lastSuccessTime = parseInt(
          lastSuccessOp.unixTimeEndMs || lastSuccessOp.unixTimeStartMs || "0"
        );
        const maxAge =
          plan.interval === "daily"
            ? 26 * 60 * 60 * 1000 // 26 hours
            : (7 * 24 + plan.graceHours) * 60 * 60 * 1000; // 7 days + grace

        if (now - lastSuccessTime > maxAge) {
          upsertAlert(
            "backrest",
            "warning",
            `Backrest ${plan.id}: missed scheduled backup`,
            `Last success: ${new Date(lastSuccessTime).toISOString()}`,
            new Date().toISOString(),
            fpMissed
          );
        } else {
          resolveAlert(fpMissed);
        }
      }
    } catch (err) {
      console.error(`Backrest poll error for ${plan.id}:`, err);
    }
  }
}

// --- Scheduled Container Monitoring (via Portainer) ---


interface PortainerContainerJson {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
}

async function pollScheduledContainers(): Promise<void> {
  try {
    const url = `${config.portainer.url}/api/endpoints/3/docker/containers/json?all=true`;
    const res = await fetch(url, {
      headers: { "X-API-Key": config.portainer.apiKey },
    });

    if (!res.ok) {
      console.error("Portainer container fetch for alerts failed:", res.status);
      return;
    }

    const containers = (await res.json()) as PortainerContainerJson[];

    const containerMap = new Map<string, PortainerContainerJson>();
    for (const c of containers) {
      const name = c.Names[0]?.replace(/^\//, "") || "";
      if (name) containerMap.set(name, c);
    }

    const monitors = getEnabledMonitors("container");
    if (monitors.length === 0) return;

    for (const { name } of monitors) {
      const c = containerMap.get(name);
      const fpMissing = `container:missing:${name}`;
      const fpDown = `container:down:${name}`;
      const fpRestarts = `container:restarts:${name}`;

      if (!c) {
        upsertAlert(
          "container",
          "warning",
          `Container "${name}" not found on Fideo`,
          null,
          new Date().toISOString(),
          fpMissing
        );
        continue;
      }

      // Container exists — resolve missing alert
      resolveAlert(fpMissing);

      if (c.State === "exited" || c.State === "dead") {
        upsertAlert(
          "container",
          "critical",
          `Container "${name}" is ${c.State}`,
          `Status: ${c.Status}`,
          new Date().toISOString(),
          fpDown
        );
      } else {
        resolveAlert(fpDown);
      }

      if (c.Status.includes("Restarting")) {
        upsertAlert(
          "container",
          "warning",
          `Container "${name}" is restart-looping`,
          `Status: ${c.Status}`,
          new Date().toISOString(),
          fpRestarts
        );
      } else {
        resolveAlert(fpRestarts);
      }
    }
  } catch (err) {
    console.error("Scheduled container poll error:", err);
  }
}

// --- Syncthing Sync Failure Monitoring ---


interface SyncthingFolderStatus {
  state: string;
  pullErrors: number;
  errors: number;
}

export async function pollSyncthing(): Promise<void> {
  if (!config.syncthing.apiKey) return;

  const monitors = getEnabledMonitors("syncthing");
  if (monitors.length === 0) return;

  for (const monitor of monitors) {
    let folderId = monitor.name;
    try {
      const parsed = JSON.parse(monitor.config);
      folderId = parsed.folderId || monitor.name;
    } catch { /* use name as fallback */ }

    const folder = { id: folderId, name: monitor.name };

    try {
      const res = await fetch(
        `${config.syncthing.url}/rest/db/status?folder=${encodeURIComponent(folder.id)}`,
        {
          headers: { "X-API-Key": config.syncthing.apiKey },
        }
      );

      if (!res.ok) {
        console.error(`Syncthing status for ${folder.name} failed: ${res.status}`);
        continue;
      }

      const status = (await res.json()) as SyncthingFolderStatus;
      const fpError = `syncthing:error:${folder.id}`;
      const fpPullErrors = `syncthing:pullerrors:${folder.id}`;

      // Skip active states
      if (status.state === "syncing" || status.state === "scanning") {
        continue;
      }

      if (status.state === "error") {
        upsertAlert(
          "syncthing",
          "critical",
          `Syncthing folder "${folder.name}" is in error state`,
          null,
          new Date().toISOString(),
          fpError
        );
      } else {
        resolveAlert(fpError);
      }

      if (status.pullErrors > 0) {
        upsertAlert(
          "syncthing",
          "warning",
          `Syncthing folder "${folder.name}" has ${status.pullErrors} pull errors`,
          null,
          new Date().toISOString(),
          fpPullErrors
        );
      } else {
        resolveAlert(fpPullErrors);
      }
    } catch (err) {
      console.error(`Syncthing poll error for ${folder.name}:`, err);
    }
  }
}

// --- Backup Logs via Portainer API ---

async function pollBackupLogs(): Promise<void> {
  try {
    // First, find the homelab-backup container ID via Portainer
    const listUrl = `${config.portainer.url}/api/endpoints/3/docker/containers/json?all=true`;
    const listRes = await fetch(listUrl, {
      headers: { "X-API-Key": config.portainer.apiKey },
    });

    if (!listRes.ok) {
      console.error("Portainer container list for backup logs failed:", listRes.status);
      return;
    }

    const containers = (await listRes.json()) as PortainerContainerJson[];
    const backup = containers.find((c) =>
      c.Names.some((n) => n.replace(/^\//, "") === "homelab-backup")
    );

    if (!backup) return;

    // Fetch last 50 lines of logs since 120s ago
    const since = Math.floor(Date.now() / 1000) - 120;
    const logsUrl = `${config.portainer.url}/api/endpoints/3/docker/containers/${backup.Id}/logs?tail=50&since=${since}&stdout=true&stderr=true`;
    const logsRes = await fetch(logsUrl, {
      headers: { "X-API-Key": config.portainer.apiKey },
    });

    if (!logsRes.ok) {
      console.error("Portainer backup logs fetch failed:", logsRes.status);
      return;
    }

    const logs = await logsRes.text();
    if (!logs.trim()) return;

    const db = getDb();
    const now = new Date().toISOString();

    const upsert = db.prepare(`
      INSERT INTO alerts (source, severity, message, details, fired_at, fingerprint)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(fingerprint) DO NOTHING
    `);

    // Look for failure patterns — strip Docker log header bytes (first 8 bytes per line)
    const failureLines = logs
      .split("\n")
      .map((line) => (line.length > 8 ? line.slice(8) : line))
      .filter(
        (line) =>
          /fail|error|fatal/i.test(line) && !/success|completed/i.test(line)
      );

    for (const line of failureLines) {
      const trimmed = line.trim().slice(0, 200);
      if (!trimmed) continue;

      const datePrefix = now.slice(0, 10);
      const fp = `backup:${datePrefix}:${trimmed.slice(0, 80)}`;

      upsert.run("backup", "critical", `Backup: ${trimmed}`, null, now, fp);
    }
  } catch (err) {
    console.error("Backup logs poll error:", err);
  }
}

export async function pollAlerts(): Promise<void> {
  await Promise.all([
    pollPrometheus(),
    pollBackupLogs(),
    pollBackrest(),
    pollScheduledContainers(),
  ]);
}

export function getRecentAlerts(limit = 50): AlertRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM alerts ORDER BY fired_at DESC LIMIT ?`
    )
    .all(limit) as AlertRow[];
}

export function getActiveAlerts(): AlertRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM alerts WHERE resolved_at IS NULL ORDER BY fired_at DESC`
    )
    .all() as AlertRow[];
}

export function getActiveAlertCount(): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM alerts WHERE resolved_at IS NULL`)
    .get() as { count: number };
  return row.count;
}
