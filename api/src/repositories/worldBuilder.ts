import crypto from "crypto";
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

export type TilePaint = z.infer<typeof tilePaintSchema>;

export type MapTileOverride = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked: boolean | null;
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

/** Publica los borradores de un mapa: a partir de aca los ven los jugadores. */
export async function publishMap(
    mapNum: number,
    accountId: string,
): Promise<{ published: number }> {
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

        await client.query("COMMIT");

        return { published: result.rowCount ?? 0 };
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
): Promise<{ discarded: number }> {
    const result = await pool.query(
        `DELETE FROM game_map_tile_overrides WHERE map_num = $1 AND status = 'draft'`,
        [mapNum],
    );

    return { discarded: result.rowCount ?? 0 };
}

/**
 * Revierte el mapa entero a su estado original, borrando publicados y
 * borradores. Es el boton de panico: deshace todo lo que se haya pintado.
 */
export async function revertMap(
    mapNum: number,
): Promise<{ reverted: number }> {
    const result = await pool.query(
        `DELETE FROM game_map_tile_overrides WHERE map_num = $1`,
        [mapNum],
    );

    return { reverted: result.rowCount ?? 0 };
}

/** Cuantos tiles tiene el mapa en cada estado, para mostrar en la UI. */
export async function getMapStatus(mapNum: number): Promise<{
    mapNum: number;
    draft: number;
    published: number;
}> {
    const result = await pool.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
         FROM game_map_tile_overrides
         WHERE map_num = $1
         GROUP BY status`,
        [mapNum],
    );

    const counts = new Map(
        result.rows.map((row) => [row.status, Number(row.count)]),
    );

    return {
        mapNum,
        draft: counts.get("draft") ?? 0,
        published: counts.get("published") ?? 0,
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
 * Mapas principales protegidos contra edición accidental o no autorizada.
 * Incluye las ciudades principales (Ullathorpe = 1, Nix = 34, Banderbill = 59, Lindos = 150).
 */
export const PROTECTED_MAPS: ReadonlySet<number> = new Set([1, 34, 59, 150]);

export function isProtectedMap(mapNum: number): boolean {
    return PROTECTED_MAPS.has(mapNum);
}

export type MapPermissionCheckResult =
    | { allowed: true }
    | { allowed: false; reason: string };

/**
 * Verifica si una cuenta tiene permisos para editar un mapa específico.
 *
 * 1. Los administradores globales pueden editar mapas no protegidos, o protegidos si envían `overrideProtected: true`.
 * 2. Los colaboradores deben tener asignado el mapa en `game_map_permissions` y no pueden editar mapas protegidos.
 */
export async function checkMapEditPermission(options: {
    accountId: string;
    isSuperAdmin: boolean;
    mapNum: number;
    overrideProtected?: boolean;
}): Promise<MapPermissionCheckResult> {
    const { accountId, isSuperAdmin, mapNum, overrideProtected } = options;

    if (isSuperAdmin) {
        if (isProtectedMap(mapNum) && !overrideProtected) {
            return {
                allowed: false,
                reason: `El mapa ${mapNum} esta protegido contra edicion accidental. Para modificarlo como admin debes especificar overrideProtected = true.`,
            };
        }
        return { allowed: true };
    }

    // Colaboradores regulares: nunca pueden modificar mapas protegidos
    if (isProtectedMap(mapNum)) {
        return {
            allowed: false,
            reason: `El mapa ${mapNum} esta protegido. Los colaboradores no tienen permisos de modificacion sobre mapas protegidos.`,
        };
    }

    // Verificar si tiene permiso granular concedido (map_num exacto o map_num = 0 para permiso global)
    const permission = await pool.query<{ map_num: number }>(
        `SELECT map_num FROM game_map_permissions
         WHERE account_id = $1 AND (map_num = $2 OR map_num = 0)
         LIMIT 1`,
        [accountId, mapNum],
    );

    if (permission.rowCount === 0) {
        return {
            allowed: false,
            reason: `La cuenta ${accountId} no tiene permisos para editar el mapa ${mapNum}.`,
        };
    }

    return { allowed: true };
}

export async function grantMapPermission(
    accountId: string,
    mapNum: number,
    grantedByAccountId: string,
): Promise<void> {
    await pool.query(
        `INSERT INTO game_map_permissions (account_id, map_num, granted_by, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (account_id, map_num) DO NOTHING`,
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

export async function listAccountMapPermissions(
    accountId: string,
): Promise<number[]> {
    const result = await pool.query<{ map_num: number }>(
        `SELECT map_num FROM game_map_permissions WHERE account_id = $1 ORDER BY map_num`,
        [accountId],
    );
    return result.rows.map((row) => row.map_num);
}

export type GraphicMetadata = {
    grhIndex: number;
    width: number;
    height: number;
    frameCount: number;
    fileNum: number;
    offX: number;
    offY: number;
    isUploaded: boolean;
    url: string;
};

export async function getGraphicMetadata(
    grhIndex: number,
): Promise<GraphicMetadata | null> {
    if (grhIndex >= UPLOADED_GRAPHIC_INDEX_START) {
        const result = await pool.query<{
            grh_index: number;
            width: number;
            height: number;
        }>(
            `SELECT grh_index, width, height FROM game_uploaded_graphics WHERE grh_index = $1 LIMIT 1`,
            [grhIndex],
        );
        const row = result.rows[0];
        if (!row) return null;

        return {
            grhIndex: row.grh_index,
            width: row.width,
            height: row.height,
            frameCount: 1,
            fileNum: row.grh_index,
            offX: 0,
            offY: 0,
            isUploaded: true,
            url: `/admin/game-data/graphics/${row.grh_index}`,
        };
    }

    // Gráfico original del juego
    return {
        grhIndex,
        width: 32,
        height: 32,
        frameCount: 1,
        fileNum: grhIndex,
        offX: 0,
        offY: 0,
        isUploaded: false,
        url: `/graphics/${grhIndex}.png`,
    };
}

export const paletteEntrySchema = z.object({
    paletteId: z.number().int().positive().optional(),
    graphics: z.array(z.number().int().positive().nullable()).min(1).max(4),
    blocked: z.boolean().default(false),
});

export type PaletteEntryInput = z.infer<typeof paletteEntrySchema>;

export type PaletteEntry = {
    paletteId: number;
    graphics: (number | null)[];
    blocked: boolean;
    updatedAt: string;
};

/**
 * Agrega o actualiza una entrada en la paleta de un mapa.
 * Valida que todos los gráficos referenciados existan en la base o catálogo base.
 */
export async function upsertPaletteEntry(
    mapNum: number,
    entry: PaletteEntryInput,
    accountId: string,
): Promise<PaletteEntry> {
    // Validar existencia de cada grafico referenciado
    for (let i = 0; i < entry.graphics.length; i++) {
        const grh = entry.graphics[i];
        if (grh != null) {
            if (grh >= UPLOADED_GRAPHIC_INDEX_START) {
                const exists = await pool.query(
                    `SELECT 1 FROM game_uploaded_graphics WHERE grh_index = $1 LIMIT 1`,
                    [grh],
                );
                if (exists.rowCount === 0) {
                    throw new Error(
                        `El grafico ${grh} no existe en la base de assets. Subilo antes de asignarlo a la paleta.`,
                    );
                }
            } else if (grh <= 0 || grh > 320151) {
                throw new Error(
                    `El indice de grafico ${grh} esta fuera de rango (1..320151).`,
                );
            }
        }
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        let paletteId = entry.paletteId;

        if (!paletteId) {
            await client.query(
                "LOCK TABLE game_map_palette_overrides IN SHARE ROW EXCLUSIVE MODE",
            );
            const nextIdResult = await client.query<{ next_id: number }>(
                `SELECT COALESCE(MAX(palette_id), 1000) + 1 AS next_id
                 FROM game_map_palette_overrides
                 WHERE map_num = $1`,
                [mapNum],
            );
            paletteId = Number(nextIdResult.rows[0]?.next_id ?? 1001);
        }

        const graphicsArray = entry.graphics.map((g) => (g == null ? 0 : g));

        const result = await client.query<{
            palette_id: number;
            graphics: number[];
            blocked: boolean;
            updated_at: Date;
        }>(
            `INSERT INTO game_map_palette_overrides
                 (map_num, palette_id, graphics, blocked, updated_by_account_id, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (map_num, palette_id) DO UPDATE
             SET graphics = EXCLUDED.graphics,
                 blocked = EXCLUDED.blocked,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()
             RETURNING palette_id, graphics, blocked, updated_at`,
            [mapNum, paletteId, graphicsArray, entry.blocked ?? false, accountId],
        );

        await client.query("COMMIT");

        const row = result.rows[0];
        return {
            paletteId: row.palette_id,
            graphics: row.graphics.map((g) => (g === 0 ? null : g)),
            blocked: row.blocked,
            updatedAt: row.updated_at.toISOString(),
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function listMapPalette(mapNum: number): Promise<PaletteEntry[]> {
    const result = await pool.query<{
        palette_id: number;
        graphics: number[];
        blocked: boolean;
        updated_at: Date;
    }>(
        `SELECT palette_id, graphics, blocked, updated_at
         FROM game_map_palette_overrides
         WHERE map_num = $1
         ORDER BY palette_id ASC`,
        [mapNum],
    );

    return result.rows.map((row) => ({
        paletteId: row.palette_id,
        graphics: row.graphics.map((g) => (g === 0 ? null : g)),
        blocked: row.blocked,
        updatedAt: row.updated_at.toISOString(),
    }));
}
