/**
 * Persistencia de permisos por mapa + bitacora de atribucion (#4).
 */

import pool from "../db";
import {
    evaluateMapEditPermission,
    isProtectedMap,
    type MapEditDecision,
    PROTECTED_MAPS,
} from "../lib/mapEditPermissions";

export { PROTECTED_MAPS, isProtectedMap, evaluateMapEditPermission };

export async function listGrantedMapNums(accountId: string): Promise<number[]> {
    const result = await pool.query<{ map_num: number }>(
        `SELECT map_num FROM game_map_permissions
         WHERE account_id = $1
         ORDER BY map_num ASC`,
        [accountId],
    );
    return result.rows.map((row) => Number(row.map_num));
}

export async function checkMapEditPermission(options: {
    accountId: string;
    isSuperAdmin: boolean;
    mapNum: number;
    overrideProtected?: boolean;
}): Promise<MapEditDecision> {
    const grantedMapNums = options.isSuperAdmin
        ? []
        : await listGrantedMapNums(options.accountId);

    return evaluateMapEditPermission({
        accountId: options.accountId,
        mapNum: options.mapNum,
        isSuperAdmin: options.isSuperAdmin,
        overrideProtected: Boolean(options.overrideProtected),
        grantedMapNums,
    });
}

export async function grantMapPermission(
    accountId: string,
    mapNum: number,
    grantedByAccountId: string,
): Promise<void> {
    if (!Number.isInteger(mapNum) || mapNum < 0) {
        throw new Error("map_num invalido (usa >=1 o 0 para global no protegido).");
    }

    await pool.query(
        `INSERT INTO game_map_permissions (account_id, map_num, granted_by, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (account_id, map_num) DO UPDATE
         SET granted_by = EXCLUDED.granted_by,
             created_at = NOW()`,
        [accountId, mapNum, grantedByAccountId],
    );
}

export async function revokeMapPermission(
    accountId: string,
    mapNum: number,
): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM game_map_permissions WHERE account_id = $1 AND map_num = $2`,
        [accountId, mapNum],
    );
    return (result.rowCount ?? 0) > 0;
}

export type MapMutationKind =
    | "paint_tiles"
    | "clear_tile"
    | "place_entity"
    | "remove_entity"
    | "publish"
    | "discard"
    | "revert"
    | "grant_permission"
    | "revoke_permission";

/** Bitacora append-only: quien / que / cuando (aceptacion #4). */
export async function recordMapMutation(input: {
    accountId: string;
    mapNum: number;
    kind: MapMutationKind;
    detail?: Record<string, unknown>;
}): Promise<void> {
    await pool.query(
        `INSERT INTO game_map_mutation_log
             (account_id, map_num, kind, detail, created_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())`,
        [
            input.accountId,
            input.mapNum,
            input.kind,
            JSON.stringify(input.detail ?? {}),
        ],
    );
}
