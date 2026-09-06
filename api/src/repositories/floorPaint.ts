/**
 * Floor paint persistence for OpenAO #7.
 * All mutations go through worldBuilder.paintTiles (atomic draft TX + audit columns).
 */
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import pool from "../db";
import {
    FloorPaintValidationError,
    MAP_SIZE,
    MAX_PAINT_TILES,
    analyzeWalkability,
    applyBlockedOverrides,
    assertInBounds,
    buildBlockedGridFromTerrain,
    expandRectangle,
    expandSelection,
    planPalettePaint,
    type PaletteEntry,
    type Point,
    type WalkabilityReport,
} from "../lib/floorPaint";
import {
    listMapOverrides,
    paintTiles,
    type MapTileOverride,
    type TilePaint,
} from "./worldBuilder";

type TerrainJson = {
    id?: number;
    width?: number;
    height?: number;
    palette?: Record<string, { blocked?: boolean; graphics?: unknown }>;
    rows?: number[][];
};

function resolveMapsSourceDir(): string {
    const override = process.env.OPENAO_MAPS_SOURCE?.trim();
    if (override) return path.resolve(override);

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

async function loadTerrain(mapNum: number): Promise<TerrainJson> {
    const terrainPath = path.join(
        resolveMapsSourceDir(),
        `mapa_${mapNum}`,
        "terrain.json",
    );

    if (!existsSync(terrainPath)) {
        const error = new FloorPaintValidationError(
            "palette_missing",
            `El mapa ${mapNum} no tiene terrain.json fuente.`,
        );
        (error as Error & { statusCode?: number }).statusCode = 404;
        throw error;
    }

    return JSON.parse(await fs.readFile(terrainPath, "utf8")) as TerrainJson;
}

function parsePaletteEntry(
    paletteId: number,
    terrain: TerrainJson,
): PaletteEntry {
    if (!Number.isInteger(paletteId) || paletteId <= 0) {
        throw new FloorPaintValidationError(
            "invalid_palette_id",
            `paletteId invalido: ${String(paletteId)}.`,
        );
    }

    const raw = terrain.palette?.[String(paletteId)];
    if (!raw) {
        throw new FloorPaintValidationError(
            "palette_missing",
            `La entrada de paleta ${paletteId} no existe en el mapa.`,
        );
    }

    const rawGraphics = Array.isArray(raw.graphics)
        ? raw.graphics
        : [raw.graphics];
    const graphics = rawGraphics.map((grh) => {
        const parsed = Number(grh);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    });

    return {
        id: paletteId,
        graphics,
        blocked: Boolean(raw.blocked),
    };
}

export async function resolveMapPaletteEntry(
    mapNum: number,
    paletteId: number,
): Promise<PaletteEntry> {
    return parsePaletteEntry(paletteId, await loadTerrain(mapNum));
}

const pointSchema = z.object({
    x: z.coerce.number().int().min(1).max(MAP_SIZE),
    y: z.coerce.number().int().min(1).max(MAP_SIZE),
});

export const paintFloorTileSchema = z.object({
    x: z.coerce.number().int().min(1).max(MAP_SIZE),
    y: z.coerce.number().int().min(1).max(MAP_SIZE),
    paletteId: z.coerce.number().int().positive(),
    blocked: z.boolean().optional(),
});

export const paintFloorRectangleSchema = z.object({
    fromX: z.coerce.number().int().min(1).max(MAP_SIZE),
    fromY: z.coerce.number().int().min(1).max(MAP_SIZE),
    toX: z.coerce.number().int().min(1).max(MAP_SIZE),
    toY: z.coerce.number().int().min(1).max(MAP_SIZE),
    paletteId: z.coerce.number().int().positive(),
    blocked: z.boolean().optional(),
});

export const paintFloorSelectionSchema = z.object({
    tiles: z.array(pointSchema).min(1).max(MAX_PAINT_TILES),
    paletteId: z.coerce.number().int().positive(),
    blocked: z.boolean().optional(),
});

export const setBlockedSchema = z
    .object({
        blocked: z.boolean(),
        fromX: z.coerce.number().int().min(1).max(MAP_SIZE).optional(),
        fromY: z.coerce.number().int().min(1).max(MAP_SIZE).optional(),
        toX: z.coerce.number().int().min(1).max(MAP_SIZE).optional(),
        toY: z.coerce.number().int().min(1).max(MAP_SIZE).optional(),
        tiles: z.array(pointSchema).min(1).max(MAX_PAINT_TILES).optional(),
    })
    .superRefine((value, ctx) => {
        const hasRect =
            value.fromX != null &&
            value.fromY != null &&
            value.toX != null &&
            value.toY != null;
        const hasSelection = Array.isArray(value.tiles) && value.tiles.length > 0;
        if (hasRect === hasSelection) {
            ctx.addIssue({
                code: "custom",
                message:
                    "Indica un rectangulo (fromX/fromY/toX/toY) o una seleccion (tiles), no ambos ni ninguno.",
            });
        }
    });

export const queryFloorRegionSchema = z.object({
    fromX: z.coerce.number().int().min(1).max(MAP_SIZE),
    fromY: z.coerce.number().int().min(1).max(MAP_SIZE),
    toX: z.coerce.number().int().min(1).max(MAP_SIZE),
    toY: z.coerce.number().int().min(1).max(MAP_SIZE),
});

export type PaintFloorResult = {
    applied: number;
    tileCount: number;
    layerWrites: number;
    paletteId: number;
    walkability?: WalkabilityReport;
};

function toWorldBuilderPaints(plans: ReturnType<typeof planPalettePaint>): TilePaint[] {
    return plans.map((plan) => ({
        x: plan.x,
        y: plan.y,
        layer: plan.layer,
        grhIndex: plan.grhIndex,
        blocked: plan.blocked,
    }));
}

async function paintPointsWithPalette(
    mapNum: number,
    points: Point[],
    paletteId: number,
    accountId: string,
    blockedOverride?: boolean,
): Promise<PaintFloorResult> {
    const entry = await resolveMapPaletteEntry(mapNum, paletteId);
    const plans = planPalettePaint(points, entry, blockedOverride);
    const result = await paintTiles(mapNum, toWorldBuilderPaints(plans), accountId);

    const walkability = await analyzeMapWalkability(mapNum);

    return {
        applied: result.applied,
        tileCount: points.length,
        layerWrites: plans.length,
        paletteId: entry.id,
        walkability,
    };
}

export async function paintFloorTile(
    mapNum: number,
    input: z.infer<typeof paintFloorTileSchema>,
    accountId: string,
): Promise<PaintFloorResult> {
    return paintPointsWithPalette(
        mapNum,
        [{ x: input.x, y: input.y }],
        input.paletteId,
        accountId,
        input.blocked,
    );
}

export async function paintFloorRectangle(
    mapNum: number,
    input: z.infer<typeof paintFloorRectangleSchema>,
    accountId: string,
): Promise<PaintFloorResult> {
    const points = expandRectangle(
        input.fromX,
        input.fromY,
        input.toX,
        input.toY,
    );
    return paintPointsWithPalette(
        mapNum,
        points,
        input.paletteId,
        accountId,
        input.blocked,
    );
}

export async function paintFloorSelection(
    mapNum: number,
    input: z.infer<typeof paintFloorSelectionSchema>,
    accountId: string,
): Promise<PaintFloorResult> {
    const points = expandSelection(input.tiles);
    return paintPointsWithPalette(
        mapNum,
        points,
        input.paletteId,
        accountId,
        input.blocked,
    );
}

/**
 * Blocked-only mutation that preserves existing draft/published graphics.
 * Differentiator vs competitors that null out grhIndex when setting blocked.
 */
export async function setFloorBlocked(
    mapNum: number,
    input: z.infer<typeof setBlockedSchema>,
    accountId: string,
): Promise<{ applied: number; tileCount: number; walkability: WalkabilityReport }> {
    const points =
        input.tiles && input.tiles.length > 0
            ? expandSelection(input.tiles)
            : expandRectangle(
                  input.fromX!,
                  input.fromY!,
                  input.toX!,
                  input.toY!,
              );

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (const point of points) {
            const existing = await client.query<{ grh_index: number | null }>(
                `SELECT grh_index
                 FROM game_map_tile_overrides
                 WHERE map_num = $1 AND x = $2 AND y = $3 AND layer = 1
                 ORDER BY status ASC
                 LIMIT 1`,
                [mapNum, point.x, point.y],
            );
            const grhIndex = existing.rows[0]?.grh_index ?? null;

            await client.query(
                `INSERT INTO game_map_tile_overrides
                     (map_num, x, y, layer, grh_index, blocked, status, updated_by_account_id, updated_at)
                 VALUES ($1, $2, $3, 1, $4, $5, 'draft', $6, NOW())
                 ON CONFLICT (map_num, x, y, layer, status) DO UPDATE
                 SET blocked = EXCLUDED.blocked,
                     updated_by_account_id = EXCLUDED.updated_by_account_id,
                     updated_at = NOW()`,
                [mapNum, point.x, point.y, grhIndex, input.blocked, accountId],
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    return {
        applied: points.length,
        tileCount: points.length,
        walkability: await analyzeMapWalkability(mapNum),
    };
}

export type FloorRegionTile = {
    x: number;
    y: number;
    paletteId: number;
    graphics: Array<number | null>;
    blocked: boolean;
    override: MapTileOverride | null;
};

/**
 * Effective region state: base terrain palette + draft-preferred overrides.
 */
export async function queryFloorRegion(
    mapNum: number,
    input: z.infer<typeof queryFloorRegionSchema>,
): Promise<{
    mapNum: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    tiles: FloorRegionTile[];
}> {
    // Queries are not paint mutations: allow up to the full 100×100 map.
    assertInBounds(input.fromX, input.fromY, "from");
    assertInBounds(input.toX, input.toY, "to");
    const minX = Math.min(input.fromX, input.toX);
    const maxX = Math.max(input.fromX, input.toX);
    const minY = Math.min(input.fromY, input.toY);
    const maxY = Math.max(input.fromY, input.toY);

    const terrain = await loadTerrain(mapNum);
    const rows = terrain.rows ?? [];
    const palette = terrain.palette ?? {};
    const overrides = await listMapOverrides(mapNum, true);
    const overrideByTile = new Map<string, MapTileOverride>();

    for (const override of overrides) {
        if (
            override.x < minX ||
            override.x > maxX ||
            override.y < minY ||
            override.y > maxY
        ) {
            continue;
        }
        // Layer-1 carries blocked; keep richest override snapshot per tile.
        const key = `${override.x},${override.y}`;
        const previous = overrideByTile.get(key);
        if (!previous || override.layer === 1) {
            overrideByTile.set(key, override);
        }
    }

    // Also collect all layer overrides for graphics merge.
    const layerOverrides = new Map<string, MapTileOverride>();
    for (const override of overrides) {
        if (
            override.x < minX ||
            override.x > maxX ||
            override.y < minY ||
            override.y > maxY
        ) {
            continue;
        }
        layerOverrides.set(
            `${override.x},${override.y},${override.layer}`,
            override,
        );
    }

    const tiles: FloorRegionTile[] = [];

    for (let y = minY; y <= maxY; y++) {
        const row = Array.isArray(rows[y - 1]) ? rows[y - 1]! : [];
        for (let x = minX; x <= maxX; x++) {
            const paletteId = Number(row[x - 1]) || 0;
            const entry =
                paletteId > 0
                    ? parsePaletteEntrySafe(paletteId, terrain)
                    : null;
            const graphics = [...(entry?.graphics ?? [])];
            while (graphics.length < 4) graphics.push(null);

            for (let layer = 1; layer <= 4; layer++) {
                const layerOverride = layerOverrides.get(`${x},${y},${layer}`);
                if (layerOverride && layerOverride.grhIndex !== undefined) {
                    graphics[layer - 1] = layerOverride.grhIndex;
                }
            }

            const tileOverride = overrideByTile.get(`${x},${y}`) ?? null;
            let blocked = Boolean(entry?.blocked);
            if (tileOverride?.blocked !== null && tileOverride?.blocked !== undefined) {
                blocked = tileOverride.blocked;
            }

            tiles.push({
                x,
                y,
                paletteId,
                graphics,
                blocked,
                override: tileOverride,
            });
        }
    }

    return {
        mapNum,
        fromX: minX,
        fromY: minY,
        toX: maxX,
        toY: maxY,
        tiles,
    };
}

function parsePaletteEntrySafe(
    paletteId: number,
    terrain: TerrainJson,
): PaletteEntry | null {
    try {
        return parsePaletteEntry(paletteId, terrain);
    } catch {
        return null;
    }
}

export async function analyzeMapWalkability(
    mapNum: number,
): Promise<WalkabilityReport> {
    const terrain = await loadTerrain(mapNum);
    const width = Math.max(
        1,
        Math.min(MAP_SIZE, Number(terrain.width) || MAP_SIZE),
    );
    const height = Math.max(
        1,
        Math.min(MAP_SIZE, Number(terrain.height) || MAP_SIZE),
    );
    const grid = buildBlockedGridFromTerrain(
        terrain.rows ?? [],
        terrain.palette ?? {},
        width,
        height,
    );

    const overrides = await listMapOverrides(mapNum, true);
    applyBlockedOverrides(
        grid,
        overrides.map((o) => ({ x: o.x, y: o.y, blocked: o.blocked })),
    );

    return analyzeWalkability(grid);
}

export { FloorPaintValidationError, MAX_PAINT_TILES, MAP_SIZE };
