import { useEffect, useState, useRef, useCallback } from "react";
import { apiClient } from "../api/client";
import ServerCard from "../components/dashboard/ServerCard";

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

export default function DashboardPage() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await apiClient("/api/metrics/servers");
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers);
        setLastUpdated(Date.now());
        setSecondsAgo(0);
        setError(null);
      } else {
        setError("Failed to fetch metrics");
      }
    } catch {
      setError("Failed to fetch metrics");
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const refresh = setInterval(fetchMetrics, 15000);
    return () => clearInterval(refresh);
  }, [fetchMetrics]);

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
    </div>
  );
}
