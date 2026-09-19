import pool from "../db";

/** Grants are scoped to one map; no wildcard or client-supplied role exists. */
export async function listEditableMaps(accountId: string): Promise<number[]> {
    const result = await pool.query<{ map_num: number }>(
        "SELECT map_num FROM game_map_editors WHERE account_id = $1 ORDER BY map_num",
        [accountId],
    );
    return result.rows.map((row) => row.map_num);
}

export async function canEditMap(accountId: string, mapNum: number): Promise<boolean> {
    const result = await pool.query(
        "SELECT 1 FROM game_map_editors WHERE account_id = $1 AND map_num = $2",
        [accountId, mapNum],
    );
    return result.rowCount === 1;
}
