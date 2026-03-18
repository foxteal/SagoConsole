import Database from "better-sqlite3";

export function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_url TEXT,
      category TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      fired_at TEXT NOT NULL,
      resolved_at TEXT,
      fingerprint TEXT UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_fired_at ON alerts(fired_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_resolved_at ON alerts(resolved_at);

    CREATE TABLE IF NOT EXISTS screens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'grid',
      type TEXT NOT NULL DEFAULT 'data-table',
      api_source TEXT NOT NULL,
      refresh_seconds INTEGER NOT NULL DEFAULT 30,
      summary_template TEXT,
      columns TEXT NOT NULL DEFAULT '[]',
      row_actions TEXT NOT NULL DEFAULT '[]',
      global_actions TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS link_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS container_prefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server TEXT NOT NULL,
      project_name TEXT NOT NULL,
      display_name TEXT,
      hidden INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(server, project_name)
    );

    CREATE TABLE IF NOT EXISTS alert_thresholds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server TEXT NOT NULL,
      metric TEXT NOT NULL,
      warning_value REAL,
      critical_value REAL,
      UNIQUE(server, metric)
    );

    CREATE TABLE IF NOT EXISTS service_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS service_group_containers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES service_groups(id) ON DELETE CASCADE,
      container_name TEXT NOT NULL,
      UNIQUE(group_id, container_name)
    );

    CREATE TABLE IF NOT EXISTS alert_monitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      config TEXT NOT NULL DEFAULT '{}',
      UNIQUE(type, name)
    );

    CREATE TABLE IF NOT EXISTS diun_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host TEXT NOT NULL,
      image TEXT NOT NULL,
      current_digest TEXT,
      latest_digest TEXT,
      hub_link TEXT,
      platform TEXT,
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      dismissed INTEGER NOT NULL DEFAULT 0,
      UNIQUE(host, image)
    );
  `);
}
