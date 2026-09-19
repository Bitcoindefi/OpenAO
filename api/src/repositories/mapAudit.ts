import type { PoolClient } from "pg";
import pool from "../db";

export async function recordMapEdit(
    client: PoolClient,
    mapNum: number,
    accountId: string,
    action: string,
    details: Record<string, unknown>,
): Promise<void> {
    await client.query(
        `INSERT INTO game_map_edit_audit (map_num, account_id, action, details)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [mapNum, accountId, action, JSON.stringify(details)],
    );
}

/** Mutation and attribution commit together, including destructive operations. */
export async function auditedMapEdit<T>(
    mapNum: number,
    accountId: string,
    action: string,
    details: Record<string, unknown>,
    mutate: (client: PoolClient) => Promise<T>,
): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await mutate(client);
        await recordMapEdit(client, mapNum, accountId, action, details);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
