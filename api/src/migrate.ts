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

    // Map objects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_map_objects (
          id SERIAL PRIMARY KEY,
          map_id INTEGER NOT NULL,
          x INTEGER NOT NULL CHECK (x BETWEEN 1 AND 100),
          y INTEGER NOT NULL CHECK (y BETWEEN 1 AND 100),
          obj_index INTEGER NOT NULL CHECK (obj_index > 0),
          amount INTEGER NOT NULL DEFAULT 1,
          state TEXT NOT NULL DEFAULT 'placed'
              CHECK (state IN ('placed', 'structure', 'door_open', 'door_closed', 'sign')),
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_game_map_objects_map
          ON game_map_objects(map_id, y, x);
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
