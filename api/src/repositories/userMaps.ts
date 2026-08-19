import pool from "../db";
import config from "../config";

// Reserved range for user maps (between static maps 500-599 and challenges 2000+)
export const USER_MAP_ID_MIN = 600;
export const USER_MAP_ID_MAX = 1999;

export type UserMapStatus = "draft" | "proposed" | "published" | "archived";

export interface UserMap {
    id: number;
    ownerAccountId: string;
    name: string;
    terrain: string;
    zone: string;
    pk: boolean;
    music: number;
    status: UserMapStatus;
    width: number;
    height: number;
    npcCount: number;
    objectCount: number;
    assetBytes: number;
    createdAt: string;
    updatedAt: string;
}

export interface UserMapQuota {
    maps: { used: number; limit: number };
    assetBytes: { used: number; limit: number };
    npcs: { used: number; limit: number };
    objects: { used: number; limit: number };
}

function getQuotaLimits(): { maps: number; assetBytes: number; npcs: number; objects: number } {
    return {
        maps: config.userMapQuotaMaps,
        assetBytes: config.userMapQuotaAssetBytes,
        npcs: config.userMapQuotaNpcs,
        objects: config.userMapQuotaObjects,
    };
}

function getNextAvailableUserMapId(): number {
    // Simple approach: find the first unused ID in the reserved range
    return USER_MAP_ID_MIN; // Will be refined with DB sequence
}

export async function createUserMap(
    accountId: string,
    name: string,
    terrain: string,
    zone: string,
): Promise<{ ok: true; map: UserMap } | { ok: false; reason: string }> {
    // Check quota first
    const quota = await getUserMapQuota(accountId);
    if (quota.maps.used >= quota.maps.limit) {
        return { ok: false, reason: `Quota exceeded: you can only have ${quota.maps.limit} maps` };
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("LOCK TABLE user_maps IN SHARE ROW EXCLUSIVE MODE");

        // Find next available ID in the reserved range
        const maxResult = await client.query<{ max_id: number | null }>(
            "SELECT COALESCE(MAX(id), $1 - 1) + 1 AS max_id FROM user_maps WHERE id BETWEEN $1 AND $2",
            [USER_MAP_ID_MIN, USER_MAP_ID_MAX],
        );
        const nextId = Number(maxResult.rows[0]?.max_id ?? USER_MAP_ID_MIN);

        if (nextId > USER_MAP_ID_MAX) {
            await client.query("ROLLBACK");
            return { ok: false, reason: "No available map IDs in the user map range" };
        }

        const inserted = await client.query<UserMapRow>(
            `INSERT INTO user_maps (id, owner_account_id, name, terrain, zone, pk, music, status, width, height, npc_count, object_count, asset_bytes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, false, 0, 'draft', 100, 100, 0, 0, 0, NOW(), NOW())
             RETURNING id, owner_account_id, name, terrain, zone, pk, music, status, width, height, npc_count, object_count, asset_bytes, created_at, updated_at`,
            [nextId, accountId, name, terrain, zone],
        );

        await client.query("COMMIT");

        const row = inserted.rows[0];
        return {
            ok: true,
            map: rowToUserMap(row),
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

interface UserMapRow {
    id: number;
    owner_account_id: string;
    name: string;
    terrain: string;
    zone: string;
    pk: boolean;
    music: number;
    status: string;
    width: number;
    height: number;
    npc_count: number;
    object_count: number;
    asset_bytes: number;
    created_at: Date;
    updated_at: Date;
}

function rowToUserMap(row: UserMapRow): UserMap {
    return {
        id: row.id,
        ownerAccountId: row.owner_account_id,
        name: row.name,
        terrain: row.terrain,
        zone: row.zone,
        pk: row.pk,
        music: row.music,
        status: row.status as UserMapStatus,
        width: row.width,
        height: row.height,
        npcCount: row.npc_count,
        objectCount: row.object_count,
        assetBytes: Number(row.asset_bytes),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}

export async function getUserMap(mapId: number): Promise<UserMap | null> {
    if (mapId < USER_MAP_ID_MIN || mapId > USER_MAP_ID_MAX) return null;
    const result = await pool.query<UserMapRow>(
        `SELECT id, owner_account_id, name, terrain, zone, pk, music, status, width, height, npc_count, object_count, asset_bytes, created_at, updated_at
         FROM user_maps WHERE id = $1 LIMIT 1`,
        [mapId],
    );
    return result.rows[0] ? rowToUserMap(result.rows[0]) : null;
}

export async function listUserMaps(accountId: string): Promise<UserMap[]> {
    const result = await pool.query<UserMapRow>(
        `SELECT id, owner_account_id, name, terrain, zone, pk, music, status, width, height, npc_count, object_count, asset_bytes, created_at, updated_at
         FROM user_maps WHERE owner_account_id = $1 ORDER BY created_at DESC`,
        [accountId],
    );
    return result.rows.map(rowToUserMap);
}

export async function listPublishedUserMaps(page: number = 1, limit: number = 20): Promise<{ maps: UserMap[]; total: number }> {
    const offset = (page - 1) * limit;
    const countResult = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM user_maps WHERE status = 'published'",
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const result = await pool.query<UserMapRow>(
        `SELECT id, owner_account_id, name, terrain, zone, pk, music, status, width, height, npc_count, object_count, asset_bytes, created_at, updated_at
         FROM user_maps WHERE status = 'published' ORDER BY updated_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
    );
    return { maps: result.rows.map(rowToUserMap), total };
}

export async function updateUserMapStatus(
    mapId: number,
    accountId: string,
    newStatus: UserMapStatus,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    const map = await getUserMap(mapId);
    if (!map) return { ok: false, reason: "Map not found" };
    if (map.ownerAccountId !== accountId) return { ok: false, reason: "Only the map owner can change status" };

    await pool.query(
        "UPDATE user_maps SET status = $1, updated_at = NOW() WHERE id = $2 AND owner_account_id = $3",
        [newStatus, mapId, accountId],
    );
    return { ok: true };
}

export async function checkMapOwnership(mapId: number, accountId: string): Promise<boolean> {
    if (mapId < USER_MAP_ID_MIN || mapId > USER_MAP_ID_MAX) return false;
    const result = await pool.query<{ id: number }>(
        "SELECT id FROM user_maps WHERE id = $1 AND owner_account_id = $2 LIMIT 1",
        [mapId, accountId],
    );
    return result.rows.length > 0;
}

export async function getUserMapQuota(accountId: string): Promise<UserMapQuota> {
    const limits = getQuotaLimits();

    const usageResult = await pool.query<{ count: string; total_npcs: string; total_objects: string; total_asset_bytes: string }>(
        `SELECT
            COUNT(*)::text AS count,
            COALESCE(SUM(npc_count)::text, '0') AS total_npcs,
            COALESCE(SUM(object_count)::text, '0') AS total_objects,
            COALESCE(SUM(asset_bytes)::text, '0') AS total_asset_bytes
         FROM user_maps WHERE owner_account_id = $1`,
        [accountId],
    );

    const usage = usageResult.rows[0] || { count: "0", total_npcs: "0", total_objects: "0", total_asset_bytes: "0" };

    return {
        maps: { used: Number(usage.count), limit: limits.maps },
        assetBytes: { used: Number(usage.total_asset_bytes), limit: limits.assetBytes },
        npcs: { used: Number(usage.total_npcs), limit: limits.npcs },
        objects: { used: Number(usage.total_objects), limit: limits.objects },
    };
}
