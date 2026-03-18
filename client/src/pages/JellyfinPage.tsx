import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../api/client";

interface RecentItem {
  name: string;
  type: string;
  dateAdded: string;
}

interface Library {
  id: string;
  name: string;
  type: string;
  itemCount: number;
  recentItems: RecentItem[];
}

const typeLabels: Record<string, string> = {
  movies: "Movies",
  tvshows: "TV Shows",
  music: "Music",
  books: "Books",
  homevideos: "Home Videos",
  photos: "Photos",
  musicvideos: "Music Videos",
  boxsets: "Collections",
  unknown: "Library",
};

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LibraryCard({
  library,
  onRefresh,
  refreshing,
}: {
  library: Library;
  onRefresh: (id: string) => void;
  refreshing: boolean;
}) {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{library.name}</h3>
          <span className="text-[13px] font-mono text-text-tertiary">
            {typeLabels[library.type] || library.type}
          </span>
        </div>
        <button
          onClick={() => onRefresh(library.id)}
          disabled={refreshing}
          className="text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh library"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={refreshing ? "animate-spin" : ""}
          >
            <path d="M14 8A6 6 0 1 1 8 2" strokeLinecap="round" />
            <path d="M8 0l3 2-3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-3 flex-1">
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-2xl font-semibold font-mono text-text-primary">
            {library.itemCount.toLocaleString()}
          </span>
          <span className="text-[13px] text-text-tertiary font-mono">items</span>
        </div>

        {library.recentItems.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-[1px] text-text-tertiary font-medium mb-1.5">
              Recently Added
            </div>
            <div className="space-y-1">
              {library.recentItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-bg-card border border-border-subtle"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-text-primary truncate">{item.name}</div>
                  </div>
                  <span className="text-[11px] font-mono text-text-tertiary shrink-0">
                    {formatDate(item.dateAdded)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JellyfinPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadLibraries = useCallback(async () => {
    try {
      const res = await apiClient("/api/jellyfin/libraries");
      if (res.ok) setLibraries(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadLibraries, 60000);
    return () => clearInterval(interval);
  }, [loadLibraries]);

  // Clear feedback after 4s
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleRefresh = async (libraryId: string) => {
    setRefreshingId(libraryId);
    setFeedback(null);

    try {
      const res = await apiClient(`/api/jellyfin/refresh/${libraryId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback({ message: data.message, type: "success" });
      } else {
        setFeedback({
          message: data.message || data.error || "Refresh failed",
          type: "error",
        });
      }
    } catch (err) {
      setFeedback({ message: String(err), type: "error" });
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="p-6 pb-10 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jellyfin</h1>
          <p className="text-sm text-text-secondary font-mono font-light mt-0.5">
            library overview and management
          </p>
        </div>
        {feedback && (
          <div
            className={`text-[13px] font-mono px-3 py-1.5 rounded-md border ${
              feedback.type === "success"
                ? "bg-green-dim border-green/20 text-green"
                : "bg-red-dim border-red/20 text-red"
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-bg-surface border border-border-subtle rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : libraries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-tertiary text-sm">No libraries found</p>
            <p className="text-text-tertiary text-sm mt-1 font-mono font-light">
              Check Jellyfin connection and API key
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {libraries.map((lib) => (
            <LibraryCard
              key={lib.id}
              library={lib}
              onRefresh={handleRefresh}
              refreshing={refreshingId === lib.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
