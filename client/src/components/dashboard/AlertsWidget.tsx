import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";

interface Alert {
  id: number;
  source: string;
  severity: string;
  message: string;
  fired_at: string;
  resolved_at: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await apiClient("/api/alerts");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts.slice(0, 4));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-[1px] text-text-tertiary">
          Recent Alerts
        </span>
        <Link
          to="/alerts"
          className="text-[11px] text-accent-dim font-medium hover:text-accent transition-colors"
        >
          View all &rarr;
        </Link>
      </div>

      {loading ? (
        <p className="text-[11px] text-text-tertiary font-mono">Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <p className="text-[11px] text-text-tertiary font-mono">No alerts</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="px-2.5 py-2 bg-bg-card border border-border-subtle rounded-md"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    alert.severity === "critical"
                      ? "bg-red shadow-[0_0_4px_rgba(248,113,113,0.4)]"
                      : "bg-amber shadow-[0_0_4px_rgba(251,191,36,0.3)]"
                  }`}
                />
                <span className="text-[11px] text-text-primary truncate">
                  {alert.message}
                </span>
                {alert.resolved_at && (
                  <span className="text-[9px] text-text-tertiary bg-bg-surface px-1.5 py-px rounded font-mono ml-1 shrink-0">
                    resolved
                  </span>
                )}
              </div>
              <span className="text-[10px] text-text-tertiary font-mono font-light ml-3">
                {timeAgo(alert.fired_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
