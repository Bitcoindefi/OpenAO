import fs from "fs";
import path from "path";
import pool from "./db";

async function migrate(): Promise<void> {
    const schemaPath = path.resolve(__dirname, "..", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    await pool.query(schemaSql);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_market_listings_active_price_created
      ON market_listings(price ASC, created_at ASC)
      WHERE status = 'active'
  `);
    await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_market_listings_seller_active_created
      ON market_listings(seller_character_id, created_at DESC)
      WHERE status = 'active'
  `);
    // Map persistence tables (game_maps, game_map_tiles, game_map_palette)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_maps (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL DEFAULT '',
          terrain TEXT NOT NULL DEFAULT '',
          zone TEXT NOT NULL DEFAULT '',
          pk BOOLEAN NOT NULL DEFAULT false,
          music INTEGER NOT NULL DEFAULT 0,
          version BIGINT NOT NULL DEFAULT 0,
          checksum TEXT NOT NULL DEFAULT '',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS game_map_tiles (
          map_id INTEGER NOT NULL REFERENCES game_maps(id) ON DELETE CASCADE,
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          tile_id INTEGER NOT NULL DEFAULT 0,
          blocked BOOLEAN NOT NULL DEFAULT false,
          PRIMARY KEY (map_id, x, y)
      );

      CREATE TABLE IF NOT EXISTS game_map_palette (
          map_id INTEGER NOT NULL REFERENCES game_maps(id) ON DELETE CASCADE,
          slot_index INTEGER NOT NULL,
          graphic_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          blocked BOOLEAN NOT NULL DEFAULT false,
          PRIMARY KEY (map_id, slot_index)
      );

      ALTER TABLE game_data_revisions DROP CONSTRAINT IF EXISTS game_data_revisions_kind_check;
      ALTER TABLE game_data_revisions
        ADD CONSTRAINT game_data_revisions_kind_check CHECK (kind IN ('objs', 'npcs', 'crafting_recipes', 'smelting_recipes', 'balance', 'maps'));


      CREATE TABLE IF NOT EXISTS game_map_permissions (
          map_id INTEGER NOT NULL REFERENCES game_maps(id) ON DELETE CASCADE,
          account_id TEXT NOT NULL,
          can_edit BOOLEAN NOT NULL DEFAULT false,
          is_protected BOOLEAN NOT NULL DEFAULT false,
          granted_by TEXT NOT NULL,
          granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (map_id, account_id)
      );

      CREATE TABLE IF NOT EXISTS map_edit_log (
          id SERIAL PRIMARY KEY,
          map_id INTEGER NOT NULL REFERENCES game_maps(id) ON DELETE CASCADE,
          account_id TEXT NOT NULL,
          action TEXT NOT NULL,
          details JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

    `);

    console.log("Database schema applied successfully");
}

void migrate()
    .catch((error) => {
        console.error("Failed to apply database schema", error);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
    });
