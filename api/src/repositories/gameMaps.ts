import type { PoolClient } from "pg";
import { z } from "zod";

import pool from "../db";
import {
    computeGameMapChecksum,
    DEFAULT_MAPS_SOURCE_DIR,
    loadGameMapFromDirectory,
    loadGameMapsFromDirectory,
    normalizeGameMapData,
    paletteEntriesFromTerrain,
    terrainFromParts,
    type GameMapPaletteEntry,
    type GameMapRecordData,
} from "../lib/mapData";

/**
 * Persistencia de mapas para OpenAO #3.
 *
 * Diferencias clave vs enfoques de un solo JSONB por mapa:
 * - Schema alineado a la issue: metadata (`game_maps`), paleta relacional
 *   (`game_map_palette`) y grilla compacta (`game_map_grids.rows` JSONB).
 * - Decision medida: NO 10.000 filas/tile (2,9M filas). La grilla va como
 *   documento por mapa; la paleta sí es consultable fila a fila.
 * - Semántica seed vs editado: el import deja `is_edited=false`. La lectura
 *   con precedencia solo sirve DB cuando el mapa fue editado; si solo está
 *   importado como seed, se sigue sirviendo el archivo (criterio de la issue).
 */

type GameMapRow = {
    id: number;
    name: string;
    terreno: string;
    zona: string;
    restringir: string;
    min_level: number;
    max_level: number;
    pk: boolean;
    metadata: GameMapRecordData["metadata"];
    npcs: GameMapRecordData["npcs"];
    specials: GameMapRecordData["specials"];
    checksum: string;
    source_checksum: string;
    is_edited: boolean;
    version: string;
    updated_at: Date;
};

type GameMapGridRow = {
    map_id: number;
    width: number;
    height: number;
    rows: number[][];
};

type GameMapPaletteRow = {
    map_id: number;
    palette_key: number;
    graphics: unknown;
    blocked: boolean;
    tile: GameMapRecordData["terrain"]["palette"][string];
};

const listFiltersSchema = z.object({
    search: z.string().trim().optional(),
    terreno: z.string().trim().optional(),
    zona: z.string().trim().optional(),
    editedOnly: z.preprocess((value) => {
        const raw = Array.isArray(value) ? value[0] : value;
        return raw === true || raw === "true" || raw === "1";
    }, z.boolean()),
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

async function replacePaletteAndGrid(
    client: PoolClient,
    mapId: number,
    data: GameMapRecordData,
): Promise<void> {
    await client.query(`DELETE FROM game_map_palette WHERE map_id = $1`, [mapId]);
    await client.query(`DELETE FROM game_map_grids WHERE map_id = $1`, [mapId]);

    const entries = paletteEntriesFromTerrain(data.terrain.palette);
    for (const entry of entries) {
        await client.query(
            `
        INSERT INTO game_map_palette (map_id, palette_key, graphics, blocked, tile)
        VALUES ($1, $2, $3::jsonb, $4, $5::jsonb)
      `,
            [
                mapId,
                entry.paletteKey,
                JSON.stringify(entry.graphics),
                entry.blocked,
                JSON.stringify(entry.tile),
            ],
        );
    }

    await client.query(
        `
      INSERT INTO game_map_grids (map_id, width, height, rows)
      VALUES ($1, $2, $3, $4::jsonb)
    `,
        [
            mapId,
            data.terrain.width,
            data.terrain.height,
            JSON.stringify(data.terrain.rows),
        ],
    );
}

async function loadPaletteEntries(
    mapId: number,
    client?: PoolClient,
): Promise<GameMapPaletteEntry[]> {
    const queryable = client ?? pool;
    const result = await queryable.query<GameMapPaletteRow>(
        `
      SELECT map_id, palette_key, graphics, blocked, tile
      FROM game_map_palette
      WHERE map_id = $1
      ORDER BY palette_key ASC
    `,
        [mapId],
    );

    return result.rows.map((row) => ({
        paletteKey: row.palette_key,
        graphics: row.graphics,
        blocked: row.blocked,
        tile: row.tile,
    }));
}

async function loadGrid(
    mapId: number,
    client?: PoolClient,
): Promise<GameMapGridRow | null> {
    const queryable = client ?? pool;
    const result = await queryable.query<GameMapGridRow>(
        `
      SELECT map_id, width, height, rows
      FROM game_map_grids
      WHERE map_id = $1
      LIMIT 1
    `,
        [mapId],
    );

    return result.rows[0] ?? null;
}

async function assembleGameMapData(
    row: GameMapRow,
    client?: PoolClient,
): Promise<GameMapRecordData> {
    const [paletteEntries, grid] = await Promise.all([
        loadPaletteEntries(row.id, client),
        loadGrid(row.id, client),
    ]);

    if (!grid) {
        throw new Error(`Game map ${row.id} is missing grid rows`);
    }

    return normalizeGameMapData(
        {
            metadata: row.metadata,
            terrain: terrainFromParts(
                row.id,
                grid.width,
                grid.height,
                paletteEntries,
                grid.rows,
            ),
            npcs: row.npcs,
            specials: row.specials,
        },
        row.id,
    );
}

function toSummary(
    row: Pick<
        GameMapRow,
        | "id"
        | "name"
        | "terreno"
        | "zona"
        | "restringir"
        | "min_level"
        | "max_level"
        | "pk"
        | "is_edited"
        | "version"
        | "updated_at"
    >,
    source: "db" | "file",
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
        isEdited: row.is_edited,
        version: Number(row.version),
        updatedAt: row.updated_at.toISOString(),
        source,
    };
}

function fileSummary(id: number, data: GameMapRecordData) {
    return {
        id,
        name: data.metadata.name,
        terreno: data.metadata.terreno,
        zona: data.metadata.zona,
        restringir: data.metadata.restringir,
        minLevel: data.metadata.minLevel,
        maxLevel: data.metadata.maxLevel,
        pk: data.metadata.pk === 1,
        isEdited: false,
        version: 0,
        updatedAt: null as string | null,
        source: "file" as const,
    };
}

export async function listGameMaps(filters: unknown) {
    const parsed = listFiltersSchema.parse(filters ?? {});
    const values: Array<string | number | boolean> = [];
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

    if (parsed.editedOnly) {
        conditions.push(`is_edited = TRUE`);
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
    const result = await pool.query<GameMapRow>(
        `
      SELECT id, name, terreno, zona, restringir, min_level, max_level, pk,
             metadata, npcs, specials, checksum, source_checksum, is_edited,
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
        maps: result.rows.map((row) => toSummary(row, row.is_edited ? "db" : "file")),
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
             metadata, npcs, specials, checksum, source_checksum, is_edited,
             version::text AS version, updated_at
      FROM game_maps
      WHERE id = $1
      LIMIT 1
    `,
        [id],
    );

    const row = result.rows[0];

    // Precedencia issue #3: solo mapas *editados* se sirven desde DB.
    // Un seed importado sigue cayendo al archivo hasta la primera edicion.
    if (row?.is_edited) {
        const data = await assembleGameMapData(row);
        return {
            ...toSummary(row, "db"),
            checksum: row.checksum,
            sourceChecksum: row.source_checksum,
            data,
        };
    }

    const fileMap = await loadGameMapFromDirectory(mapsSourceDir, id);
    if (!fileMap) {
        throw new Error("Game map not found");
    }

    return {
        ...fileSummary(id, fileMap),
        checksum: computeGameMapChecksum(fileMap),
        sourceChecksum: row?.source_checksum ?? computeGameMapChecksum(fileMap),
        data: fileMap,
        seeded: Boolean(row),
    };
}

async function persistMap(
    id: number,
    input: unknown,
    options: {
        markEdited: boolean;
        updatedByAccountId?: string | null;
        /** Si true, no pisa filas con is_edited=true (usado por el importador). */
        preserveEdited?: boolean;
    },
) {
    const data = normalizeGameMapData(input, id);
    const checksum = computeGameMapChecksum(data);

    const client = await pool.connect();
    let unchanged = false;
    let nextRow: GameMapRow | undefined;

    try {
        await client.query("BEGIN");

        const current = await client.query<{
            checksum: string;
            is_edited: boolean;
            source_checksum: string;
        }>(
            `
        SELECT checksum, is_edited, source_checksum
        FROM game_maps
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
            [id],
        );

        const existing = current.rows[0];

        if (options.preserveEdited && existing?.is_edited) {
            unchanged = true;
        } else if (existing && existing.checksum === checksum) {
            // Mismo contenido: no revision nueva. Si el import re-sincroniza un
            // seed, tampoco tocamos updated_at.
            unchanged = true;
        } else {
            const sourceChecksum = options.markEdited
                ? (existing?.source_checksum ?? checksum)
                : checksum;
            const isEdited = options.markEdited
                ? true
                : Boolean(existing?.is_edited);

            await client.query(
                `
          INSERT INTO game_maps (
            id, name, terreno, zona, restringir, min_level, max_level, pk,
            metadata, npcs, specials, checksum, source_checksum, is_edited,
            version, updated_by_account_id, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14,
            0, $15, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            terreno = EXCLUDED.terreno,
            zona = EXCLUDED.zona,
            restringir = EXCLUDED.restringir,
            min_level = EXCLUDED.min_level,
            max_level = EXCLUDED.max_level,
            pk = EXCLUDED.pk,
            metadata = EXCLUDED.metadata,
            npcs = EXCLUDED.npcs,
            specials = EXCLUDED.specials,
            checksum = EXCLUDED.checksum,
            source_checksum = CASE
              WHEN game_maps.is_edited THEN game_maps.source_checksum
              ELSE EXCLUDED.source_checksum
            END,
            is_edited = EXCLUDED.is_edited,
            updated_by_account_id = EXCLUDED.updated_by_account_id,
            updated_at = NOW()
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
                    JSON.stringify(data.npcs),
                    JSON.stringify(data.specials),
                    checksum,
                    sourceChecksum,
                    isEdited,
                    options.updatedByAccountId ?? null,
                ],
            );

            await replacePaletteAndGrid(client, id, data);
            const version = await insertRevision(client, id, checksum);
            await client.query(
                `UPDATE game_maps SET version = $2 WHERE id = $1`,
                [id, version],
            );
        }

        const nextResult = await client.query<GameMapRow>(
            `
        SELECT id, name, terreno, zona, restringir, min_level, max_level, pk,
               metadata, npcs, specials, checksum, source_checksum, is_edited,
               version::text AS version, updated_at
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

    const assembled = await assembleGameMapData(nextRow);
    return {
        unchanged,
        map: {
            ...toSummary(nextRow, nextRow.is_edited ? "db" : "file"),
            checksum: nextRow.checksum,
            sourceChecksum: nextRow.source_checksum,
            data: assembled,
        },
    };
}

/** Edicion admin/editor: marca el mapa como editado y deja revision. */
export async function upsertGameMap(
    id: number,
    input: unknown,
    updatedByAccountId?: string | null,
) {
    return persistMap(id, input, {
        markEdited: true,
        updatedByAccountId,
        preserveEdited: false,
    });
}

/**
 * Importador idempotente desde `mapas_source/`.
 * No pisa mapas ya editados y no marca seed como editado.
 */
export async function importGameMapsFromSource(
    mapsSourceDir = DEFAULT_MAPS_SOURCE_DIR,
): Promise<{ total: number; changed: number; unchanged: number }> {
    const maps = await loadGameMapsFromDirectory(mapsSourceDir);
    let changed = 0;
    let unchanged = 0;

    for (const mapData of maps) {
        const result = await persistMap(mapData.metadata.id, mapData, {
            markEdited: false,
            preserveEdited: true,
        });
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
             metadata, npcs, specials, checksum, source_checksum, is_edited,
             version::text AS version, updated_at
      FROM game_maps
      WHERE version > $1 AND is_edited = TRUE
      ORDER BY version ASC
    `,
        [sinceVersion],
    );

    const changes = [];
    for (const row of result.rows) {
        changes.push({
            id: row.id,
            version: Number(row.version),
            data: await assembleGameMapData(row),
        });
    }

    const currentVersion = changes.reduce(
        (max, row) => Math.max(max, row.version),
        sinceVersion,
    );

    return { currentVersion, changes };
}

export async function getCurrentGameMapVersion(): Promise<number> {
    const result = await pool.query<{ version: string }>(
        "SELECT COALESCE(MAX(version), 0)::text AS version FROM game_maps WHERE is_edited = TRUE",
    );
    return Number(result.rows[0]?.version ?? 0);
}

export async function listEditedGameMapIds(): Promise<number[]> {
    const result = await pool.query<{ id: number }>(
        `SELECT id FROM game_maps WHERE is_edited = TRUE ORDER BY id ASC`,
    );
    return result.rows.map((row) => row.id);
}
