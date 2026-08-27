import crypto from "crypto";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import pool from "../db";
import { validatePngUpload } from "../lib/pngValidation";

/**
 * Los indices originales del juego llegan hasta 320151. El rango de graficos
 * subidos arranca muy por encima para que no puedan colisionar nunca.
 */
export const UPLOADED_GRAPHIC_INDEX_START = 1_000_000;

/** Los mapas del juego son de 100x100. */
export const MAP_SIZE = 100;

/** Un tile admite un objeto y un NPC, como el modelo del juego. */
export const TILE_ENTITY_KINDS = ["obj", "npc"] as const;

export type TileEntityKind = (typeof TILE_ENTITY_KINDS)[number];

export type TileEntityPlacement = {
    x: number;
    y: number;
    kind: TileEntityKind;
    entityId: number;
};

export type UploadedGraphic = {
    grhIndex: number;
    checksum: string;
    width: number;
    height: number;
    byteSize: number;
    createdAt: string;
};

export type UploadGraphicResult =
    | { ok: true; graphic: UploadedGraphic; deduped: boolean }
    | { ok: false; reason: string };

function computeChecksum(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Guarda un PNG y le asigna un indice de grafico.
 *
 * Si el mismo archivo ya fue subido (mismo checksum) devuelve el indice
 * existente en vez de duplicarlo: subir dos veces la misma imagen no deberia
 * gastar dos indices ni dos veces el espacio.
 */
export async function uploadGraphic(
    buffer: Buffer,
    accountId: string,
): Promise<UploadGraphicResult> {
    const validation = validatePngUpload(buffer);

    if (!validation.ok) {
        return { ok: false, reason: validation.reason };
    }

    const checksum = computeChecksum(buffer);

    const existing = await pool.query<{
        grh_index: number;
        checksum: string;
        width: number;
        height: number;
        byte_size: number;
        created_at: Date;
    }>(
        `SELECT grh_index, checksum, width, height, byte_size, created_at
         FROM game_uploaded_graphics
         WHERE checksum = $1
         LIMIT 1`,
        [checksum],
    );

    const existingRow = existing.rows[0];

    if (existingRow) {
        return {
            ok: true,
            deduped: true,
            graphic: {
                grhIndex: existingRow.grh_index,
                checksum: existingRow.checksum,
                width: existingRow.width,
                height: existingRow.height,
                byteSize: existingRow.byte_size,
                createdAt: existingRow.created_at.toISOString(),
            },
        };
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Bloqueo la tabla para que dos subidas simultaneas no puedan
        // calcular el mismo indice siguiente y chocar en la primary key.
        await client.query(
            "LOCK TABLE game_uploaded_graphics IN SHARE ROW EXCLUSIVE MODE",
        );

        const nextResult = await client.query<{ next_index: number }>(
            `SELECT COALESCE(MAX(grh_index), $1 - 1) + 1 AS next_index
             FROM game_uploaded_graphics`,
            [UPLOADED_GRAPHIC_INDEX_START],
        );

        const grhIndex = Number(
            nextResult.rows[0]?.next_index ?? UPLOADED_GRAPHIC_INDEX_START,
        );

        const inserted = await client.query<{ created_at: Date }>(
            `INSERT INTO game_uploaded_graphics
                 (grh_index, checksum, width, height, byte_size, content, uploaded_by_account_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING created_at`,
            [
                grhIndex,
                checksum,
                validation.width,
                validation.height,
                validation.byteSize,
                buffer,
                accountId,
            ],
        );

        await client.query("COMMIT");

        return {
            ok: true,
            deduped: false,
            graphic: {
                grhIndex,
                checksum,
                width: validation.width,
                height: validation.height,
                byteSize: validation.byteSize,
                createdAt: (
                    inserted.rows[0]?.created_at ?? new Date()
                ).toISOString(),
            },
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function getGraphicContent(
    grhIndex: number,
): Promise<{ content: Buffer; checksum: string } | null> {
    const result = await pool.query<{ content: Buffer; checksum: string }>(
        `SELECT content, checksum FROM game_uploaded_graphics WHERE grh_index = $1 LIMIT 1`,
        [grhIndex],
    );

    const row = result.rows[0];

    return row ? { content: row.content, checksum: row.checksum } : null;
}

export async function listGraphics(limit = 100): Promise<UploadedGraphic[]> {
    const result = await pool.query<{
        grh_index: number;
        checksum: string;
        width: number;
        height: number;
        byte_size: number;
        created_at: Date;
    }>(
        `SELECT grh_index, checksum, width, height, byte_size, created_at
         FROM game_uploaded_graphics
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
    );

    return result.rows.map((row) => ({
        grhIndex: row.grh_index,
        checksum: row.checksum,
        width: row.width,
        height: row.height,
        byteSize: row.byte_size,
        createdAt: row.created_at.toISOString(),
    }));
}

export const tilePaintSchema = z.object({
    x: z.coerce.number().int().min(1).max(MAP_SIZE),
    y: z.coerce.number().int().min(1).max(MAP_SIZE),
    layer: z.coerce.number().int().min(1).max(4),
    grhIndex: z.coerce.number().int().nonnegative().nullable().optional(),
    blocked: z.boolean().nullable().optional(),
});

export const paintTilesSchema = z.object({
    tiles: z.array(tilePaintSchema).min(1).max(500),
});

export const tileEntitySchema = z.object({
    x: z.coerce.number().int().min(1).max(MAP_SIZE),
    y: z.coerce.number().int().min(1).max(MAP_SIZE),
    kind: z.enum(TILE_ENTITY_KINDS),
    entityId: z.coerce.number().int().positive(),
});

export type TilePaint = z.infer<typeof tilePaintSchema>;

export type MapTileOverride = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked: boolean | null;
    status: "draft" | "published";
};

export type MapTileEntity = TileEntityPlacement & {
    status: "draft" | "published";
};

/**
 * Pinta tiles como BORRADOR. No los ve ningun jugador hasta publicar.
 *
 * Es atomico: si un tile falla, no queda el mapa a medio pintar. El limite de
 * 500 tiles por operacion evita que una sola request repinte el mapa entero.
 */
export async function paintTiles(
    mapNum: number,
    tiles: TilePaint[],
    accountId: string,
): Promise<{ applied: number }> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const tile of tiles) {
            // Un grafico referenciado tiene que existir: o es uno original del
            // juego (por debajo del rango de subidos) o uno que subimos.
            if (
                tile.grhIndex != null &&
                tile.grhIndex >= UPLOADED_GRAPHIC_INDEX_START
            ) {
                const exists = await client.query(
                    `SELECT 1 FROM game_uploaded_graphics WHERE grh_index = $1 LIMIT 1`,
                    [tile.grhIndex],
                );

                if (exists.rowCount === 0) {
                    throw new Error(
                        `El grafico ${tile.grhIndex} no existe. Subilo antes de usarlo.`,
                    );
                }
            }

            await client.query(
                `INSERT INTO game_map_tile_overrides
                     (map_num, x, y, layer, grh_index, blocked, status, updated_by_account_id, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, NOW())
                 ON CONFLICT (map_num, x, y, layer, status) DO UPDATE
                 SET grh_index = EXCLUDED.grh_index,
                     blocked = EXCLUDED.blocked,
                     updated_by_account_id = EXCLUDED.updated_by_account_id,
                     updated_at = NOW()`,
                [
                    mapNum,
                    tile.x,
                    tile.y,
                    tile.layer,
                    tile.grhIndex ?? null,
                    tile.blocked ?? null,
                    accountId,
                ],
            );
        }

        await client.query("COMMIT");

        return { applied: tiles.length };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Tiles de un mapa.
 *
 * Un jugador comun recibe solo lo publicado. Un admin recibe lo publicado con
 * sus borradores encima, asi ve exactamente como va a quedar antes de publicar.
 */
export async function listMapOverrides(
    mapNum: number,
    includeDrafts = false,
): Promise<MapTileOverride[]> {
    // DISTINCT ON con el orden de status pone 'draft' antes que 'published'
    // para la misma coordenada, asi el borrador pisa a lo publicado.
    const query = includeDrafts
        ? `SELECT DISTINCT ON (x, y, layer) x, y, layer, grh_index, blocked, status
           FROM game_map_tile_overrides
           WHERE map_num = $1
           ORDER BY x, y, layer, status ASC`
        : `SELECT x, y, layer, grh_index, blocked, status
           FROM game_map_tile_overrides
           WHERE map_num = $1 AND status = 'published'
           ORDER BY y, x, layer`;

    const result = await pool.query<{
        x: number;
        y: number;
        layer: number;
        grh_index: number | null;
        blocked: boolean | null;
        status: string;
    }>(query, [mapNum]);

    return result.rows.map((row) => ({
        x: row.x,
        y: row.y,
        layer: row.layer,
        grhIndex: row.grh_index,
        blocked: row.blocked,
        status: row.status as "draft" | "published",
    }));
}

/**
 * Coloca un objeto o un NPC en un tile como BORRADOR.
 *
 * El id referenciado tiene que existir en la tabla correspondiente, igual que
 * un grafico referenciado tiene que existir antes de pintarlo.
 */
export async function placeTileEntity(
    mapNum: number,
    placement: TileEntityPlacement,
    accountId: string,
): Promise<{ placed: boolean }> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const kind = placement.kind;
        const tableName = kind === "obj" ? "game_objects" : "game_npcs";
        const exists = await client.query(
            `SELECT 1 FROM ${tableName} WHERE id = $1 LIMIT 1`,
            [placement.entityId],
        );

        if (exists.rowCount === 0) {
            throw new Error(
                `El ${kind === "obj" ? "objeto" : "NPC"} ${placement.entityId} no existe.`,
            );
        }

        await client.query(
            `INSERT INTO game_map_tile_entities
                 (map_num, x, y, kind, entity_id, status, updated_by_account_id, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'draft', $6, NOW())
             ON CONFLICT (map_num, x, y, kind, status) DO UPDATE
             SET entity_id = EXCLUDED.entity_id,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()`,
            [
                mapNum,
                placement.x,
                placement.y,
                kind,
                placement.entityId,
                accountId,
            ],
        );

        await client.query("COMMIT");

        return { placed: true };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/** Quita el objeto o NPC colocado en un tile (borrador). */
export async function removeTileEntity(
    mapNum: number,
    x: number,
    y: number,
    kind: TileEntityKind,
): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM game_map_tile_entities
         WHERE map_num = $1 AND x = $2 AND y = $3 AND kind = $4 AND status = 'draft'`,
        [mapNum, x, y, kind],
    );

    return (result.rowCount ?? 0) > 0;
}

/**
 * Entidades de un mapa.
 *
 * Misma regla que los tiles: un jugador comun recibe solo lo publicado y un
 * admin recibe ademas sus borradores, con el borrador pisando a lo publicado.
 */
export async function listMapTileEntities(
    mapNum: number,
    includeDrafts = false,
): Promise<MapTileEntity[]> {
    const query = includeDrafts
        ? `SELECT DISTINCT ON (x, y, kind) x, y, kind, entity_id, status
           FROM game_map_tile_entities
           WHERE map_num = $1
           ORDER BY x, y, kind, status ASC`
        : `SELECT x, y, kind, entity_id, status
           FROM game_map_tile_entities
           WHERE map_num = $1 AND status = 'published'
           ORDER BY y, x, kind`;

    const result = await pool.query<{
        x: number;
        y: number;
        kind: string;
        entity_id: number;
        status: string;
    }>(query, [mapNum]);

    return result.rows.map((row) => ({
        x: row.x,
        y: row.y,
        kind: row.kind as TileEntityKind,
        entityId: row.entity_id,
        status: row.status as "draft" | "published",
    }));
}

/** Publica los borradores de un mapa: a partir de aca los ven los jugadores. */
export async function publishMap(
    mapNum: number,
    accountId: string,
): Promise<{ published: number; publishedEntities: number }> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `INSERT INTO game_map_tile_overrides
                 (map_num, x, y, layer, grh_index, blocked, status, updated_by_account_id, updated_at)
             SELECT map_num, x, y, layer, grh_index, blocked, 'published', $2, NOW()
             FROM game_map_tile_overrides
             WHERE map_num = $1 AND status = 'draft'
             ON CONFLICT (map_num, x, y, layer, status) DO UPDATE
             SET grh_index = EXCLUDED.grh_index,
                 blocked = EXCLUDED.blocked,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()`,
            [mapNum, accountId],
        );

        await client.query(
            `DELETE FROM game_map_tile_overrides WHERE map_num = $1 AND status = 'draft'`,
            [mapNum],
        );

        const entitiesResult = await client.query(
            `INSERT INTO game_map_tile_entities
                 (map_num, x, y, kind, entity_id, status, updated_by_account_id, updated_at)
             SELECT map_num, x, y, kind, entity_id, 'published', $2, NOW()
             FROM game_map_tile_entities
             WHERE map_num = $1 AND status = 'draft'
             ON CONFLICT (map_num, x, y, kind, status) DO UPDATE
             SET entity_id = EXCLUDED.entity_id,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()`,
            [mapNum, accountId],
        );

        await client.query(
            `DELETE FROM game_map_tile_entities WHERE map_num = $1 AND status = 'draft'`,
            [mapNum],
        );

        await client.query("COMMIT");

        return {
            published: result.rowCount ?? 0,
            publishedEntities: entitiesResult.rowCount ?? 0,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/** Descarta los borradores sin tocar lo que ya esta publicado. */
export async function discardDrafts(
    mapNum: number,
): Promise<{ discarded: number; discardedEntities: number }> {
    const result = await pool.query(
        `DELETE FROM game_map_tile_overrides WHERE map_num = $1 AND status = 'draft'`,
        [mapNum],
    );

    const entitiesResult = await pool.query(
        `DELETE FROM game_map_tile_entities WHERE map_num = $1 AND status = 'draft'`,
        [mapNum],
    );

    return {
        discarded: result.rowCount ?? 0,
        discardedEntities: entitiesResult.rowCount ?? 0,
    };
}

/**
 * Revierte el mapa entero a su estado original, borrando publicados y
 * borradores. Es el boton de panico: deshace todo lo que se haya pintado.
 */
export async function revertMap(
    mapNum: number,
): Promise<{ reverted: number; revertedEntities: number }> {
    const result = await pool.query(
        `DELETE FROM game_map_tile_overrides WHERE map_num = $1`,
        [mapNum],
    );

    const entitiesResult = await pool.query(
        `DELETE FROM game_map_tile_entities WHERE map_num = $1`,
        [mapNum],
    );

    return {
        reverted: result.rowCount ?? 0,
        revertedEntities: entitiesResult.rowCount ?? 0,
    };
}

/** Cuantos tiles y entidades tiene el mapa en cada estado, para mostrar en la UI. */
export async function getMapStatus(mapNum: number): Promise<{
    mapNum: number;
    draft: number;
    published: number;
    draftEntities: number;
    publishedEntities: number;
}> {
    const result = await pool.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
         FROM game_map_tile_overrides
         WHERE map_num = $1
         GROUP BY status`,
        [mapNum],
    );

    const entitiesResult = await pool.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
         FROM game_map_tile_entities
         WHERE map_num = $1
         GROUP BY status`,
        [mapNum],
    );

    const counts = new Map(
        result.rows.map((row) => [row.status, Number(row.count)]),
    );
    const entityCounts = new Map(
        entitiesResult.rows.map((row) => [row.status, Number(row.count)]),
    );

    return {
        mapNum,
        draft: counts.get("draft") ?? 0,
        published: counts.get("published") ?? 0,
        draftEntities: entityCounts.get("draft") ?? 0,
        publishedEntities: entityCounts.get("published") ?? 0,
    };
}

export async function clearTile(
    mapNum: number,
    x: number,
    y: number,
    layer: number,
): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM game_map_tile_overrides
         WHERE map_num = $1 AND x = $2 AND y = $3 AND layer = $4 AND status = 'draft'`,
        [mapNum, x, y, layer],
    );

    return (result.rowCount ?? 0) > 0;
}

/**
 * Ruta al directorio fuente de un mapa dentro del proyecto.
 *
 * Los mapas editables viven como archivos (terrain.json con paleta + filas,
 * specials.json, npcs.json, meta.json) y la API los re-exporta para el
 * frontend. Si la copia fuente no existe, el mapa no es editable.
 */
function resolveMapsSourceDir(): string {
    const candidates = [
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "..", "..", "src"),
    ];

    for (const candidate of candidates) {
        if (existsSync(path.join(candidate, "mapas_source"))) {
            return path.join(candidate, "mapas_source");
        }
    }

    return path.join(candidates[0], "mapas_source");
}

export type TerrainPaletteEntry = {
    id: number;
    graphics: Array<number | null>;
    blocked: boolean;
};

/** Cuantos graficos subidos entran en la paleta del editor. */
const MAX_PALETTE_UPLOADED_GRAPHICS = 500;

export type TerrainPaletteResult = {
    mapNum: number;
    palette: TerrainPaletteEntry[];
    uploadedGraphics: UploadedGraphic[];
};

/**
 * Paleta de tiles del mapa actual.
 *
 * Cada entrada es un tile de la paleta del mapa fuente (terrain.json), con los
 * graficos de sus capas y si bloquea. Los graficos subidos por administradores
 * se suman al final: son tiles disponibles para pintar igual que los
 * originales, con la diferencia de que cada imagen es un tile completo.
 */
export async function getMapTerrainPalette(
    mapNum: number,
): Promise<TerrainPaletteResult> {
    const mapsSourceDir = resolveMapsSourceDir();
    const terrainPath = path.join(
        mapsSourceDir,
        `mapa_${mapNum}`,
        "terrain.json",
    );

    if (!existsSync(terrainPath)) {
        throw new Error(`El mapa ${mapNum} no tiene paleta fuente.`);
    }

    const terrain = JSON.parse(await fs.readFile(terrainPath, "utf8")) as {
        palette?: Record<string, { blocked?: boolean; graphics?: unknown }>;
    };

    const palette: TerrainPaletteEntry[] = [];

    for (const [id, entry] of Object.entries(terrain.palette ?? {})) {
        const parsedId = Number.parseInt(id, 10);

        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            continue;
        }

        const rawGraphics = Array.isArray(entry.graphics)
            ? entry.graphics
            : [entry.graphics];
        const graphics = rawGraphics.map((grh) => {
            const parsed = Number(grh);

            return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
        });

        palette.push({
            id: parsedId,
            graphics,
            blocked: Boolean(entry.blocked),
        });
    }

    palette.sort((left, right) => left.id - right.id);

    return {
        mapNum,
        palette,
        uploadedGraphics: await listGraphics(MAX_PALETTE_UPLOADED_GRAPHICS),
    };
}
