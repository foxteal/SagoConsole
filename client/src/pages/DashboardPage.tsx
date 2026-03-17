import { useEffect, useState, useRef, useCallback } from "react";
import { apiClient } from "../api/client";
import ServerCard from "../components/dashboard/ServerCard";
import ContainerGrid from "../components/dashboard/ContainerGrid";
import UpdatesWidget from "../components/dashboard/UpdatesWidget";
import AlertsWidget from "../components/dashboard/AlertsWidget";

interface Drive {
  label: string;
  mountpoint: string;
  usedBytes: number;
  totalBytes: number;
  usedPercent: number;
}

interface ServerData {
  name: string;
  instance: string;
  up: boolean;
  cpuPercent: number | null;
  memoryPercent: number | null;
  tempCelsius: number | null;
  networkRxBytesPerSec: number | null;
  networkTxBytesPerSec: number | null;
  uptimeSeconds: number | null;
  drives: Drive[];
}

interface ContainerInfo {
  name: string;
  state: string;
  project: string;
}

interface ProjectGroup {
  name: string;
  containers: ContainerInfo[];
}

interface ServerContainers {
  server: string;
  total: number;
  running: number;
  projects: ProjectGroup[];
}

export default function DashboardPage() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [containerServers, setContainerServers] = useState<ServerContainers[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, containersRes] = await Promise.all([
        apiClient("/api/metrics/servers"),
        apiClient("/api/containers"),
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setServers(data.servers);
      }
      if (containersRes.ok) {
        const data = await containersRes.json();
        setContainerServers(data.servers);
      }

      setLastUpdated(Date.now());
      setSecondsAgo(0);
      setError(null);
    } catch {
      setError("Failed to fetch dashboard data");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const refresh = setInterval(fetchData, 15000);
    return () => clearInterval(refresh);
  }, [fetchData]);

  // Update "seconds ago" counter
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lastUpdated]);

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-text-tertiary font-mono font-light mt-0.5">
            {lastUpdated ? `last updated ${secondsAgo}s ago` : "loading..."}
          </p>
        </div>
      </div>
      {error && (
        <div className="bg-red/10 border border-red/20 rounded-lg p-3 mb-4 text-sm text-red">
          {error}
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {servers.map((server) => (
          <ServerCard key={server.instance} server={server} />
        ))}
      </div>
      <div className="grid grid-cols-[1fr_340px] gap-4 max-[900px]:grid-cols-1">
        {containerServers.length > 0 && <ContainerGrid servers={containerServers} />}
        <div>
          <UpdatesWidget />
          <AlertsWidget />
        </div>
      </div>
    </div>
  );
}
