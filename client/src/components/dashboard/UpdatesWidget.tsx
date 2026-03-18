import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";

interface ContainerUpdate {
  id: number;
  name: string;
  host: string;
  image: string;
  hub_link: string | null;
  detected_at: string;
}

export default function UpdatesWidget() {
  const [updates, setUpdates] = useState<ContainerUpdate[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUpdates = async () => {
    try {
      const res = await apiClient("/api/updates");
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates);
        setCount(data.count);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
    const interval = setInterval(fetchUpdates, 60000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = async (id: number) => {
    await apiClient(`/api/updates/${id}/dismiss`, { method: "POST" });
    fetchUpdates();
  };

  const dismissAll = async () => {
    await apiClient("/api/updates/dismiss-all", { method: "POST" });
    fetchUpdates();
  };

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-[1px] text-text-tertiary">
          Updates Available
        </span>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <>
              <span className="text-amber font-mono text-xs font-semibold">{count}</span>
              <button
                onClick={dismissAll}
                className="text-[11px] text-text-tertiary hover:text-text-secondary transition-colors font-medium"
              >
                Dismiss all
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-[13px] text-text-tertiary font-mono font-light">Checking for updates...</p>
      ) : updates.length === 0 ? (
        <p className="text-[13px] text-text-tertiary font-mono font-light">All containers up to date</p>
      ) : (
        <div className="flex flex-col gap-2">
          {updates.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between px-2.5 py-2 bg-bg-card border border-border-subtle rounded-md"
            >
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-mono text-[13px] text-text-primary font-light truncate">{u.name}</span>
                <span className="text-[11px] text-text-tertiary font-mono font-light truncate">{u.image}</span>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className="text-xs text-text-tertiary font-mono font-light">{u.host}</span>
                <button
                  onClick={() => dismiss(u.id)}
                  className="text-text-tertiary hover:text-text-secondary transition-colors"
                  title="Dismiss"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        to="/containers"
        className="block text-right text-[13px] text-accent-dim font-medium mt-2 hover:text-accent transition-colors"
      >
        View All &rarr;
      </Link>
    </div>
  );
}
