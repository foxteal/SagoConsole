import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "../config";
import { createTables } from "./schema";
import { seedLinks } from "./seed";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    createTables(db);
    seedLinks(db);
  }
  return db;
}
