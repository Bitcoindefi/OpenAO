/**
 * Etapa 1 (#6): entradas de paleta nuevas sobre mapas, con validacion de
 * graficos contra el catalogo del motor + assets subidos.
 *
 * No reescribe terrain.json: las entradas viven en Postgres y se fusionan en
 * getMapTerrainPalette, igual que los tile overrides sobre el mapa base.
 */

import { z } from "zod";
import pool from "../db";
import {
    UPLOADED_GRAPHIC_INDEX_START,
    uploadedGraphicToEngineEntry,
    validatePaletteGraphics,
} from "../lib/graphicCatalog";

export { UPLOADED_GRAPHIC_INDEX_START };

export const paletteEntrySchema = z.object({
    /** Si se omite, se asigna el siguiente id libre para el mapa. */
    id: z.coerce.number().int().positive().optional(),
    graphics: z
        .array(z.number().int().positive().nullable())
        .min(1)
        .max(4),
    blocked: z.boolean().default(false),
});

export type PaletteEntryInput = z.infer<typeof paletteEntrySchema>;

export type PaletteOverrideEntry = {
    id: number;
    graphics: Array<number | null>;
    blocked: boolean;
    updatedAt: string;
    source: "override";
};

export class PaletteValidationError extends Error {
    readonly code = "palette_validation";

    constructor(message: string) {
        super(message);
        this.name = "PaletteValidationError";
    }
}

async function uploadedGraphicExists(grhIndex: number): Promise<boolean> {
    const result = await pool.query(
        `SELECT 1 FROM game_uploaded_graphics WHERE grh_index = $1 LIMIT 1`,
        [grhIndex],
    );
    return (result.rowCount ?? 0) > 0;
}

/**
 * Valida capas de paleta (o un unico grh al pintar) contra motor + subidos.
 */
export async function assertGraphicsExist(
    graphics: Array<number | null>,
): Promise<void> {
    const result = await validatePaletteGraphics(
        graphics,
        uploadedGraphicExists,
    );
    if (!result.ok) {
        throw new PaletteValidationError(result.reason);
    }
}

async function nextPaletteId(mapNum: number): Promise<number> {
    // Max entre terrain.json (via caller) no aplica aca: solo IDs de overrides
    // + un techo alto. El merge en getMapTerrainPalette evita colision con
    // ids fuente buscando el max entre fuente y overrides.
    const result = await pool.query<{ next_id: number }>(
        `SELECT COALESCE(MAX(palette_id), 0) + 1 AS next_id
         FROM game_map_palette_overrides
         WHERE map_num = $1`,
        [mapNum],
    );
    return Number(result.rows[0]?.next_id ?? 1);
}

/**
 * Asigna un id que no colisione con la paleta fuente del mapa ni con overrides.
 */
export async function allocatePaletteId(
    mapNum: number,
    sourceMaxId: number,
): Promise<number> {
    const overrideNext = await nextPaletteId(mapNum);
    return Math.max(sourceMaxId + 1, overrideNext);
}

export async function listPaletteOverrides(
    mapNum: number,
): Promise<PaletteOverrideEntry[]> {
    const result = await pool.query<{
        palette_id: number;
        graphics: unknown;
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
        id: row.palette_id,
        graphics: normalizeGraphics(row.graphics),
        blocked: row.blocked,
        updatedAt: row.updated_at.toISOString(),
        source: "override" as const,
    }));
}

function normalizeGraphics(raw: unknown): Array<number | null> {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw.map((value) => {
        if (value == null) {
            return null;
        }
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    });
}

export async function upsertPaletteEntry(
    mapNum: number,
    entry: PaletteEntryInput,
    accountId: string,
    sourceMaxId: number,
): Promise<PaletteOverrideEntry> {
    await assertGraphicsExist(entry.graphics);

    const paletteId =
        entry.id ?? (await allocatePaletteId(mapNum, sourceMaxId));

    if (!Number.isInteger(paletteId) || paletteId <= 0) {
        throw new PaletteValidationError("Id de paleta invalido.");
    }

    const result = await pool.query<{
        palette_id: number;
        graphics: unknown;
        blocked: boolean;
        updated_at: Date;
    }>(
        `INSERT INTO game_map_palette_overrides
             (map_num, palette_id, graphics, blocked, updated_by_account_id, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, NOW())
         ON CONFLICT (map_num, palette_id) DO UPDATE
         SET graphics = EXCLUDED.graphics,
             blocked = EXCLUDED.blocked,
             updated_by_account_id = EXCLUDED.updated_by_account_id,
             updated_at = NOW()
         RETURNING palette_id, graphics, blocked, updated_at`,
        [
            mapNum,
            paletteId,
            JSON.stringify(entry.graphics),
            entry.blocked,
            accountId,
        ],
    );

    const row = result.rows[0];
    if (!row) {
        throw new Error("No se pudo guardar la entrada de paleta.");
    }

    return {
        id: row.palette_id,
        graphics: normalizeGraphics(row.graphics),
        blocked: row.blocked,
        updatedAt: row.updated_at.toISOString(),
        source: "override",
    };
}

export async function deletePaletteEntry(
    mapNum: number,
    paletteId: number,
): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM game_map_palette_overrides
         WHERE map_num = $1 AND palette_id = $2`,
        [mapNum, paletteId],
    );
    return (result.rowCount ?? 0) > 0;
}

/**
 * Indice al estilo graficos.json para los PNG subidos (criterio #6.2).
 * Complementa GET /game-data/graphics (metadatos) para clientes que quieran
 * mergear sin reinventar la forma del catalogo.
 */
export async function listUploadedGraphicsIndex(
    limit = 500,
): Promise<Record<string, ReturnType<typeof uploadedGraphicToEngineEntry>>> {
    const result = await pool.query<{
        grh_index: number;
        width: number;
        height: number;
    }>(
        `SELECT grh_index, width, height
         FROM game_uploaded_graphics
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
    );

    const index: Record<
        string,
        ReturnType<typeof uploadedGraphicToEngineEntry>
    > = {};

    for (const row of result.rows) {
        index[String(row.grh_index)] = uploadedGraphicToEngineEntry({
            grhIndex: row.grh_index,
            width: row.width,
            height: row.height,
        });
    }

    return index;
}
