# Phase 4: Update Summary + Alert Center

## Overview

Add two widgets to the dashboard right column (matching mockup layout):
1. **Updates Available** — containers with pending image updates (from Tugtainer)
2. **Recent Alerts** — firing/recently resolved alerts (from Prometheus + backup logs)

Also add a dedicated `/alerts` page with full alert history.

## Architecture Decisions

### Dashboard Layout Change
The mockup shows a 2-column bottom grid: Container Status (left, wide) + Widgets (right, 340px fixed). Currently containers are full-width. Phase 4 refactors the dashboard bottom into this 2-column layout.

### Tugtainer Integration
Tugtainer has OIDC-only auth (password disabled). Options:
1. **Re-enable password auth** — add `DISABLE_PASSWORD=false` to Tugtainer compose, create a service account, use `/api/auth/password/login` to get a session token. Simplest.
2. **Skip Tugtainer for now** — show a static "Open Tugtainer" link and add API integration later when Tugtainer adds API key support.

**Recommendation:** Option 1 — re-enable password auth alongside OIDC. Create a `sagoconsole` service account with a password stored in `.env`. SagoConsole backend authenticates on startup, caches the session cookie, re-authenticates on 401.

### Tugtainer API Endpoints Needed
- `POST /api/auth/password/login` — `{ username, password }` → session cookie
- `GET /api/hosts/list` — get host IDs `[{ id, name }]`
- `GET /api/containers/{host_id}/list` — returns containers with `update_available` boolean

### Prometheus Alerts
- `GET http://prometheus:9090/api/v1/alerts` — returns currently firing alerts
- `GET http://prometheus:9090/api/v1/rules?type=alert` — returns all alert rules with current state
- Existing rules: HighCPU, HighMemory, DiskSpaceLow, NodeDown, ServiceDown (in `/etc/prometheus/rules/alerts.yml`)

### Alert Storage (SQLite)
Store alerts in SQLite for history. Schema:
```sql
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,          -- 'prometheus', 'backup', 'tdarr'
  severity TEXT NOT NULL,        -- 'critical', 'warning', 'info'
  message TEXT NOT NULL,
  details TEXT,                  -- JSON blob for extra context
  fired_at TEXT NOT NULL,
  resolved_at TEXT,
  fingerprint TEXT UNIQUE        -- dedup key (prevents duplicate inserts)
);
```

### Backup Log Parsing
- Backup container: `homelab-backup`
- Check last run: `docker logs --tail 50 homelab-backup` or query backup log files
- Parse for success/failure patterns per service
- Run as part of the 60s polling cycle

### Tdarr Error Detection
- Tdarr API: `http://host.docker.internal:8265`
- Check for transcode errors in the Tdarr API
- Can be deferred to a later iteration if API is complex

## Implementation Steps

### Step 1: Backend — Alert Service
- `server/services/alerts.ts` — Alert polling service
  - Fetch Prometheus firing alerts every 60s
  - Parse backup container logs for failures
  - Upsert into SQLite alerts table (deduplicate by fingerprint)
  - Auto-resolve alerts that are no longer firing
- `server/db/schema.ts` — Add alerts table

### Step 2: Backend — Tugtainer Service
- `server/services/tugtainer.ts` — Tugtainer API client
  - Session management (login, cookie caching, re-auth on 401)
  - `getUpdates()` — fetch all hosts, list containers, filter `update_available=true`
- `server/config.ts` — Add Tugtainer URL + credentials
- `.env` — Add `TUGTAINER_URL`, `TUGTAINER_USERNAME`, `TUGTAINER_PASSWORD`

### Step 3: Backend — Routes
- `server/routes/alerts.ts`:
  - `GET /api/alerts` — returns recent alerts (last 50) from SQLite
  - `GET /api/alerts/active` — returns currently active (unresolved) alerts
- `server/routes/updates.ts`:
  - `GET /api/updates` — returns containers with updates available

### Step 4: Backend — Background Polling
- `server/index.ts` — Start alert collector interval (60s) on server boot
- Initial fetch on startup, then setInterval

### Step 5: Frontend — Dashboard Widgets
- `client/src/components/dashboard/UpdatesWidget.tsx` — Updates available list with count badge, "Open Tugtainer" link
- `client/src/components/dashboard/AlertsWidget.tsx` — Recent alerts with severity dots, timestamps, resolved badges
- Update `DashboardPage.tsx` — refactor bottom section into 2-column grid (containers left, widgets right)

### Step 6: Frontend — Alerts Page
- `client/src/pages/AlertsPage.tsx` — Full alert history table with filtering
- Add "Alerts" nav item to Sidebar with badge count for active alerts
- Add route in `App.tsx`

### Step 7: Sidebar Alert Badge
- Sidebar fetches active alert count, shows red badge on Alerts nav item (matching mockup `.nav-badge` style)

## Manual Prerequisites
1. ~~Re-enable Tugtainer password auth~~ — DONE: `DISABLE_PASSWORD=false` set, Tugtainer restarted
2. **Set Tugtainer password:** Log into Tugtainer via OIDC in browser, go to settings, set a local password. The `set_password` API requires auth so must be done via UI.
3. **Add password to `.env`:** Set `TUGTAINER_PASSWORD=<the password you set>` in `/home/skip/sagoconsole/.env`

## Environment Variables (already added to .env)
```
TUGTAINER_URL=http://host.docker.internal:9412
TUGTAINER_PASSWORD=<set after step 2>
```
Note: Tugtainer password auth doesn't use usernames — there's a single password for the local account.

## Files to Create/Modify
```
server/services/alerts.ts        — NEW: Alert collector (Prometheus + backup logs)
server/services/tugtainer.ts     — NEW: Tugtainer API client
server/routes/alerts.ts          — NEW: Alert endpoints
server/routes/updates.ts         — NEW: Updates endpoint
server/db/schema.ts              — MODIFY: Add alerts table
server/config.ts                 — MODIFY: Add Tugtainer config
server/index.ts                  — MODIFY: Wire routes + start polling
client/src/components/dashboard/UpdatesWidget.tsx  — NEW
client/src/components/dashboard/AlertsWidget.tsx   — NEW
client/src/pages/AlertsPage.tsx                    — NEW
client/src/pages/DashboardPage.tsx                 — MODIFY: 2-column layout
client/src/components/layout/Sidebar.tsx            — MODIFY: Add Alerts nav + badge
client/src/App.tsx                                  — MODIFY: Add alerts route
```
