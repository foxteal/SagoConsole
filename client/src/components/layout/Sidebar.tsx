import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { apiClient } from "../../api/client";

interface ScreenNav {
  slug: string;
  name: string;
  icon: string;
}

const overviewItems = [
  { label: "Dashboard", path: "/", icon: "grid" },
  { label: "Services", path: "/services", icon: "link" },
  { label: "Alerts", path: "/alerts", icon: "alert" },
];

function NavIcon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
    link: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
    alert: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
    settings: "M12 8a4 4 0 100 8 4 4 0 000-8z",
    film: "M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5M2 2h20v20H2z",
    download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
    queue: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    play: "M5 3l14 9-14 9V3z",
    gamepad: "M6 11h4M8 9v4M15 12h.01M18 10h.01M17.32 5H6.68a4 4 0 00-3.978 3.59C2.166 12.054 2 15.554 2 17a2 2 0 004 0l1.16-3.48A2 2 0 019.06 12h5.88a2 2 0 011.9 1.52L18 17a2 2 0 004 0c0-1.446-.166-4.946-.703-8.41A4 4 0 0017.32 5z",
  };

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[icon] || icons.grid} />
    </svg>
  );
}

function NavItem({
  to,
  icon,
  label,
  end,
  badge,
}: {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13.5px] transition-all relative ${
          isActive
            ? "bg-accent-glow text-accent font-medium"
            : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-accent rounded-r-sm" />
          )}
          <NavIcon icon={icon} />
          {label}
          {badge != null && badge > 0 && (
            <span className="ml-auto bg-red-dim text-red text-[10px] font-semibold font-mono px-1.5 py-px rounded-lg">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [alertCount, setAlertCount] = useState(0);
  const [screens, setScreens] = useState<ScreenNav[]>([]);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await apiClient("/api/alerts/active");
        if (res.ok) {
          const data = await res.json();
          setAlertCount(data.count);
        }
      } catch {
        // silent
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    apiClient("/api/screens")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.screens) setScreens(data.screens);
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="w-60 min-w-[240px] bg-bg-base border-r border-border-subtle flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 pb-4 border-b border-border-subtle flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center font-mono font-semibold text-[13px] text-bg-deep shadow-[0_0_12px_rgba(45,212,191,0.25)]">
          S
        </div>
        <div>
          <div className="font-semibold text-[15px] tracking-wide text-text-primary">SagoConsole</div>
          <div className="text-[10px] text-text-tertiary tracking-[1.5px] uppercase mt-px">homelab</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-[1.5px] text-text-tertiary font-medium px-3 pt-4 pb-1.5">
          Overview
        </div>
        {overviewItems.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            icon={item.icon}
            label={item.label}
            end={item.path === "/"}
            badge={item.label === "Alerts" ? alertCount : undefined}
          />
        ))}

        <div className="text-[10px] uppercase tracking-[1.5px] text-text-tertiary font-medium px-3 pt-4 pb-1.5">
          Tools
        </div>
        <NavItem to="/romm-sorter" icon="gamepad" label="Romm Sorter" />
        {screens.map((screen) => (
          <NavItem
            key={screen.slug}
            to={`/screens/${screen.slug}`}
            icon={screen.icon}
            label={screen.name}
          />
        ))}
        {/* Settings pinned to bottom */}
        <div className="mt-auto pt-2">
          <NavItem to="/settings" icon="settings" label="Settings" />
        </div>
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-4 py-3 border-t border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-bg-card border border-border flex items-center justify-center text-[11px] font-semibold text-accent">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-text-secondary truncate">{user.username}</div>
          </div>
          <button
            onClick={logout}
            className="text-text-tertiary hover:text-text-secondary transition-colors"
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}
