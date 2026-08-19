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

    // Map exits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_map_exits (
          source_map_id INTEGER NOT NULL,
          source_x INTEGER NOT NULL CHECK (source_x BETWEEN 1 AND 100),
          source_y INTEGER NOT NULL CHECK (source_y BETWEEN 1 AND 100),
          destination_map_id INTEGER NOT NULL,
          destination_x INTEGER NOT NULL CHECK (destination_x BETWEEN 1 AND 100),
          destination_y INTEGER NOT NULL CHECK (destination_y BETWEEN 1 AND 100),
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (source_map_id, source_x, source_y)
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
