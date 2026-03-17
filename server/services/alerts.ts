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

    const upsert = db.prepare(`
      INSERT INTO alerts (source, severity, message, details, fired_at, fingerprint)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(fingerprint) DO UPDATE SET
        severity = excluded.severity,
        message = excluded.message,
        details = excluded.details,
        resolved_at = NULL
    `);

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

      upsert.run(source, severity, message, details, firedAt, fp);
    }

    // Auto-resolve prometheus alerts that are no longer firing
    const unresolvedRows = db
      .prepare(
        `SELECT id, fingerprint FROM alerts WHERE resolved_at IS NULL AND source NOT IN ('backup')`
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

async function pollBackupLogs(): Promise<void> {
  // Parse backup container logs for failures
  // This runs inside the container, so we use the Docker socket if available
  // or skip if not accessible
  try {
    const { execSync } = await import("child_process");
    // Check last 50 lines of homelab-backup container via docker socket
    const logs = execSync(
      "docker logs --tail 50 --since 120s homelab-backup 2>&1",
      { timeout: 10000, encoding: "utf-8" }
    ).toString();

    if (!logs.trim()) return;

    const db = getDb();
    const now = new Date().toISOString();

    const upsert = db.prepare(`
      INSERT INTO alerts (source, severity, message, details, fired_at, fingerprint)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(fingerprint) DO NOTHING
    `);

    // Look for failure patterns
    const failureLines = logs
      .split("\n")
      .filter(
        (line) =>
          /fail|error|fatal/i.test(line) && !/success|completed/i.test(line)
      );

    for (const line of failureLines) {
      const trimmed = line.trim().slice(0, 200);
      if (!trimmed) continue;

      // Use date + message hash as fingerprint to avoid repeated inserts for same failure
      const datePrefix = now.slice(0, 10); // YYYY-MM-DD
      const fp = `backup:${datePrefix}:${trimmed.slice(0, 80)}`;

      upsert.run("backup", "critical", `Backup: ${trimmed}`, null, now, fp);
    }
  } catch {
    // Docker socket not available or container doesn't exist — skip silently
  }
}

export async function pollAlerts(): Promise<void> {
  await Promise.all([pollPrometheus(), pollBackupLogs()]);
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
