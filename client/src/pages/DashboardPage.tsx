export default function DashboardPage() {
  return (
    <div className="p-6 pb-10">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Dashboard</h1>
        <p className="text-xs text-text-tertiary font-mono font-light mt-0.5">
          server metrics coming in phase 2
        </p>
      </div>
      <div className="bg-bg-surface border border-border-subtle rounded-lg p-8 text-center text-text-tertiary">
        Dashboard will show server KPIs, container status, and alerts.
      </div>
    </div>
  );
}
