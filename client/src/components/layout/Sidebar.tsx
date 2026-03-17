import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const navItems = [
  { label: "Dashboard", path: "/", icon: "grid" },
  { label: "Services", path: "/services", icon: "link" },
];

function NavIcon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
    link: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
    settings: "M12 8a4 4 0 100 8 4 4 0 000-8z",
  };

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[icon] || icons.grid} />
    </svg>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();

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
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        <div className="text-[10px] uppercase tracking-[1.5px] text-text-tertiary font-medium px-3 pt-4 pb-1.5">
          Overview
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
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
                <NavIcon icon={item.icon} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
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
