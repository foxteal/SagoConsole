import MetricBar from "./MetricBar";
import DriveBar from "./DriveBar";

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

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `up ${days}d ${hours}h`;
  return `up ${hours}h`;
}

function formatNetRate(bytesPerSec: number): string {
  if (bytesPerSec >= 1e6) return `${(bytesPerSec / 1e6).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1e3) return `${(bytesPerSec / 1e3).toFixed(0)} KB/s`;
  return `${bytesPerSec} B/s`;
}

export default function ServerCard({ server }: { server: ServerData }) {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg px-[18px] py-4 transition-all hover:border-border hover:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="font-semibold text-[15px] flex items-center gap-2">
          <span
            className={`w-[7px] h-[7px] rounded-full ${
              server.up
                ? "bg-green shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                : "bg-red shadow-[0_0_6px_rgba(248,113,113,0.4)]"
            }`}
          />
          {server.name}
        </div>
        <div className="font-mono text-[11px] text-text-tertiary font-light">
          {server.uptimeSeconds !== null ? formatUptime(server.uptimeSeconds) : "—"}
        </div>
      </div>

      {/* CPU & Memory */}
      {server.cpuPercent !== null && <MetricBar label="CPU" value={server.cpuPercent} />}
      {server.memoryPercent !== null && <MetricBar label="Mem" value={server.memoryPercent} />}

      {/* Temp & Network */}
      <hr className="border-0 border-t border-border-subtle my-2" />
      <div className="flex justify-between py-1">
        <div className="font-mono text-[11px] text-text-tertiary flex items-center gap-1">
          &#9832; <span className="text-text-secondary">{server.tempCelsius !== null ? `${server.tempCelsius}\u00B0C` : "—"}</span>
        </div>
        <div className="font-mono text-[11px] text-text-tertiary flex items-center gap-1">
          &#8593;<span className="text-text-secondary">{server.networkTxBytesPerSec !== null ? formatNetRate(server.networkTxBytesPerSec) : "—"}</span>
          {" "}&#8595;<span className="text-text-secondary">{server.networkRxBytesPerSec !== null ? formatNetRate(server.networkRxBytesPerSec) : "—"}</span>
        </div>
      </div>

      {/* Drives */}
      {server.drives.length > 0 && (
        <>
          <hr className="border-0 border-t border-border-subtle my-2" />
          <div className="mt-1.5">
            {server.drives.map((drive) => (
              <DriveBar
                key={drive.mountpoint}
                label={drive.label}
                usedBytes={drive.usedBytes}
                totalBytes={drive.totalBytes}
                usedPercent={drive.usedPercent}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
