import fs from "fs";
import path from "path";
import pool from "./db";

async function migrate(): Promise<void> {
    const schemaPath = path.resolve(__dirname, "..", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(schemaSql);
        await client.query(`
        CREATE INDEX IF NOT EXISTS idx_market_listings_active_price_created
          ON market_listings(price ASC, created_at ASC)
          WHERE status = 'active'
      `);
        await client.query(`
        CREATE INDEX IF NOT EXISTS idx_market_listings_seller_active_created
          ON market_listings(seller_character_id, created_at DESC)
          WHERE status = 'active'
      `);
        await client.query("COMMIT");
        console.log("Database schema applied successfully");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

void migrate()
    .catch((error) => {
        console.error("Failed to apply database schema", error);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
    });
