// Standardized types for the generic screen system

export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "badge" | "progress" | "filesize" | "timestamp";
  badgeMap?: Record<string, string>; // value → color token (e.g., "downloading" → "accent")
}

export interface ActionDef {
  id: string;
  label: string;
  method: "POST" | "DELETE";
  url: string; // Can include {id}, {hash}, etc. for row actions
  confirm?: boolean;
  inputLabel?: string; // If set, shows a text input modal
}

export interface ScreenConfig {
  id: number;
  slug: string;
  name: string;
  icon: string;
  type: "data-table" | "action-only";
  apiSource: string; // Backend adapter endpoint
  refreshSeconds: number;
  summaryTemplate: string | null; // e.g., "{total} items, {active} downloading"
  columns: ColumnDef[];
  rowActions: ActionDef[];
  globalActions: ActionDef[];
  sortOrder: number;
}

export interface ScreenRow {
  id: string;
  [key: string]: unknown;
}

export interface ScreenData {
  rows: ScreenRow[];
  summary: Record<string, string | number>; // Template variables
}

export interface Adapter {
  fetchData(): Promise<ScreenData>;
  executeAction(actionId: string, rowId?: string, input?: string): Promise<{ ok: boolean; message?: string }>;
}
