const PROMETHEUS_URL = "http://prometheus:9090";

interface PrometheusResult {
  metric: Record<string, string>;
  value: [number, string];
}

async function query(promql: string): Promise<PrometheusResult[]> {
  const url = `${PROMETHEUS_URL}/api/v1/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query: promql }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Prometheus query failed: ${res.status}`);
  }

  const data = await res.json() as { data: { result: PrometheusResult[] } };
  return data.data.result;
}

function val(results: PrometheusResult[], labels?: Record<string, string>): number | null {
  const match = labels
    ? results.find((r) =>
        Object.entries(labels).every(([k, v]) => r.metric[k] === v)
      )
    : results[0];
  return match ? parseFloat(match.value[1]) : null;
}

// Server definitions with drive label mappings
interface ServerDef {
  name: string;
  instance: string;
  drives: { mountpoint: string; label: string }[];
}

const SERVERS: ServerDef[] = [
  {
    name: "Fideo",
    instance: "fideo",
    drives: [
      { mountpoint: "/", label: "OS" },
      { mountpoint: "/docker-storage", label: "Docker NVMe" },
      { mountpoint: "/nas/media", label: "DAS Media" },
      { mountpoint: "/mnt/external", label: "Nextcloud" },
    ],
  },
  {
    name: "Ava",
    instance: "ava",
    drives: [
      { mountpoint: "/", label: "OS" },
    ],
  },
  {
    name: "Kai",
    instance: "kai",
    drives: [
      { mountpoint: "/", label: "OS" },
    ],
  },
  {
    name: "VPS",
    instance: "vps",
    drives: [
      { mountpoint: "/", label: "OS" },
    ],
  },
];

export interface DriveMetrics {
  label: string;
  mountpoint: string;
  usedBytes: number;
  totalBytes: number;
  usedPercent: number;
}

export interface ServerMetrics {
  name: string;
  instance: string;
  up: boolean;
  cpuPercent: number | null;
  memoryPercent: number | null;
  tempCelsius: number | null;
  networkRxBytesPerSec: number | null;
  networkTxBytesPerSec: number | null;
  uptimeSeconds: number | null;
  drives: DriveMetrics[];
}

export async function getServerMetrics(): Promise<ServerMetrics[]> {
  // Run all Prometheus queries in parallel
  const [
    cpuResults,
    memTotalResults,
    memAvailResults,
    tempResults,
    netRxResults,
    netTxResults,
    uptimeResults,
    fsSizeResults,
    fsAvailResults,
  ] = await Promise.all([
    // CPU: 1 - idle rate over 1 minute
    query('100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'),
    query("node_memory_MemTotal_bytes"),
    query("node_memory_MemAvailable_bytes"),
    // CPU package temp (coretemp sensor=temp1 is package temp, k10temp for AMD)
    query('max by (instance) (node_hwmon_temp_celsius{chip=~".*coretemp.*|.*k10temp.*",sensor="temp1"})'),
    // Network RX rate (exclude loopback)
    query('sum by (instance) (rate(node_network_receive_bytes_total{device!="lo"}[1m]))'),
    // Network TX rate (exclude loopback)
    query('sum by (instance) (rate(node_network_transmit_bytes_total{device!="lo"}[1m]))'),
    // Uptime from boot time
    query("node_boot_time_seconds"),
    query('node_filesystem_size_bytes{fstype=~"ext4|xfs|btrfs",mountpoint!="/boot"}'),
    query('node_filesystem_avail_bytes{fstype=~"ext4|xfs|btrfs",mountpoint!="/boot"}'),
  ]);

  const now = Date.now() / 1000;

  return SERVERS.map((server) => {
    const inst = server.instance;
    const filter = (results: PrometheusResult[]) =>
      results.filter((r) => r.metric.instance === inst);

    const cpu = val(filter(cpuResults));
    const memTotal = val(filter(memTotalResults));
    const memAvail = val(filter(memAvailResults));
    const memPercent = memTotal && memAvail ? ((memTotal - memAvail) / memTotal) * 100 : null;
    const temp = val(filter(tempResults));
    const netRx = val(filter(netRxResults));
    const netTx = val(filter(netTxResults));
    const bootTime = val(filter(uptimeResults));
    const uptime = bootTime ? now - bootTime : null;

    const drives: DriveMetrics[] = server.drives.map((drive) => {
      const sizeMatch = fsSizeResults.find(
        (r) => r.metric.instance === inst && r.metric.mountpoint === drive.mountpoint
      );
      const availMatch = fsAvailResults.find(
        (r) => r.metric.instance === inst && r.metric.mountpoint === drive.mountpoint
      );

      const total = sizeMatch ? parseFloat(sizeMatch.value[1]) : 0;
      const avail = availMatch ? parseFloat(availMatch.value[1]) : 0;
      const used = total - avail;

      return {
        label: drive.label,
        mountpoint: drive.mountpoint,
        usedBytes: used,
        totalBytes: total,
        usedPercent: total > 0 ? (used / total) * 100 : 0,
      };
    });

    return {
      name: server.name,
      instance: inst,
      up: cpu !== null,
      cpuPercent: cpu !== null ? Math.round(cpu * 10) / 10 : null,
      memoryPercent: memPercent !== null ? Math.round(memPercent * 10) / 10 : null,
      tempCelsius: temp !== null ? Math.round(temp) : null,
      networkRxBytesPerSec: netRx !== null ? Math.round(netRx) : null,
      networkTxBytesPerSec: netTx !== null ? Math.round(netTx) : null,
      uptimeSeconds: uptime !== null ? Math.round(uptime) : null,
      drives,
    };
  });
}
