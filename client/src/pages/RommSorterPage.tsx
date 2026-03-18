import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../api/client";

interface DownloadItem {
  path: string;
  name: string;
  size: number;
  type: string;
  is_media: boolean;
  processed: boolean;
  processed_platforms: string[];
}

interface InspectedFile {
  name: string;
  full_path: string;
  size: number;
  is_rom: boolean;
  is_junk: boolean;
  is_ambiguous: boolean;
  platform_hints: string[];
}

interface HistoryItem {
  id: number;
  source_path: string;
  dest_path: string;
  platform: string;
  file_count: number;
  files_json: string | null;
  processed_at: string | null;
}

type Platforms = Record<string, { name: string; extensions: string[] }>;

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// -- Download list panel --

function DownloadList({
  items,
  selectedPath,
  onSelect,
  onRefresh,
  loading,
}: {
  items: DownloadItem[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const romItems = items.filter((d) => !d.is_media && d.type !== "split-rar");
  const splitRarItems = items.filter((d) => d.type === "split-rar");
  const mediaItems = items.filter((d) => d.is_media);
  const [showSplitRar, setShowSplitRar] = useState(false);
  const [showMedia, setShowMedia] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle">
        <span className="text-[13px] font-medium uppercase tracking-[1px] text-text-tertiary">
          Downloads
        </span>
        <button
          onClick={onRefresh}
          className="text-text-tertiary hover:text-text-primary transition-colors"
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 8A6 6 0 1 1 8 2" strokeLinecap="round" />
            <path d="M8 0l3 2-3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-bg-card rounded-md animate-pulse" />
            ))}
          </div>
        ) : romItems.length === 0 && mediaItems.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-tertiary font-mono font-light">
            No downloads found
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {romItems.map((item) => (
              <DownloadRow key={item.path} item={item} active={selectedPath === item.path} onClick={() => onSelect(item.path)} />
            ))}
            {splitRarItems.length > 0 && (
              <div className="mt-1">
                <button
                  onClick={() => setShowSplitRar(!showSplitRar)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <svg
                    width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className={`transition-transform ${showSplitRar ? "rotate-90" : ""}`}
                  >
                    <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Split-RAR ({splitRarItems.length} items)
                </button>
                {showSplitRar && splitRarItems.map((item) => (
                  <DownloadRow key={item.path} item={item} active={selectedPath === item.path} onClick={() => onSelect(item.path)} />
                ))}
              </div>
            )}
            {mediaItems.length > 0 && (
              <div className="mt-1">
                <button
                  onClick={() => setShowMedia(!showMedia)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <svg
                    width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className={`transition-transform ${showMedia ? "rotate-90" : ""}`}
                  >
                    <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Media ({mediaItems.length} items)
                </button>
                {showMedia && mediaItems.map((item) => (
                  <DownloadRow key={item.path} item={item} active={selectedPath === item.path} onClick={() => onSelect(item.path)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadRow({ item, active, onClick }: { item: DownloadItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all ${
        active
          ? "bg-accent-glow border border-accent-dim"
          : "hover:bg-bg-card border border-transparent"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${active ? "text-accent" : "text-text-primary"}`}>
          {item.name}
        </div>
        <div className="text-[13px] text-text-tertiary font-mono">{formatSize(item.size)}</div>
      </div>
      <span className="text-[13px] font-mono px-1.5 py-px rounded bg-bg-surface border border-border-subtle text-text-tertiary shrink-0">
        {item.type === "split-rar" ? "split-rar" : item.type}
      </span>
      {item.processed && (
        <span className="text-[13px] font-mono px-1.5 py-px rounded bg-green-dim text-green shrink-0">
          {item.processed_platforms.join(", ")}
        </span>
      )}
    </button>
  );
}

// -- Inspect panel --

function InspectPanel({
  selectedPath,
  downloads,
  platforms,
  onProcessed,
}: {
  selectedPath: string | null;
  downloads: DownloadItem[];
  platforms: Platforms;
  onProcessed: () => void;
}) {
  const [files, setFiles] = useState<InspectedFile[]>([]);
  const [platform, setPlatform] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const item = downloads.find((d) => d.path === selectedPath);

  useEffect(() => {
    if (!selectedPath) return;
    setLoading(true);
    setPlatform("");
    setFeedback(null);
    apiClient(`/api/romm-sorter/inspect/${encodeURIComponent(selectedPath)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setFiles(data);
        setSelectedFiles(new Set(data.filter((f: InspectedFile) => f.is_rom).map((f: InspectedFile) => f.full_path || f.name)));
      })
      .finally(() => setLoading(false));
  }, [selectedPath]);

  const onPlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    if (!newPlatform || !selectedPath) return;
    setLoading(true);
    apiClient(`/api/romm-sorter/inspect/${encodeURIComponent(selectedPath)}?platform=${newPlatform}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setFiles(data);
        setSelectedFiles(new Set(data.filter((f: InspectedFile) => f.is_rom).map((f: InspectedFile) => f.full_path || f.name)));
      })
      .finally(() => setLoading(false));
  };

  const toggleFile = (name: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const onProcess = async () => {
    if (!selectedPath || !platform || selectedFiles.size === 0) return;
    setProcessing(true);
    setFeedback(null);
    try {
      const res = await apiClient("/api/romm-sorter/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_path: selectedPath,
          platform,
          selected_files: Array.from(selectedFiles),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ message: `Moved ${data.files_moved?.length || 0} files`, type: "success" });
        onProcessed();
      } else {
        setFeedback({ message: data.error || "Processing failed", type: "error" });
      }
    } catch (err) {
      setFeedback({ message: String(err), type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  if (!selectedPath) {
    return (
      <div className="flex items-center justify-center h-full text-center p-6">
        <div>
          <p className="text-text-tertiary text-sm">Select a download to inspect</p>
          <p className="text-text-tertiary text-sm mt-1 font-mono font-light">Click an item from the downloads list</p>
        </div>
      </div>
    );
  }

  const sorted = [...files].sort((a, b) => {
    if (a.is_rom && !b.is_rom) return -1;
    if (!a.is_rom && b.is_rom) return 1;
    if (a.is_junk && !b.is_junk) return 1;
    if (!a.is_junk && b.is_junk) return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border-subtle">
        <div className="text-sm font-semibold text-text-primary truncate">{item?.name || selectedPath}</div>
        {item && (
          <div className="text-[13px] text-text-tertiary font-mono mt-0.5">
            {item.type} &middot; {formatSize(item.size)}
          </div>
        )}
      </div>

      {/* Platform selector */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <label className="text-[13px] uppercase tracking-[1px] text-text-tertiary font-medium block mb-1">
          Platform
        </label>
        <select
          value={platform}
          onChange={(e) => onPlatformChange(e.target.value)}
          className="w-full bg-bg-surface border border-transparent rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
        >
          <option value="">Choose platform...</option>
          {Object.entries(platforms).map(([slug, info]) => (
            <option key={slug} value={slug}>
              {info.name} ({slug})
            </option>
          ))}
        </select>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-bg-card rounded-md animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-tertiary font-mono font-light">No files found</div>
        ) : (
          sorted.map((f) => (
            <div
              key={f.full_path || f.name}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${f.is_junk ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={selectedFiles.has(f.full_path || f.name)}
                onChange={() => toggleFile(f.full_path || f.name)}
                className="shrink-0 accent-accent"
              />
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${f.is_rom ? "text-accent" : "text-text-primary"}`}>
                  {f.name}
                </div>
                <div className="text-[13px] text-text-tertiary font-mono">
                  {formatSize(f.size)}
                  {f.platform_hints?.length > 0 && !f.is_rom && !f.is_junk && (
                    <> &middot; matches: {f.platform_hints.join(", ")}</>
                  )}
                </div>
              </div>
              {f.is_rom && (
                <span className="text-[13px] font-mono px-1.5 py-px rounded bg-accent-glow text-accent shrink-0">ROM</span>
              )}
              {f.is_junk && (
                <span className="text-[13px] font-mono px-1.5 py-px rounded bg-bg-surface text-text-tertiary shrink-0">junk</span>
              )}
              {f.is_ambiguous && !f.is_rom && !f.is_junk && (
                <span className="text-[13px] font-mono px-1.5 py-px rounded bg-amber-dim text-amber shrink-0">ambiguous</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Process action */}
      {platform && (
        <div className="px-3 py-2.5 border-t border-border-subtle">
          <button
            onClick={onProcess}
            disabled={processing || selectedFiles.size === 0}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-accent/10 border border-accent-dim text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
          >
            {processing
              ? "Processing..."
              : selectedFiles.size === 0
                ? "No files selected"
                : `Process ${selectedFiles.size} file${selectedFiles.size > 1 ? "s" : ""} to ${platforms[platform]?.name || platform}`}
          </button>
          {feedback && (
            <div className={`mt-1.5 text-[13px] font-mono ${feedback.type === "success" ? "text-green" : "text-red"}`}>
              {feedback.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -- History panel --

function HistoryPanel() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient("/api/romm-sorter/history")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border-subtle">
        <span className="text-[13px] font-medium uppercase tracking-[1px] text-text-tertiary">
          History
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-bg-card rounded-md animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-tertiary font-mono font-light">No history</div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {items.map((item) => (
              <div key={item.id} className="px-2 py-2 rounded-md bg-bg-card border border-border-subtle">
                <div className="text-sm text-text-primary truncate">{item.source_path}</div>
                <div className="text-[13px] text-text-tertiary font-mono mt-0.5 flex items-center gap-1.5">
                  <span>{item.file_count} file{item.file_count > 1 ? "s" : ""}</span>
                  <span>&middot;</span>
                  <span>{item.processed_at ? new Date(item.processed_at).toLocaleDateString() : ""}</span>
                  <span>&middot;</span>
                  <span className="text-accent">{item.platform}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -- Main page --

export default function RommSorterPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [platforms, setPlatforms] = useState<Platforms>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDownloads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/romm-sorter/downloads");
      if (res.ok) setDownloads(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      loadDownloads(),
      apiClient("/api/romm-sorter/platforms")
        .then((res) => (res.ok ? res.json() : {}))
        .then((data) => setPlatforms(data)),
    ]);
  }, [loadDownloads]);

  return (
    <div className="p-6 pb-10 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Romm Sorter</h1>
        <p className="text-sm text-text-secondary font-mono font-light mt-0.5">
          sort downloaded ROMs into the library
        </p>
      </div>

      <div className="flex-1 grid grid-cols-[280px_1fr_260px] gap-4 min-h-0">
        {/* Downloads */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <DownloadList
            items={downloads}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            onRefresh={loadDownloads}
            loading={loading}
          />
        </div>

        {/* Inspect */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <InspectPanel
            selectedPath={selectedPath}
            downloads={downloads}
            platforms={platforms}
            onProcessed={loadDownloads}
          />
        </div>

        {/* History */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <HistoryPanel />
        </div>
      </div>
    </div>
  );
}
