import { useEffect, useState, useRef, useCallback } from "react";
import { apiClient } from "../api/client";
import ServerCard from "../components/dashboard/ServerCard";
import ContainerGrid from "../components/dashboard/ContainerGrid";
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
}

interface ServiceGroup {
  id: number;
  name: string;
  containers: ContainerInfo[];
}

export default function DashboardPage() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [ungrouped, setUngrouped] = useState<ContainerInfo[]>([]);
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
        setServiceGroups(data.serviceGroups || []);
        setUngrouped(data.ungrouped || []);
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
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-text-secondary font-mono font-light mt-0.5">
            {lastUpdated ? `last updated ${secondsAgo}s ago` : "loading..."}
          </p>
        </div>
      </div>
      {error && (
        <div className="bg-red/10 border border-red/20 rounded-lg p-3 mb-4 text-sm text-red">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {servers.length === 0 && !error ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-bg-surface border border-border-subtle rounded-lg px-[18px] py-4">
                <div className="h-5 w-24 bg-bg-card rounded animate-pulse mb-3.5" />
                <div className="h-3 w-full bg-bg-card rounded animate-pulse mb-2" />
                <div className="h-3 w-full bg-bg-card rounded animate-pulse mb-2" />
                <div className="h-px bg-border-subtle my-2" />
                <div className="h-3 w-3/4 bg-bg-card rounded animate-pulse" />
              </div>
            ))}
          </>
        ) : (
          servers.map((server) => (
            <ServerCard key={server.instance} server={server} />
          ))
        )}
      </div>
      <div className="grid grid-cols-[1fr_340px] gap-4 max-[900px]:grid-cols-1">
        {(serviceGroups.length > 0 || ungrouped.length > 0) && <ContainerGrid serviceGroups={serviceGroups} ungrouped={ungrouped} />}
        <div>
          <AlertsWidget />
        </div>
      </div>
    </div>
  );
}
