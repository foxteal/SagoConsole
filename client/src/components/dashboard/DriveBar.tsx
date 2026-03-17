interface DriveBarProps {
  label: string;
  usedBytes: number;
  totalBytes: number;
  usedPercent: number;
}

function barColor(percent: number): string {
  if (percent >= 90) return "bg-red";
  if (percent >= 70) return "bg-amber";
  if (percent >= 50) return "bg-accent";
  return "bg-green";
}

function formatSize(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)}T`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(0)}G`;
  return `${(bytes / 1e6).toFixed(0)}M`;
}

export default function DriveBar({ label, usedBytes, totalBytes, usedPercent }: DriveBarProps) {
  return (
    <div className="flex items-center justify-between py-[3px]">
      <span className="text-xs text-text-tertiary min-w-[85px] font-mono font-light">{label}</span>
      <div className="flex-1 mx-2 h-[3px] bg-bg-card rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm ${barColor(usedPercent)}`}
          style={{ width: `${Math.min(usedPercent, 100)}%` }}
        />
      </div>
      <span className="text-xs text-text-tertiary font-mono min-w-[48px] text-right font-light">
        {formatSize(usedBytes)}/{formatSize(totalBytes)}
      </span>
    </div>
  );
}
