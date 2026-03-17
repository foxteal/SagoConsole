import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

interface ContainerUpdate {
  name: string;
  host: string;
  versionsBehind: number | null;
}

export default function UpdatesWidget() {
  const [updates, setUpdates] = useState<ContainerUpdate[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchUpdates();
    const interval = setInterval(fetchUpdates, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-[1px] text-text-tertiary">
          Updates Available
        </span>
        {count > 0 && (
          <span className="text-amber font-mono text-xs font-semibold">
            {count}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-[11px] text-text-tertiary font-mono">Checking for updates...</p>
      ) : updates.length === 0 ? (
        <p className="text-[11px] text-text-tertiary font-mono">All containers up to date</p>
      ) : (
        <div className="flex flex-col gap-2">
          {updates.map((u) => (
            <div
              key={`${u.host}-${u.name}`}
              className="flex items-center justify-between px-2.5 py-2 bg-bg-card border border-border-subtle rounded-md"
            >
              <span className="font-mono text-[11px] text-text-primary">{u.name}</span>
              <span className="text-[10px] text-text-tertiary font-mono font-light">
                {u.host}
              </span>
            </div>
          ))}
        </div>
      )}

      <a
        href={`${window.location.protocol}//tugtainer.sagocactus.com`}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-right text-[11px] text-accent-dim font-medium mt-2 hover:text-accent transition-colors"
      >
        Open Tugtainer &rarr;
      </a>
    </div>
  );
}
