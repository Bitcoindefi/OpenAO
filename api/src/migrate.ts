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

    // User map sandbox tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_maps (
          id INTEGER PRIMARY KEY,
          owner_account_id TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          terrain TEXT NOT NULL DEFAULT '',
          zone TEXT NOT NULL DEFAULT '',
          pk BOOLEAN NOT NULL DEFAULT false,
          music INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'proposed', 'published', 'archived')),
          width INTEGER NOT NULL DEFAULT 100,
          height INTEGER NOT NULL DEFAULT 100,
          npc_count INTEGER NOT NULL DEFAULT 0,
          object_count INTEGER NOT NULL DEFAULT 0,
          asset_bytes BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
