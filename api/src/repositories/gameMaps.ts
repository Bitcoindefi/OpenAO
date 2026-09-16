import type { PoolClient } from "pg";
import { z } from "zod";

import pool from "../db";
import {
    computeGameMapChecksum,
    DEFAULT_MAPS_SOURCE_DIR,
    loadGameMapFromDirectory,
    loadGameMapsFromDirectory,
    normalizeGameMapData,
    type GameMapRecordData,
} from "../lib/mapData";

type GameMapSummaryRow = {
    id: number;
    name: string;
    terreno: string;
    zona: string;
    restringir: string;
    min_level: number;
    max_level: number;
    pk: boolean;
    version: string;
    updated_at: Date;
};

type GameMapRow = GameMapSummaryRow & {
    metadata: GameMapRecordData["metadata"];
    terrain: GameMapRecordData["terrain"];
    npcs: GameMapRecordData["npcs"];
    specials: GameMapRecordData["specials"];
    checksum: string;
};

const listFiltersSchema = z.object({
    search: z.string().trim().optional(),
    terreno: z.string().trim().optional(),
    zona: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    page: z.coerce.number().int().min(1).optional(),
});

async function insertRevision(
    client: PoolClient,
    entityId: number,
    checksum: string,
): Promise<number> {
    const result = await client.query<{ id: string }>(
        `
      INSERT INTO game_data_revisions (kind, entity_id, action, checksum)
      VALUES ('maps', $1, 'upsert', $2)
      RETURNING id
    `,
        [entityId, checksum],
    );

    return Number(result.rows[0]?.id ?? 0);
}

function toGameMapData(row: GameMapRow): GameMapRecordData {
    return normalizeGameMapData(
        {
            metadata: row.metadata,
            terrain: row.terrain,
            npcs: row.npcs,
            specials: row.specials,
        },
        row.id,
    );
}

function toGameMapSummary(
    row: GameMapSummaryRow,
    source: "db" | "file" = "db",
) {
    return {
        id: row.id,
        name: row.name,
        terreno: row.terreno,
        zona: row.zona,
        restringir: row.restringir,
        minLevel: row.min_level,
        maxLevel: row.max_level,
        pk: row.pk,
        version: Number(row.version),
        updatedAt: row.updated_at.toISOString(),
        source,
    };
}

function mapDataToSummary(
    id: number,
    data: GameMapRecordData,
    source: "db" | "file",
) {
    return {
        id,
        name: data.metadata.name,
        terreno: data.metadata.terreno,
        zona: data.metadata.zona,
        restringir: data.metadata.restringir,
        minLevel: data.metadata.minLevel,
        maxLevel: data.metadata.maxLevel,
        pk: data.metadata.pk === 1,
        version: 0,
        updatedAt: null,
        source,
    };
}

export async function listGameMaps(filters: unknown) {
    const parsed = listFiltersSchema.parse(filters ?? {});
    const values: Array<string | number> = [];
    const conditions: string[] = [];
    const pageSize = parsed.limit ?? 100;
    const page = parsed.page ?? 1;
    const offset = (page - 1) * pageSize;

    if (parsed.search) {
        values.push(`%${parsed.search.toLowerCase()}%`);
        conditions.push(
            `(LOWER(name) LIKE $${values.length} OR CAST(id AS TEXT) LIKE $${values.length})`,
        );
    }

    if (parsed.terreno) {
        values.push(parsed.terreno.toUpperCase());
        conditions.push(`UPPER(terreno) = $${values.length}`);
    }

    if (parsed.zona) {
        values.push(parsed.zona.toUpperCase());
        conditions.push(`UPPER(zona) = $${values.length}`);
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await pool.query<{ count: string }>(
        `
      SELECT COUNT(*)::text AS count
      FROM game_maps
      ${whereClause}
    `,
        values,
    );

    values.push(pageSize);
    values.push(offset);
    const result = await pool.query<GameMapSummaryRow>(
        `
      SELECT id, name, terreno, zona, restringir, min_level, max_level, pk,
             version::text AS version, updated_at
      FROM game_maps
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
        values,
    );

    const total = Number(countResult.rows[0]?.count ?? 0);

    return {
        maps: result.rows.map((row) => toGameMapSummary(row)),
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
}

export async function getGameMapById(
    id: number,
    mapsSourceDir = DEFAULT_MAPS_SOURCE_DIR,
) {
    const result = await pool.query<GameMapRow>(
        `
      SELECT id, name, terreno, zona, restringir, min_level, max_level, pk,
             metadata, terrain, npcs, specials, checksum, version::text AS version, updated_at
      FROM game_maps
      WHERE id = $1
      LIMIT 1
    `,
        [id],
    );

    const row = result.rows[0];
    if (row) {
        return {
            ...toGameMapSummary(row),
            checksum: row.checksum,
            data: toGameMapData(row),
        };
    }

    const fileMap = await loadGameMapFromDirectory(mapsSourceDir, id);
    if (!fileMap) {
        throw new Error("Game map not found");
    }

    return {
        ...mapDataToSummary(id, fileMap, "file"),
        checksum: computeGameMapChecksum(fileMap),
        data: fileMap,
    };
}

export async function upsertGameMap(
    id: number,
    input: unknown,
    updatedByAccountId?: string | null,
) {
    const data = normalizeGameMapData(input, id);
    const checksum = computeGameMapChecksum(data);

    const client = await pool.connect();
    let unchanged = false;
    let nextRow: GameMapRow | undefined;

    try {
        await client.query("BEGIN");
        const upsertResult = await client.query<{ id: number }>(
            `
        INSERT INTO game_maps (
          id, name, terreno, zona, restringir, min_level, max_level, pk,
          metadata, terrain, npcs, specials, checksum, version,
          updated_by_account_id, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
                $13, 0, $14, NOW())
        ON CONFLICT (id)
        DO UPDATE SET name = EXCLUDED.name,
                      terreno = EXCLUDED.terreno,
                      zona = EXCLUDED.zona,
                      restringir = EXCLUDED.restringir,
                      min_level = EXCLUDED.min_level,
                      max_level = EXCLUDED.max_level,
                      pk = EXCLUDED.pk,
                      metadata = EXCLUDED.metadata,
                      terrain = EXCLUDED.terrain,
                      npcs = EXCLUDED.npcs,
                      specials = EXCLUDED.specials,
                      checksum = EXCLUDED.checksum,
                      updated_by_account_id = EXCLUDED.updated_by_account_id,
                      updated_at = NOW()
        WHERE game_maps.checksum IS DISTINCT FROM EXCLUDED.checksum
        RETURNING id
      `,
            [
                id,
                data.metadata.name,
                data.metadata.terreno,
                data.metadata.zona,
                data.metadata.restringir,
                data.metadata.minLevel,
                data.metadata.maxLevel,
                data.metadata.pk === 1,
                JSON.stringify(data.metadata),
                JSON.stringify(data.terrain),
                JSON.stringify(data.npcs),
                JSON.stringify(data.specials),
                checksum,
                updatedByAccountId ?? null,
            ],
        );

        unchanged = (upsertResult.rowCount ?? 0) === 0;
        if (!unchanged) {
            const version = await insertRevision(client, id, checksum);
            await client.query("UPDATE game_maps SET version = $2 WHERE id = $1", [
                id,
                version,
            ]);
        }

        const nextResult = await client.query<GameMapRow>(
            `
      SELECT id, name, terreno, zona, restringir, min_level, max_level, pk,
             metadata, terrain, npcs, specials, checksum, version::text AS version, updated_at
      FROM game_maps
      WHERE id = $1
      LIMIT 1
    `,
            [id],
        );
        nextRow = nextResult.rows[0];

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    if (!nextRow) {
        throw new Error("Game map not found after upsert");
    }

    return {
        unchanged,
        map: {
            ...toGameMapSummary(nextRow),
            checksum: nextRow.checksum,
            data: toGameMapData(nextRow),
        },
    };
}

export async function importGameMapsFromSource(
    mapsSourceDir = DEFAULT_MAPS_SOURCE_DIR,
): Promise<{ total: number; changed: number; unchanged: number }> {
    const maps = await loadGameMapsFromDirectory(mapsSourceDir);
    let changed = 0;
    let unchanged = 0;

    for (const mapData of maps) {
        const result = await upsertGameMap(mapData.metadata.id, mapData);
        if (result.unchanged) {
            unchanged += 1;
        } else {
            changed += 1;
        }
    }

    return { total: maps.length, changed, unchanged };
}

export async function listGameMapChangesSince(sinceVersion: number) {
    const result = await pool.query<GameMapRow>(
        `
      SELECT id, name, terreno, zona, restringir, min_level, max_level, pk,
             metadata, terrain, npcs, specials, checksum, version::text AS version, updated_at
      FROM game_maps
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
            data: toGameMapData(row),
        })),
    };
}

export async function getCurrentGameMapVersion(): Promise<number> {
    const result = await pool.query<{ version: string }>(
        "SELECT COALESCE(MAX(version), 0)::text AS version FROM game_maps",
    );
    return Number(result.rows[0]?.version ?? 0);
}
