# Phase 6: Configuration UI

## Overview

Add a `/settings` page with 4 tabs, matching the mockup layout (200px nav sidebar + content area). Also add a "Settings" nav item pinned to the bottom of the main sidebar.

### Settings Tabs
1. **Service Links** — CRUD for service links grouped by category, with reordering
2. **Generic Screens** — Manage screen registrations (add/edit/remove screens from the Tools sidebar)
3. **Containers** — Hide containers, rename project groups, set display order
4. **Alert Thresholds** — Configure CPU/memory/disk warning levels per server

## Architecture Decisions

### Service Links
- Already have a `links` table with full schema (title, url, icon_url, category, sort_order)
- Already seeded with 68 links across 8 categories
- Need CRUD endpoints: POST, PUT, DELETE on `/api/links`
- Need reorder endpoint: `PUT /api/links/reorder` (batch update sort_order)
- Category order is currently hardcoded in `links.ts` — add a `link_categories` table for user-managed category ordering
- Frontend: category groups with link rows, drag handle (visual only — use move up/down buttons for simplicity), Edit/Delete per row, "+ Add Link" modal

### Generic Screens
- Already have a `screens` table with full schema
- Need CRUD endpoints: POST, PUT, DELETE on `/api/screens`
- Frontend: list of registered screens with edit/delete, "+ Add Screen" form
- Screen form fields: name, slug (auto-generated from name), icon (dropdown), type (data-table/action-only), API source, refresh interval, summary template, columns (JSON editor or structured form), row actions, global actions

### Container Display Preferences
- New `container_prefs` table: `project_name TEXT UNIQUE, display_name TEXT, hidden BOOLEAN DEFAULT false, sort_order INTEGER DEFAULT 0, server TEXT`
- Server-level prefs: `container_server_prefs` table: `server TEXT UNIQUE, display_name TEXT, hidden BOOLEAN DEFAULT false, sort_order INTEGER DEFAULT 0`
- Backend applies prefs when returning container data — filters hidden, applies renames, sorts
- Frontend: list servers and their project groups, toggle visibility, edit display names

### Alert Thresholds
- New `alert_thresholds` table: `id INTEGER PRIMARY KEY, server TEXT NOT NULL, metric TEXT NOT NULL, warning_value REAL, critical_value REAL, UNIQUE(server, metric)`
- Seed defaults: CPU warning 80% / critical 95%, Memory warning 85% / critical 95%, Disk warning 75% / critical 90%
- Frontend: per-server table showing metric thresholds with editable values
- Note: these thresholds are for SagoConsole's own alert generation, not Prometheus rules

## Implementation Steps

### Step 1: Database Schema Changes
- `server/db/schema.ts` — Add tables:
  - `link_categories (id, name, sort_order)`
  - `container_prefs (id, server, project_name, display_name, hidden, sort_order)`
  - `alert_thresholds (id, server, metric, warning_value, critical_value, UNIQUE(server, metric))`
- `server/db/seed.ts` — Seed:
  - `link_categories` from the existing CATEGORY_ORDER array
  - `alert_thresholds` with sensible defaults for Fideo, Ava, Kai

### Step 2: Backend — Link Management Routes
- `server/routes/links.ts` — Add to existing file:
  - `POST /api/links` — Create link (title, url, icon_url, category, sort_order)
  - `PUT /api/links/:id` — Update link
  - `DELETE /api/links/:id` — Delete link
  - `PUT /api/links/reorder` — Batch update sort_order `[{ id, sort_order }]`
  - `GET /api/link-categories` — List categories with counts
  - `POST /api/link-categories` — Create category
  - `PUT /api/link-categories/:id` — Rename / reorder category
  - `DELETE /api/link-categories/:id` — Delete category (must be empty)

### Step 3: Backend — Screen Management Routes
- `server/routes/screens.ts` — Add to existing file:
  - `POST /api/screens` — Create screen
  - `PUT /api/screens/:slug` — Update screen
  - `DELETE /api/screens/:slug` — Delete screen

### Step 4: Backend — Container Preferences Routes
- `server/routes/containers.ts` — Add to existing file:
  - `GET /api/container-prefs` — List all prefs
  - `PUT /api/container-prefs` — Batch upsert prefs `[{ server, project_name, display_name, hidden, sort_order }]`
- Modify `getAllContainers()` in `server/services/portainer.ts` to apply prefs (filter hidden, rename, sort)

### Step 5: Backend — Alert Threshold Routes
- New `server/routes/thresholds.ts`:
  - `GET /api/thresholds` — List all thresholds
  - `PUT /api/thresholds` — Batch upsert thresholds `[{ server, metric, warning_value, critical_value }]`

### Step 6: Frontend — Settings Page Shell
- `client/src/pages/SettingsPage.tsx` — 2-column layout (200px nav + content)
  - Tab state managed via URL hash or local state
  - 4 tab components imported and rendered conditionally
- Add `/settings` route in `App.tsx`
- Add "Settings" nav item pinned to bottom of sidebar (before user footer)

### Step 7: Frontend — Service Links Tab
- `client/src/components/settings/LinksSettings.tsx`
  - Category groups with expandable link lists
  - Each link row: drag handle icon, title, URL subdomain, Edit/Delete buttons
  - "+ Add Link" button → modal with form (title, url, icon_url, category dropdown)
  - Edit → same modal pre-filled
  - Delete → confirm dialog
  - Reorder via move up/down or drag (start simple with move buttons)

### Step 8: Frontend — Generic Screens Tab
- `client/src/components/settings/ScreensSettings.tsx`
  - List of registered screens with name, slug, type, refresh interval
  - "+ Add Screen" → form/modal
  - Edit/Delete per screen
  - Column editor: add/remove columns with type picker
  - Action editor: add/remove actions with URL template

### Step 9: Frontend — Containers Tab
- `client/src/components/settings/ContainersSettings.tsx`
  - Fetch current container list + prefs
  - Per server: show project groups
  - Toggle visibility (eye icon), edit display name (inline), reorder

### Step 10: Frontend — Alert Thresholds Tab
- `client/src/components/settings/ThresholdsSettings.tsx`
  - Per-server table: metric name, warning value, critical value (editable inputs)
  - Save button per server or global save

## Files to Create/Modify
```
server/db/schema.ts                          — MODIFY: Add 3 tables
server/db/seed.ts                            — MODIFY: Seed categories + thresholds
server/routes/links.ts                       — MODIFY: Add CRUD + reorder + categories
server/routes/screens.ts                     — MODIFY: Add POST/PUT/DELETE
server/routes/containers.ts                  — MODIFY: Add prefs endpoints
server/routes/thresholds.ts                  — NEW: Threshold CRUD
server/services/portainer.ts                 — MODIFY: Apply container prefs
server/index.ts                              — MODIFY: Wire threshold routes
client/src/pages/SettingsPage.tsx             — NEW: Settings shell with tab nav
client/src/components/settings/LinksSettings.tsx      — NEW
client/src/components/settings/ScreensSettings.tsx    — NEW
client/src/components/settings/ContainersSettings.tsx — NEW
client/src/components/settings/ThresholdsSettings.tsx — NEW
client/src/components/layout/Sidebar.tsx      — MODIFY: Add Settings nav item
client/src/App.tsx                            — MODIFY: Add /settings route
```
