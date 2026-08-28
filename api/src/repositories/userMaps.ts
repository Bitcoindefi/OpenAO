import pool from "../db";

export const USER_MAP_START_ID = 600;
export const USER_MAP_END_ID = 1999;
export const DEFAULT_MAX_USER_MAPS = 5;

export type UserMapStatus = "draft" | "proposed" | "published" | "archived";

export type UserMapRecord = {
    id: number;
    accountId: number;
    name: string;
    terrain: string;
    zone: string;
    status: UserMapStatus;
    npcCount: number;
    objectCount: number;
    assetBytes: number;
    createdAt: string;
    updatedAt: string;
};

export type UserMapQuota = {
    mapsUsed: number;
    maxMaps: number;
    assetBytesUsed: number;
    maxAssetBytes: number;
    npcCountUsed: number;
    maxNpcCount: number;
    objectCountUsed: number;
    maxObjectCount: number;
};

export const ALLOWED_USER_MAP_STATUSES: UserMapStatus[] = [
    "draft",
    "proposed",
    "published",
    "archived",
];

export function validateUserMapStatus(status: unknown): asserts status is UserMapStatus {
    if (typeof status !== "string" || !ALLOWED_USER_MAP_STATUSES.includes(status as UserMapStatus)) {
        throw new Error(`Estado no valido. Permitidos: ${ALLOWED_USER_MAP_STATUSES.join(", ")}`);
    }
}

export async function getUserMapQuota(accountId: string): Promise<UserMapQuota> {
    const res = await pool.query(
        `SELECT COUNT(*)::int AS "mapsCount",
                COALESCE(SUM(asset_bytes), 0)::bigint AS "totalAssetBytes",
                COALESCE(SUM(npc_count), 0)::int AS "totalNpcs",
                COALESCE(SUM(object_count), 0)::int AS "totalObjects"
         FROM user_maps
         WHERE account_id = $1 AND status != 'archived'`,
        [accountId]
    );
    const row = res.rows[0] || {};
    return {
        mapsUsed: row.mapsCount || 0,
        maxMaps: DEFAULT_MAX_USER_MAPS,
        assetBytesUsed: Number(row.totalAssetBytes || 0),
        maxAssetBytes: 10 * 1024 * 1024,
        npcCountUsed: row.totalNpcs || 0,
        maxNpcCount: 20,
        objectCountUsed: row.totalObjects || 0,
        maxObjectCount: 50,
    };
}

export async function checkMapOwnership(mapId: number, accountId: string): Promise<boolean> {
    const res = await pool.query(
        `SELECT 1 FROM user_maps WHERE id = $1 AND account_id = $2`,
        [mapId, accountId]
    );
    return (res.rowCount ?? 0) > 0;
}

export async function createUserMap(
    accountId: string,
    name: string,
    terrain: string = "PRADERA",
    zone: string = "CAMPO"
): Promise<UserMapRecord> {
    if (!name || !name.trim()) {
        throw new Error("El nombre del mapa es obligatorio");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(6001999)");

        const quotaRes = await client.query(
            `SELECT COUNT(*)::int AS "mapsCount" FROM user_maps WHERE account_id = $1 AND status != 'archived'`,
            [accountId]
        );
        const mapsCount = quotaRes.rows[0]?.mapsCount || 0;
        if (mapsCount >= DEFAULT_MAX_USER_MAPS) {
            throw new Error(`Se ha alcanzado la cuota maxima de mapas (${DEFAULT_MAX_USER_MAPS})`);
        }

        const nextIdRes = await client.query(
            `SELECT COALESCE(MAX(id) + 1, $1) AS "nextId"
             FROM user_maps
             WHERE id >= $1 AND id <= $2`,
            [USER_MAP_START_ID, USER_MAP_END_ID]
        );
        const nextId = Math.max(USER_MAP_START_ID, Number(nextIdRes.rows[0]?.nextId || USER_MAP_START_ID));
        if (nextId > USER_MAP_END_ID) {
            throw new Error("No hay identificadores de mapa disponibles en el rango de usuarios");
        }

        const res = await client.query(
            `INSERT INTO user_maps (id, account_id, name, terrain, zone, status)
             VALUES ($1, $2, $3, $4, $5, 'draft')
             RETURNING id, account_id AS "accountId", name, terrain, zone, status,
                       npc_count AS "npcCount", object_count AS "objectCount",
                       asset_bytes AS "assetBytes", created_at AS "createdAt", updated_at AS "updatedAt"`,
            [nextId, accountId, name.trim(), terrain, zone]
        );
        await client.query("COMMIT");
        return res.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function getUserMap(mapId: number, callerAccountId?: string): Promise<UserMapRecord | null> {
    if (!Number.isInteger(mapId) || mapId < 1) {
        throw new Error("mapId debe ser un entero positivo");
    }
    const res = await pool.query(
        `SELECT id, account_id AS "accountId", name, terrain, zone, status,
                npc_count AS "npcCount", object_count AS "objectCount",
                asset_bytes AS "assetBytes", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM user_maps
         WHERE id = $1`,
        [mapId]
    );
    const map = res.rows[0];
    if (!map) return null;

    if (map.status !== "published" && (!callerAccountId || map.accountId !== callerAccountId)) {
        return null;
    }
    return map;
}

export async function listUserMaps(accountId: string): Promise<UserMapRecord[]> {
    const res = await pool.query(
        `SELECT id, account_id AS "accountId", name, terrain, zone, status,
                npc_count AS "npcCount", object_count AS "objectCount",
                asset_bytes AS "assetBytes", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM user_maps
         WHERE account_id = $1
         ORDER BY id ASC`,
        [accountId]
    );
    return res.rows;
}

export async function listPublishedUserMaps(page = 1, limit = 20): Promise<{ maps: UserMapRecord[]; total: number }> {
    const safePage = Math.max(1, Number.isInteger(page) ? page : 1);
    const safeLimit = Math.min(100, Math.max(1, Number.isInteger(limit) ? limit : 20));
    const offset = (safePage - 1) * safeLimit;

    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM user_maps WHERE status = 'published'`);
    const total = countRes.rows[0]?.total || 0;

    const res = await pool.query(
        `SELECT id, account_id AS "accountId", name, terrain, zone, status,
                npc_count AS "npcCount", object_count AS "objectCount",
                asset_bytes AS "assetBytes", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM user_maps
         WHERE status = 'published'
         ORDER BY id ASC
         LIMIT $1 OFFSET $2`,
        [safeLimit, offset]
    );
    return { maps: res.rows, total };
}

export async function updateUserMapStatus(
    mapId: number,
    accountId: string,
    newStatus: UserMapStatus
): Promise<UserMapRecord | null> {
    if (!Number.isInteger(mapId) || mapId < 1) {
        throw new Error("mapId debe ser un entero positivo");
    }
    validateUserMapStatus(newStatus);
    const isOwner = await checkMapOwnership(mapId, accountId);
    if (!isOwner) {
        throw new Error("No tienes permiso para modificar este mapa");
    }

    const res = await pool.query(
        `UPDATE user_maps
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND account_id = $3
         RETURNING id, account_id AS "accountId", name, terrain, zone, status,
                   npc_count AS "npcCount", object_count AS "objectCount",
                   asset_bytes AS "assetBytes", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [newStatus, mapId, accountId]
    );
    return res.rows[0] || null;
}
