import { z } from "zod";
import pool from "../db";

/** Free gap after local static maps (500-599), before challenges (2000+). */
export const USER_MAP_ID_MIN = 600;
export const USER_MAP_ID_MAX = 999;

export const USER_MAP_STATUSES = [
    "draft",
    "proposed",
    "published",
    "archived",
] as const;

export type UserMapStatus = (typeof USER_MAP_STATUSES)[number];

export type UserMapQuotas = {
    maxMapsPerAccount: number;
    maxNpcsPerMap: number;
    maxObjectsPerMap: number;
    maxAssetBytesPerAccount: number;
};

export const DEFAULT_USER_MAP_QUOTAS: UserMapQuotas = {
    maxMapsPerAccount: 5,
    maxNpcsPerMap: 50,
    maxObjectsPerMap: 200,
    maxAssetBytesPerAccount: 25 * 1024 * 1024,
};

/** Economy isolation for v1: no combat/exp and no valuable item placement. */
export const USER_MAP_ECONOMY_POLICY = {
    allowCombat: false,
    allowExp: false,
    bannedObjTypes: [1, 2, 11, 12], // weapons/armor/gold-like families (conservative)
    maxGoldStacks: 0,
} as const;

type UserMapRow = {
    map_num: number;
    owner_account_id: string;
    name: string;
    status: UserMapStatus;
    npc_count: number;
    object_count: number;
    asset_bytes: string;
    allow_combat: boolean;
    allow_exp: boolean;
    metadata: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
};

const createSchema = z.object({
    name: z.string().trim().min(1).max(80),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    status: z.enum(USER_MAP_STATUSES).optional(),
    npcCount: z.coerce.number().int().min(0).optional(),
    objectCount: z.coerce.number().int().min(0).optional(),
    assetBytesDelta: z.coerce.number().int().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

function isUserMapId(mapNum: number): boolean {
    return (
        Number.isInteger(mapNum) &&
        mapNum >= USER_MAP_ID_MIN &&
        mapNum <= USER_MAP_ID_MAX
    );
}

export function assertUserMapId(mapNum: number): void {
    if (!isUserMapId(mapNum)) {
        throw new Error(
            `map_num fuera del rango de mapas de usuario (${USER_MAP_ID_MIN}-${USER_MAP_ID_MAX})`,
        );
    }
}

function toPublic(row: UserMapRow) {
    return {
        mapNum: row.map_num,
        ownerAccountId: row.owner_account_id,
        name: row.name,
        status: row.status,
        npcCount: row.npc_count,
        objectCount: row.object_count,
        assetBytes: Number(row.asset_bytes),
        allowCombat: row.allow_combat,
        allowExp: row.allow_exp,
        metadata: row.metadata,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        economyPolicy: USER_MAP_ECONOMY_POLICY,
    };
}

export async function getUserMapQuotas(): Promise<UserMapQuotas> {
    const result = await pool.query<{ value: Partial<UserMapQuotas> }>(
        `SELECT value FROM runtime_settings WHERE key = 'user_map_quotas' LIMIT 1`,
    );
    const value = result.rows[0]?.value ?? {};
    return {
        maxMapsPerAccount: Number(
            value.maxMapsPerAccount ?? DEFAULT_USER_MAP_QUOTAS.maxMapsPerAccount,
        ),
        maxNpcsPerMap: Number(
            value.maxNpcsPerMap ?? DEFAULT_USER_MAP_QUOTAS.maxNpcsPerMap,
        ),
        maxObjectsPerMap: Number(
            value.maxObjectsPerMap ?? DEFAULT_USER_MAP_QUOTAS.maxObjectsPerMap,
        ),
        maxAssetBytesPerAccount: Number(
            value.maxAssetBytesPerAccount ??
                DEFAULT_USER_MAP_QUOTAS.maxAssetBytesPerAccount,
        ),
    };
}

async function nextMapNum(client: {
    query: typeof pool.query;
}): Promise<number> {
    const result = await client.query<{ map_num: number }>(
        `
      SELECT map_num
      FROM user_maps
      WHERE map_num BETWEEN $1 AND $2
      ORDER BY map_num ASC
    `,
        [USER_MAP_ID_MIN, USER_MAP_ID_MAX],
    );
    const used = new Set(result.rows.map((row) => row.map_num));
    for (let id = USER_MAP_ID_MIN; id <= USER_MAP_ID_MAX; id += 1) {
        if (!used.has(id)) {
            return id;
        }
    }
    throw new Error("No quedan IDs libres en el rango de mapas de usuario");
}

export async function listVisibleUserMaps(options: {
    viewerAccountId?: string | null;
    ownerOnly?: boolean;
}) {
    const values: string[] = [];
    const conditions: string[] = [];

    if (options.ownerOnly && options.viewerAccountId) {
        values.push(options.viewerAccountId);
        conditions.push(`owner_account_id = $${values.length}`);
    } else if (options.viewerAccountId) {
        values.push(options.viewerAccountId);
        conditions.push(
            `(status = 'published' OR owner_account_id = $${values.length})`,
        );
    } else {
        conditions.push(`status = 'published'`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query<UserMapRow>(
        `
      SELECT map_num, owner_account_id, name, status, npc_count, object_count,
             asset_bytes::text AS asset_bytes, allow_combat, allow_exp, metadata,
             created_at, updated_at
      FROM user_maps
      ${where}
      ORDER BY map_num ASC
    `,
        values,
    );

    return { maps: result.rows.map(toPublic), quotas: await getUserMapQuotas() };
}

export async function getUserMapById(
    mapNum: number,
    viewerAccountId?: string | null,
) {
    assertUserMapId(mapNum);
    const result = await pool.query<UserMapRow>(
        `
      SELECT map_num, owner_account_id, name, status, npc_count, object_count,
             asset_bytes::text AS asset_bytes, allow_combat, allow_exp, metadata,
             created_at, updated_at
      FROM user_maps
      WHERE map_num = $1
      LIMIT 1
    `,
        [mapNum],
    );
    const row = result.rows[0];
    if (!row) {
        throw new Error("User map not found");
    }

    const isOwner = viewerAccountId && row.owner_account_id === viewerAccountId;
    if (row.status !== "published" && !isOwner) {
        throw new Error("User map not found");
    }

    return toPublic(row);
}

export async function createUserMap(
    ownerAccountId: string,
    input: unknown,
) {
    const parsed = createSchema.parse(input ?? {});
    const quotas = await getUserMapQuotas();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const countResult = await client.query<{ count: string }>(
            `
        SELECT COUNT(*)::text AS count
        FROM user_maps
        WHERE owner_account_id = $1 AND status <> 'archived'
      `,
            [ownerAccountId],
        );
        const owned = Number(countResult.rows[0]?.count ?? 0);
        if (owned >= quotas.maxMapsPerAccount) {
            throw new Error(
                `Cuota de mapas alcanzada (${quotas.maxMapsPerAccount} por cuenta)`,
            );
        }

        const bytesResult = await client.query<{ total: string }>(
            `
        SELECT COALESCE(SUM(asset_bytes), 0)::text AS total
        FROM user_maps
        WHERE owner_account_id = $1 AND status <> 'archived'
      `,
            [ownerAccountId],
        );
        if (Number(bytesResult.rows[0]?.total ?? 0) >= quotas.maxAssetBytesPerAccount) {
            throw new Error("Cuota de assets alcanzada para esta cuenta");
        }

        const mapNum = await nextMapNum(client);
        const inserted = await client.query<UserMapRow>(
            `
        INSERT INTO user_maps (
          map_num, owner_account_id, name, status, allow_combat, allow_exp, metadata
        )
        VALUES ($1, $2, $3, 'draft', $4, $5, $6::jsonb)
        RETURNING map_num, owner_account_id, name, status, npc_count, object_count,
                  asset_bytes::text AS asset_bytes, allow_combat, allow_exp, metadata,
                  created_at, updated_at
      `,
            [
                mapNum,
                ownerAccountId,
                parsed.name,
                USER_MAP_ECONOMY_POLICY.allowCombat,
                USER_MAP_ECONOMY_POLICY.allowExp,
                JSON.stringify(parsed.metadata ?? {}),
            ],
        );
        await client.query("COMMIT");
        return toPublic(inserted.rows[0]);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function assertCanEditUserMap(
    mapNum: number,
    accountId: string,
): Promise<UserMapRow> {
    assertUserMapId(mapNum);
    const result = await pool.query<UserMapRow>(
        `
      SELECT map_num, owner_account_id, name, status, npc_count, object_count,
             asset_bytes::text AS asset_bytes, allow_combat, allow_exp, metadata,
             created_at, updated_at
      FROM user_maps
      WHERE map_num = $1
      LIMIT 1
    `,
        [mapNum],
    );
    const row = result.rows[0];
    if (!row) {
        throw new Error("User map not found");
    }
    if (row.owner_account_id !== accountId) {
        const error = new Error("No autorizado para editar este mapa de usuario");
        (error as Error & { statusCode?: number }).statusCode = 403;
        throw error;
    }
    if (row.status === "archived") {
        throw new Error("El mapa esta archivado");
    }
    return row;
}

export async function updateUserMap(
    mapNum: number,
    accountId: string,
    input: unknown,
) {
    const parsed = updateSchema.parse(input ?? {});
    const current = await assertCanEditUserMap(mapNum, accountId);
    const quotas = await getUserMapQuotas();

    const nextNpcCount = parsed.npcCount ?? current.npc_count;
    const nextObjectCount = parsed.objectCount ?? current.object_count;
    if (nextNpcCount > quotas.maxNpcsPerMap) {
        throw new Error(`Cuota de NPCs por mapa excedida (${quotas.maxNpcsPerMap})`);
    }
    if (nextObjectCount > quotas.maxObjectsPerMap) {
        throw new Error(
            `Cuota de objetos por mapa excedida (${quotas.maxObjectsPerMap})`,
        );
    }

    const nextAssetBytes = Math.max(
        0,
        Number(current.asset_bytes) + (parsed.assetBytesDelta ?? 0),
    );

    if (parsed.assetBytesDelta && parsed.assetBytesDelta > 0) {
        const bytesResult = await pool.query<{ total: string }>(
            `
        SELECT COALESCE(SUM(asset_bytes), 0)::text AS total
        FROM user_maps
        WHERE owner_account_id = $1 AND status <> 'archived' AND map_num <> $2
      `,
            [accountId, mapNum],
        );
        if (
            Number(bytesResult.rows[0]?.total ?? 0) + nextAssetBytes >
            quotas.maxAssetBytesPerAccount
        ) {
            throw new Error("Cuota de assets alcanzada para esta cuenta");
        }
    }

    // Official-world isolation: user maps cannot retarget outside the reserved range.
    if (parsed.metadata && typeof parsed.metadata === "object") {
        const portal = parsed.metadata["portalToOfficial"];
        if (portal) {
            throw new Error(
                "Un mapa de usuario no puede referenciar ni modificar el mundo oficial",
            );
        }
    }

    const result = await pool.query<UserMapRow>(
        `
      UPDATE user_maps
      SET name = COALESCE($2, name),
          status = COALESCE($3, status),
          npc_count = $4,
          object_count = $5,
          asset_bytes = $6,
          metadata = COALESCE($7::jsonb, metadata),
          updated_at = NOW()
      WHERE map_num = $1
      RETURNING map_num, owner_account_id, name, status, npc_count, object_count,
                asset_bytes::text AS asset_bytes, allow_combat, allow_exp, metadata,
                created_at, updated_at
    `,
        [
            mapNum,
            parsed.name ?? null,
            parsed.status ?? null,
            nextNpcCount,
            nextObjectCount,
            nextAssetBytes,
            parsed.metadata ? JSON.stringify(parsed.metadata) : null,
        ],
    );

    return toPublic(result.rows[0]);
}

export function validateEconomyPlacement(input: {
    objType?: number;
    goldAmount?: number;
}): void {
    if (
        typeof input.objType === "number" &&
        USER_MAP_ECONOMY_POLICY.bannedObjTypes.includes(
            input.objType as (typeof USER_MAP_ECONOMY_POLICY.bannedObjTypes)[number],
        )
    ) {
        throw new Error("Objeto no permitido en mapas de usuario (aislamiento economico)");
    }
    if ((input.goldAmount ?? 0) > USER_MAP_ECONOMY_POLICY.maxGoldStacks) {
        throw new Error("No se puede colocar oro en mapas de usuario");
    }
}
