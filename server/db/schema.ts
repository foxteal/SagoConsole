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
  `);
}
