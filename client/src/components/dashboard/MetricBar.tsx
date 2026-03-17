interface MetricBarProps {
  label: string;
  value: number;
  suffix?: string;
}

function barColor(value: number): string {
  if (value >= 90) return "bg-red";
  if (value >= 70) return "bg-amber";
  if (value >= 50) return "bg-accent";
  return "bg-green";
}

export default function MetricBar({ label, value, suffix = "%" }: MetricBarProps) {
  return (
    <div className="flex items-center justify-between py-[5px]">
      <span className="text-xs text-text-tertiary font-normal min-w-[50px]">{label}</span>
      <div className="flex-1 mx-2.5 h-1 bg-bg-card rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm transition-[width] duration-600 ${barColor(value)}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-text-secondary min-w-[36px] text-right font-normal">
        {Math.round(value)}{suffix}
      </span>
    </div>
  );
}
