import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { config } from "../config.js";
import * as schema from "./schema.js";

type AppDb = ReturnType<typeof drizzle<typeof schema>>;

let sqlite: Database.Database | undefined;
let db: AppDb | undefined;

export function initDb(): AppDb {
  if (db) {
    return db;
  }
  if (config.sqlitePath !== ":memory:") {
    fs.mkdirSync(path.dirname(config.sqlitePath), { recursive: true });
  }
  sqlite = new Database(config.sqlitePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email_hash TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS diet_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_diet_profiles_user ON diet_profiles(user_id);

    CREATE TABLE IF NOT EXISTS diet_profile_nutrients (
      id TEXT PRIMARY KEY,
      diet_profile_id TEXT NOT NULL REFERENCES diet_profiles(id) ON DELETE CASCADE,
      nutrient TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_diet_nutrients_profile ON diet_profile_nutrients(diet_profile_id);

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      upc TEXT,
      brand TEXT,
      ingredients TEXT NOT NULL DEFAULT '',
      nutrition_json TEXT NOT NULL DEFAULT '{}',
      source_type TEXT NOT NULL DEFAULT 'manual',
      image_url TEXT,
      notes TEXT NOT NULL DEFAULT '',
      listing_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS products_user_upc ON products(user_id, upc) WHERE upc IS NOT NULL;

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);

    CREATE TABLE IF NOT EXISTS product_stores (
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, store_id)
    );

    CREATE TABLE IF NOT EXISTS product_diet_ratings (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      diet_profile_id TEXT NOT NULL REFERENCES diet_profiles(id) ON DELETE CASCADE,
      rating TEXT,
      recommendation TEXT,
      updated_at INTEGER NOT NULL,
      UNIQUE (product_id, diet_profile_id)
    );

    CREATE TABLE IF NOT EXISTS shopping_lists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      archived_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists(user_id);

    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      checked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_list_items(list_id);
  `);
  db = drizzle(sqlite, { schema });
  return db;
}

export function getDb(): AppDb {
  if (!db) {
    throw new Error("Database has not been initialized");
  }
  return db;
}

export function resetDb(): void {
  if (!sqlite) {
    throw new Error("Database has not been initialized");
  }
  sqlite.exec("DELETE FROM users");
}
