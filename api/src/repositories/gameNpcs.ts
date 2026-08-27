import type { PoolClient } from "pg";
import { z } from "zod";
import pool from "../db";
import {
    computeChecksum,
    loadSeedNpcsJson,
    normalizeNpcData,
    type GameNpcRecordData,
} from "../lib/gameData";

const CURRENT_EXP_MULTIPLIER = 5;
const CURRENT_GOLD_MULTIPLIER = 3;

/**
 * Tamano de pagina cuando se pide el catalogo entero. Es un techo, no un
 * objetivo: el catalogo real ronda los 340 NPCs y esto solo evita que un
 * `all=true` se convierta en una consulta sin limite.
 */
const FULL_CATALOG_PAGE_SIZE = 10_000;

type GameNpcRow = {
    id: number;
    name: string;
    npc_type: number;
    id_head: number;
    id_body: number;
    movement: number;
    data: GameNpcRecordData;
    checksum: string;
    version: string;
    updated_at: Date;
};

type GameNpcFrontendExportRow = {
    id: number;
    data: GameNpcRecordData;
};

export type FrontendNpcExportData = {
    name: string;
    idHead: number;
    idBody: number;
    npcType?: number;
    desc?: string;
    exp?: number;
    gold?: number;
    hp?: number;
    maxHp?: number;
    minHit?: number;
    maxHit?: number;
    def?: number;
    poderAtaque?: number;
    poderEvasion?: number;
    drop?: Array<{ item: number; cant: number }>;
};

export async function listNpcSoldItemIds(): Promise<number[]> {
    await ensureSeeded();
    const result = await pool.query<{ data: GameNpcRecordData }>(
        `
      SELECT data
      FROM game_npcs
      WHERE npc_type = 10
    `,
    );

    return Array.from(
        new Set(
            result.rows
                .flatMap((row) => {
                    const objs = row.data?.objs;
                    return Array.isArray(objs) ? objs : [];
                })
                .map((entry) => Number(entry?.item))
                .filter((itemId) => Number.isInteger(itemId) && itemId > 0),
        ),
    ).sort((left, right) => left - right);
}

const tradeEntrySchema = z.object({
    item: z.coerce.number().int().positive(),
    cant: z.coerce.number().int().nonnegative(),
});

const gameNpcSchema = z
    .object({
        name: z.string().trim().min(1),
        npcType: z.coerce.number().int().nonnegative(),
        idHead: z.coerce.number().int().nonnegative(),
        idBody: z.coerce.number().int().nonnegative(),
        movement: z.coerce.number().int().nonnegative(),
        objs: z.array(tradeEntrySchema).optional(),
        drop: z.array(tradeEntrySchema).optional(),
    })
    .catchall(z.unknown());

/**
 * Bandera booleana que llega como query string ("true", "1", ausente...).
 *
 * Lo que no se reconoce vale `false`, igual que en el catalogo de objetos: la
 * ruta envuelve los errores de parseo en un 500, asi que un `?all=quizas`
 * contestaria una falla del servidor por una query mal escrita.
 */
const queryFlagSchema = z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;

    return raw === true || raw === "true" || raw === "1";
}, z.boolean());

const listFiltersSchema = z.object({
    search: z.string().trim().optional(),
    npcType: z.coerce.number().int().optional(),
    hostileOnly: queryFlagSchema,
    sortBy: z
        .enum(["id", "expPerHp", "expReward", "goldReward", "maxHp"])
        .optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    page: z.coerce.number().int().min(1).optional(),
    /**
     * Devuelve el catalogo completo en una sola pagina. El editor visual lo
     * necesita para buscar y filtrar del lado del cliente sobre los 340 NPCs.
     */
    all: queryFlagSchema,
});

function isHostileNpc(data: GameNpcRecordData): boolean {
    return (
        Number(data.maxHp ?? data.hp ?? 0) > 0 &&
        (Number(data.exp ?? 0) > 0 ||
            Number(data.gold ?? 0) > 0 ||
            Number(data.minHit ?? 0) > 0 ||
            Number(data.maxHit ?? 0) > 0 ||
            Number(data.poderAtaque ?? 0) > 0)
    );
}

function compactFrontendNpcData(
    data: GameNpcRecordData,
): FrontendNpcExportData {
    const normalized = normalizeNpcData(data);
    const dropEntries = Array.isArray(normalized.drop) ? normalized.drop : [];
    const frontendNpc: FrontendNpcExportData = {
        name: normalized.name,
        idHead: normalized.idHead,
        idBody: normalized.idBody,
    };

    if (normalized.npcType !== 0) {
        frontendNpc.npcType = normalized.npcType;
    }

    if (normalized.desc) {
        frontendNpc.desc = normalized.desc;
    }

    if (normalized.exp !== 0) {
        frontendNpc.exp = normalized.exp;
    }

    if (normalized.gold !== 0) {
        frontendNpc.gold = normalized.gold;
    }

    if (normalized.hp !== 0) {
        frontendNpc.hp = normalized.hp;
    }

    if (normalized.maxHp !== 0) {
        frontendNpc.maxHp = normalized.maxHp;
    }

    if (normalized.minHit !== 0) {
        frontendNpc.minHit = normalized.minHit;
    }

    if (normalized.maxHit !== 0) {
        frontendNpc.maxHit = normalized.maxHit;
    }

    if (normalized.def !== 0) {
        frontendNpc.def = normalized.def;
    }

    if (normalized.poderAtaque !== 0) {
        frontendNpc.poderAtaque = normalized.poderAtaque;
    }

    if (normalized.poderEvasion !== 0) {
        frontendNpc.poderEvasion = normalized.poderEvasion;
    }

    if (dropEntries.length > 0) {
        frontendNpc.drop = dropEntries.map((entry) => ({
            item: entry.item,
            cant: entry.cant,
        }));
    }

    return frontendNpc;
}

let seedPromise: Promise<void> | null = null;

async function insertRevision(
    client: PoolClient,
    entityId: number,
    checksum: string,
): Promise<number> {
    const revisionResult = await client.query<{ id: string }>(
        `
      INSERT INTO game_data_revisions (kind, entity_id, action, checksum)
      VALUES ('npcs', $1, 'upsert', $2)
      RETURNING id
    `,
        [entityId, checksum],
    );

    return Number(revisionResult.rows[0]?.id ?? 0);
}

async function ensureSeededInternal(): Promise<void> {
    const countResult = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM game_npcs",
    );
    if (Number(countResult.rows[0]?.count ?? 0) > 0) {
        return;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const rows = loadSeedNpcsJson();
        for (const row of rows) {
            const checksum = computeChecksum(row.data);
            await client.query(
                `
          INSERT INTO game_npcs (id, name, npc_type, id_head, id_body, movement, data, checksum, version, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, 0, NOW())
          ON CONFLICT (id) DO NOTHING
        `,
                [
                    row.id,
                    row.data.name,
                    row.data.npcType,
                    row.data.idHead,
                    row.data.idBody,
                    row.data.movement,
                    JSON.stringify(row.data),
                    checksum,
                ],
            );
            const version = await insertRevision(client, row.id, checksum);
            await client.query(
                "UPDATE game_npcs SET version = $2 WHERE id = $1",
                [row.id, version],
            );
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function ensureSeeded(): Promise<void> {
    if (!seedPromise) {
        seedPromise = ensureSeededInternal().finally(() => {
            seedPromise = null;
        });
    }

    await seedPromise;
}

export async function getCurrentGameNpcVersion(): Promise<number> {
    await ensureSeeded();
    const result = await pool.query<{ version: string }>(
        "SELECT COALESCE(MAX(version), 0)::text AS version FROM game_npcs",
    );
    return Number(result.rows[0]?.version ?? 0);
}

function toGameNpcSummary(row: GameNpcRow) {
    const maxHp = Number(row.data.maxHp ?? row.data.hp ?? 0);
    const expReward = Math.floor(
        Number(row.data.exp ?? 0) * CURRENT_EXP_MULTIPLIER,
    );
    const goldReward = Math.floor(
        Number(row.data.gold ?? 0) * CURRENT_GOLD_MULTIPLIER,
    );
    const expPerHp = maxHp > 0 ? Number((expReward / maxHp).toFixed(4)) : null;

    return {
        id: row.id,
        name: row.name,
        npcType: row.npc_type,
        isHostile: isHostileNpc(row.data),
        maxHp,
        expReward,
        goldReward,
        expPerHp,
        idHead: row.id_head,
        idBody: row.id_body,
        movement: row.movement,
        version: Number(row.version),
        updatedAt: row.updated_at.toISOString(),
    };
}

export async function listGameNpcs(filters: unknown) {
    await ensureSeeded();
    const parsed = listFiltersSchema.parse(filters ?? {});
    const values: Array<string | number> = [];
    const conditions: string[] = [];
    const pageSize = parsed.all ? FULL_CATALOG_PAGE_SIZE : (parsed.limit ?? 100);
    const page = parsed.all ? 1 : (parsed.page ?? 1);
    const offset = (page - 1) * pageSize;

    if (parsed.search) {
        values.push(`%${parsed.search.toLowerCase()}%`);
        conditions.push(
            `(LOWER(name) LIKE $${values.length} OR CAST(id AS TEXT) LIKE $${values.length})`,
        );
    }

    if (typeof parsed.npcType === "number" && Number.isFinite(parsed.npcType)) {
        values.push(parsed.npcType);
        conditions.push(`npc_type = $${values.length}`);
    }

    if (parsed.hostileOnly) {
        conditions.push(`(
      COALESCE((data->>'maxHp')::int, (data->>'hp')::int, 0) > 0
      AND (
        COALESCE((data->>'exp')::int, 0) > 0
        OR COALESCE((data->>'gold')::int, 0) > 0
        OR COALESCE((data->>'minHit')::int, 0) > 0
        OR COALESCE((data->>'maxHit')::int, 0) > 0
        OR COALESCE((data->>'poderAtaque')::int, 0) > 0
      )
    )`);
    }

    const sortBy = parsed.sortBy ?? "id";
    const sortDirection =
        parsed.sortDirection ?? (sortBy === "id" ? "asc" : "desc");
    const sortExpressions: Record<string, string> = {
        id: "id",
        maxHp: "COALESCE((data->>'maxHp')::int, (data->>'hp')::int, 0)",
        expReward: `(COALESCE((data->>'exp')::int, 0) * ${CURRENT_EXP_MULTIPLIER})`,
        goldReward: `(COALESCE((data->>'gold')::int, 0) * ${CURRENT_GOLD_MULTIPLIER})`,
        expPerHp: `CASE
      WHEN COALESCE((data->>'maxHp')::int, (data->>'hp')::int, 0) > 0
      THEN ((COALESCE((data->>'exp')::int, 0)::numeric * ${CURRENT_EXP_MULTIPLIER})
        / COALESCE((data->>'maxHp')::int, (data->>'hp')::int, 0)::numeric)
      ELSE NULL
    END`,
    };
    const orderBy = sortExpressions[sortBy] ?? "id";
    const orderDirection = sortDirection === "asc" ? "ASC" : "DESC";

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await pool.query<{ count: string }>(
        `
      SELECT COUNT(*)::text AS count
      FROM game_npcs
      ${whereClause}
    `,
        values,
    );
    values.push(pageSize);
    values.push(offset);
    const result = await pool.query<GameNpcRow>(
        `
      SELECT id, name, npc_type, id_head, id_body, movement, data, checksum, version::text AS version, updated_at
      FROM game_npcs
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}, id ASC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
        values,
    );

    const total = Number(countResult.rows[0]?.count ?? 0);

    return {
        npcs: result.rows.map(toGameNpcSummary),
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
}

export async function getGameNpcById(id: number) {
    await ensureSeeded();
    const result = await pool.query<GameNpcRow>(
        `
      SELECT id, name, npc_type, id_head, id_body, movement, data, checksum, version::text AS version, updated_at
      FROM game_npcs
      WHERE id = $1
      LIMIT 1
    `,
        [id],
    );

    const row = result.rows[0];
    if (!row) {
        throw new Error("Game npc not found");
    }

    return {
        ...toGameNpcSummary(row),
        checksum: row.checksum,
        data: normalizeNpcData(row.data),
    };
}

export async function upsertGameNpc(
    id: number,
    input: unknown,
    updatedByAccountId?: string | null,
) {
    await ensureSeeded();
    const parsed = gameNpcSchema.parse(input);
    const data = normalizeNpcData(parsed as GameNpcRecordData);
    const checksum = computeChecksum(data);
    const current = await pool.query<{ checksum: string }>(
        "SELECT checksum FROM game_npcs WHERE id = $1 LIMIT 1",
        [id],
    );
    const currentChecksum = current.rows[0]?.checksum ?? null;

    if (currentChecksum === checksum) {
        const unchanged = await getGameNpcById(id);
        return { unchanged: true, npc: unchanged };
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            `
        INSERT INTO game_npcs (id, name, npc_type, id_head, id_body, movement, data, checksum, version, updated_by_account_id, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, 0, $9, NOW())
        ON CONFLICT (id)
        DO UPDATE SET name = EXCLUDED.name,
                      npc_type = EXCLUDED.npc_type,
                      id_head = EXCLUDED.id_head,
                      id_body = EXCLUDED.id_body,
                      movement = EXCLUDED.movement,
                      data = EXCLUDED.data,
                      checksum = EXCLUDED.checksum,
                      updated_by_account_id = EXCLUDED.updated_by_account_id,
                      updated_at = NOW()
      `,
            [
                id,
                data.name,
                data.npcType,
                data.idHead,
                data.idBody,
                data.movement,
                JSON.stringify(data),
                checksum,
                updatedByAccountId ?? null,
            ],
        );
        const version = await insertRevision(client, id, checksum);
        await client.query("UPDATE game_npcs SET version = $2 WHERE id = $1", [
            id,
            version,
        ]);
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    const next = await getGameNpcById(id);
    return { unchanged: false, npc: next };
}

export async function listGameNpcChangesSince(sinceVersion: number) {
    await ensureSeeded();
    const result = await pool.query<GameNpcRow>(
        `
      SELECT id, name, npc_type, id_head, id_body, movement, data, checksum, version::text AS version, updated_at
      FROM game_npcs
      WHERE version > $1
      ORDER BY version ASC
    `,
        [sinceVersion],
    );
    const currentVersion = result.rows.reduce(
        (max, row) => Math.max(max, Number(row.version)),
        sinceVersion,
    );

    return {
        currentVersion,
        changes: result.rows.map((row) => ({
            id: row.id,
            version: Number(row.version),
            data: normalizeNpcData(row.data),
        })),
    };
}

export async function exportFrontendNpcs(): Promise<
    Record<string, FrontendNpcExportData>
> {
    await ensureSeeded();
    const result = await pool.query<GameNpcFrontendExportRow>(
        `
      SELECT id, data
      FROM game_npcs
      ORDER BY id ASC
    `,
    );

    return Object.fromEntries(
        result.rows.map((row) => [
            String(row.id),
            compactFrontendNpcData(row.data),
        ]),
    );
}
