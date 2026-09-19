import pool from "../db";
import { loadMapNpcPlacements, saveMapNpcPlacements } from "../lib/mapNpcStorage";

/**
 * El archivo y PostgreSQL no comparten transaccion. Guardamos primero la
 * intencion durable (actor y snapshots), luego reemplazamos el archivo y
 * marcamos el resultado. Un pending tras un corte requiere reconciliacion;
 * nunca implica por si solo que el cambio se aplico.
 * Se invoca dentro del bloqueo del mapa de mapNpcStorage.
 */
export function auditedNpcSave(accountId: string, action: string): typeof saveMapNpcPlacements {
    return async (directory, mapNum, placements) => {
        const before = await loadMapNpcPlacements(directory, mapNum);
        const result = await pool.query<{ id: string }>(
            `INSERT INTO game_map_edit_audit (map_num, account_id, action, details)
             VALUES ($1, $2, $3, $4::jsonb) RETURNING id`,
            [mapNum, accountId, action, JSON.stringify({ outcome: "pending", before, after: placements })],
        );
        const id = result.rows[0].id;
        try {
            await saveMapNpcPlacements(directory, mapNum, placements);
        } catch (error) {
            await pool.query(
                `UPDATE game_map_edit_audit SET details = details || '{"outcome":"failed"}'::jsonb WHERE id = $1`,
                [id],
            ).catch(() => undefined);
            throw error;
        }
        await pool.query(
            `UPDATE game_map_edit_audit SET details = details || '{"outcome":"applied"}'::jsonb WHERE id = $1`,
            [id],
        );
    };
}
