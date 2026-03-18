import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../api/client";

interface TdarrFile {
  id: string;
  file: string;
  fileName: string;
  library: string;
  folder: string;
  transcodeStatus: string;
  healthCheck: string;
  size: number;
  arrivedAt: string | null;
  recommendedAction: "move" | "reprocess" | "none";
  activeWorker: boolean;
}

interface HistoryItem {
  id: number;
  file_path: string;
  file_name: string;
  library: string;
  action: string;
  size: number;
  acted_at: string;
}

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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const libraryLabels: Record<string, string> = {
  "arr-tv": "TV",
  "arr-movies": "Movies",
  "arr-adult": "Adult",
};

const actionBadge: Record<string, { label: string; class: string }> = {
  move: { label: "Move", class: "bg-green-dim text-green" },
  reprocess: { label: "Reprocess", class: "bg-amber-dim text-amber" },
  none: { label: "Processing", class: "bg-accent-glow text-accent" },
};

const historyBadge: Record<string, { label: string; class: string }> = {
  move: { label: "Moved", class: "bg-green-dim text-green" },
  skip: { label: "Skipped", class: "bg-bg-surface text-text-tertiary" },
  reprocess: { label: "Reprocessed", class: "bg-amber-dim text-amber" },
};

// --- File Table ---

function FileTable({
  files,
  loading,
  onAction,
  actionInProgress,
  onRefresh,
}: {
  files: TdarrFile[];
  loading: boolean;
  onAction: (fileId: string, action: string) => void;
  actionInProgress: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium uppercase tracking-[1px] text-text-tertiary">
            Pending Files
          </span>
          {!loading && (
            <span className="text-[13px] font-mono text-text-tertiary">
              {files.length} item{files.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="text-text-tertiary hover:text-text-primary transition-colors"
          title="Refresh"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M14 8A6 6 0 1 1 8 2" strokeLinecap="round" />
            <path
              d="M8 0l3 2-3 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-bg-card rounded-md animate-pulse" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-text-tertiary text-sm">No files pending action</p>
            <p className="text-text-tertiary text-sm mt-1 font-mono font-light">
              Files appear here when Tdarr marks them as completed or errored
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[13px] uppercase tracking-[1px] text-text-tertiary font-medium border-b border-border-subtle">
                <th className="text-left px-4 py-2.5">File</th>
                <th className="text-left px-4 py-2.5 w-24">Library</th>
                <th className="text-left px-4 py-2.5 w-32">Status</th>
                <th className="text-right px-4 py-2.5 w-24">Size</th>
                <th className="text-left px-4 py-2.5 w-36">Arrived</th>
                <th className="text-left px-4 py-2.5 w-28">Recommended</th>
                <th className="text-right px-4 py-2.5 w-56">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const badge = actionBadge[file.recommendedAction];
                const isProcessing = actionInProgress === file.id;

                return (
                  <tr
                    key={file.id}
                    className="border-b border-border-subtle hover:bg-bg-card/50 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="text-sm text-text-primary truncate max-w-md" title={file.file}>
                        {file.folder === "." ? file.fileName : file.folder}
                      </div>
                      {file.folder !== "." && (
                        <div className="text-[13px] text-text-tertiary font-mono truncate max-w-md">
                          {file.fileName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[13px] font-mono px-1.5 py-px rounded bg-bg-surface border border-border-subtle text-text-tertiary">
                        {libraryLabels[file.library] || file.library}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-[13px] font-mono text-text-secondary">
                        {file.transcodeStatus}
                      </div>
                      <div className="text-[13px] font-mono text-text-tertiary">
                        {file.healthCheck}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-[13px] font-mono text-text-tertiary">
                        {formatSize(file.size)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[13px] font-mono text-text-tertiary">
                        {file.arrivedAt ? formatDate(file.arrivedAt) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[13px] font-mono px-1.5 py-px rounded ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {file.activeWorker ? (
                        <span className="text-[13px] font-mono text-accent animate-pulse">
                          Transcoding...
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <ActionButton
                            label="Move"
                            variant="green"
                            disabled={isProcessing}
                            onClick={() => onAction(file.id, "move")}
                            highlight={file.recommendedAction === "move"}
                          />
                          <ActionButton
                            label="Skip"
                            variant="neutral"
                            disabled={isProcessing}
                            onClick={() => onAction(file.id, "skip")}
                          />
                          <ActionButton
                            label="Reprocess"
                            variant="amber"
                            disabled={isProcessing}
                            onClick={() => onAction(file.id, "reprocess")}
                            highlight={file.recommendedAction === "reprocess"}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  variant,
  disabled,
  onClick,
  highlight,
}: {
  label: string;
  variant: "green" | "amber" | "neutral";
  disabled: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  const styles = {
    green: highlight
      ? "bg-green-dim border-green/30 text-green hover:bg-green/20"
      : "bg-bg-surface border-border-subtle text-green hover:bg-green-dim",
    amber: highlight
      ? "bg-amber-dim border-amber/30 text-amber hover:bg-amber/20"
      : "bg-bg-surface border-border-subtle text-amber hover:bg-amber-dim",
    neutral:
      "bg-bg-surface border-border-subtle text-text-tertiary hover:bg-bg-card hover:text-text-secondary",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-md text-[13px] font-medium border transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {label}
    </button>
  );
}

// --- History Panel ---

function HistoryPanel({ items, loading }: { items: HistoryItem[]; loading: boolean }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border-subtle">
        <span className="text-[13px] font-medium uppercase tracking-[1px] text-text-tertiary">
          History
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-bg-card rounded-md animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-tertiary font-mono font-light">
            No actions taken yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {items.map((item) => {
              const badge = historyBadge[item.action] || historyBadge.skip;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md bg-bg-card border border-border-subtle"
                >
                  <span className={`text-[13px] font-mono px-1.5 py-px rounded shrink-0 ${badge.class}`}>
                    {badge.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">
                      {item.file_name}
                    </div>
                    <div className="text-[13px] text-text-tertiary font-mono">
                      {libraryLabels[item.library] || item.library}
                      {" \u00b7 "}
                      {formatSize(item.size)}
                    </div>
                  </div>
                  <span className="text-[13px] font-mono text-text-tertiary shrink-0">
                    {formatDate(item.acted_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page ---

export default function TdarrCleanupPage() {
  const [files, setFiles] = useState<TdarrFile[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await apiClient("/api/tdarr-cleanup/files");
      if (res.ok) setFiles(await res.json());
    } catch {
      // silent
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await apiClient("/api/tdarr-cleanup/history");
      if (res.ok) setHistory(await res.json());
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
    loadHistory();
  }, [loadFiles, loadHistory]);

  // Auto-refresh files every 30s
  useEffect(() => {
    const interval = setInterval(loadFiles, 30000);
    return () => clearInterval(interval);
  }, [loadFiles]);

  const handleAction = async (fileId: string, action: string) => {
    setActionInProgress(fileId);
    setFeedback(null);

    try {
      const res = await apiClient(`/api/tdarr-cleanup/action/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback({ message: data.message, type: "success" });
        // Refresh both panels
        await Promise.all([loadFiles(), loadHistory()]);
      } else {
        setFeedback({
          message: data.message || data.error || "Action failed",
          type: "error",
        });
      }
    } catch (err) {
      setFeedback({ message: String(err), type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="p-6 pb-10 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tdarr Cleanup
          </h1>
          <p className="text-sm text-text-secondary font-mono font-light mt-0.5">
            manage completed and errored transcodes
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

      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Main file table */}
        <div className="flex-1 bg-bg-surface border border-border-subtle rounded-lg overflow-hidden min-h-0">
          <FileTable
            files={files}
            loading={loadingFiles}
            onAction={handleAction}
            actionInProgress={actionInProgress}
            onRefresh={loadFiles}
          />
        </div>

        {/* History panel */}
        <div className="h-64 shrink-0 bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <HistoryPanel items={history} loading={loadingHistory} />
        </div>
      </div>
    </div>
  );
}
