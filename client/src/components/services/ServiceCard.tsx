interface ServiceCardProps {
  title: string;
  url: string;
  icon_url: string | null;
}

export default function ServiceCard({ title, url, icon_url }: ServiceCardProps) {
  // Extract display URL (remove protocol, trailing slash)
  const displayUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2.5 bg-bg-surface border border-border-subtle rounded-md no-underline transition-all hover:border-accent-dim hover:bg-bg-card hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
    >
      <div className="w-7 h-7 rounded-[5px] bg-bg-card flex items-center justify-center flex-shrink-0 overflow-hidden">
        {icon_url ? (
          <img
            src={icon_url}
            alt=""
            className="w-5 h-5 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-sm text-text-tertiary">?</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-text-primary truncate">{title}</div>
        <div className="text-[10px] text-text-tertiary font-mono font-light truncate">{displayUrl}</div>
      </div>
    </a>
  );
}
