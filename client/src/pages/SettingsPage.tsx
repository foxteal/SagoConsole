import { useState } from "react";
import LinksSettings from "../components/settings/LinksSettings";
import ScreensSettings from "../components/settings/ScreensSettings";
import ServiceGroupsSettings from "../components/settings/ServiceGroupsSettings";
import ThresholdsSettings from "../components/settings/ThresholdsSettings";

const tabs = [
  { id: "links", label: "Service Links" },
  { id: "screens", label: "Generic Screens" },
  { id: "containers", label: "Service Groups" },
  { id: "thresholds", label: "Alert Thresholds" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("links");

  return (
    <div className="flex h-full">
      {/* Settings nav sidebar */}
      <div className="w-[200px] min-w-[200px] border-r border-border-subtle bg-bg-base p-3 flex flex-col gap-0.5">
        <div className="text-xs uppercase tracking-[1.5px] text-text-tertiary font-medium px-3 pt-2 pb-2">
          Settings
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-all relative ${
              activeTab === tab.id
                ? "bg-accent-glow text-accent font-medium"
                : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
            }`}
          >
            {activeTab === tab.id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-accent rounded-r-sm" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6 pb-10">
        {activeTab === "links" && <LinksSettings />}
        {activeTab === "screens" && <ScreensSettings />}
        {activeTab === "containers" && <ServiceGroupsSettings />}
        {activeTab === "thresholds" && <ThresholdsSettings />}
      </div>
    </div>
  );
}
