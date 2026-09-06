/**
 * Etapa 2 (#8): place / move / remove / list map NPCs on worldBuilder drafts.
 * Validates catalog, blocked terrain, stacking, and MAX_NPCS_PER_MAP.
 */

import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import pool from "../db";
import {
    MAP_SIZE,
    MAX_NPCS_PER_MAP,
    NpcPlacementValidationError,
    assertInBounds,
    assertTileFree,
    assertTileNotBlocked,
    assertUnderMapNpcLimit,
    assertValidNpcIndex,
    isTerrainTileBlocked,
    normalizeMovement,
    planNpcMove,
    type TerrainSnapshot,
} from "../lib/mapNpcPlacement";

export const placeNpcSchema = z.object({
    x: z.coerce.number().int().min(1).max(MAP_SIZE),
    y: z.coerce.number().int().min(1).max(MAP_SIZE),
    npcIndex: z.coerce.number().int().positive(),
    movement: z.coerce.number().int().nonnegative().optional(),
});

export const moveNpcSchema = z.object({
    fromX: z.coerce.number().int().min(1).max(MAP_SIZE),
    fromY: z.coerce.number().int().min(1).max(MAP_SIZE),
    toX: z.coerce.number().int().min(1).max(MAP_SIZE),
    toY: z.coerce.number().int().min(1).max(MAP_SIZE),
});

export type MapNpcEntity = {
    x: number;
    y: number;
    npcIndex: number;
    movement?: number;
    status: "draft" | "published";
};

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

export async function loadTerrainSnapshot(mapNum: number): Promise<TerrainSnapshot> {
    const terrainPath = path.join(
        resolveMapsSourceDir(),
        `mapa_${mapNum}`,
        "terrain.json",
    );
    if (!existsSync(terrainPath)) {
        throw new Error(`El mapa ${mapNum} no tiene terrain.json fuente.`);
    }
    const terrain = JSON.parse(await fs.readFile(terrainPath, "utf8")) as {
        width?: number;
        height?: number;
        rows?: number[][];
        palette?: Record<string, { blocked?: boolean }>;
    };
    const width = Number(terrain.width) || MAP_SIZE;
    const height = Number(terrain.height) || MAP_SIZE;
    const rows = Array.isArray(terrain.rows) ? terrain.rows : [];
    const paletteBlocked = new Map<number, boolean>();
    for (const [id, entry] of Object.entries(terrain.palette ?? {})) {
        const parsedId = Number.parseInt(id, 10);
        if (Number.isInteger(parsedId) && parsedId > 0) {
            paletteBlocked.set(parsedId, Boolean(entry?.blocked));
        }
    }
    return { width, height, rows, paletteBlocked };
}

type Queryable = {
    query: (
        text: string,
        params?: unknown[],
    ) => Promise<{ rows: any[]; rowCount: number | null }>;
};

async function getOverrideBlocked(
    client: Queryable,
    mapNum: number,
    x: number,
    y: number,
): Promise<boolean | null> {
    const result = await client.query(
        `SELECT blocked FROM game_map_tile_overrides
         WHERE map_num = $1 AND x = $2 AND y = $3 AND layer = 1
           AND blocked IS NOT NULL
         ORDER BY CASE status WHEN 'draft' THEN 0 ELSE 1 END
         LIMIT 1`,
        [mapNum, x, y],
    );
    const row = result.rows[0] as { blocked: boolean } | undefined;
    return row ? Boolean(row.blocked) : null;
}

async function assertNpcExists(client: Queryable, npcIndex: number): Promise<void> {
    assertValidNpcIndex(npcIndex);
    const exists = await client.query(
        `SELECT 1 FROM game_npcs WHERE id = $1 LIMIT 1`,
        [npcIndex],
    );
    if ((exists.rowCount ?? 0) === 0) {
        throw new NpcPlacementValidationError(
            "invalid_npc_index",
            `El NPC ${npcIndex} no existe en el catalogo.`,
        );
    }
}

function metaFromMovement(movement: number | undefined): Record<string, unknown> {
    return movement === undefined ? {} : { movement };
}

function movementFromMeta(meta: unknown): number | undefined {
    if (!meta || typeof meta !== "object") return undefined;
    const value = (meta as { movement?: unknown }).movement;
    return typeof value === "number" && Number.isInteger(value) && value >= 0
        ? value
        : undefined;
}

function toEntity(
    x: number,
    y: number,
    npcIndex: number,
    meta: unknown,
    status: string,
): MapNpcEntity {
    const movement = movementFromMeta(meta);
    return movement === undefined
        ? { x, y, npcIndex, status: status as "draft" | "published" }
        : { x, y, npcIndex, movement, status: status as "draft" | "published" };
}

/** Effective NPC placements (draft overlays published). */
export async function listMapNpcs(mapNum: number): Promise<MapNpcEntity[]> {
    const result = await pool.query<{
        x: number;
        y: number;
        entity_id: number;
        meta: Record<string, unknown> | null;
        status: string;
    }>(
        `SELECT DISTINCT ON (x, y) x, y, entity_id, meta, status
         FROM game_map_tile_entities
         WHERE map_num = $1 AND kind = 'npc'
         ORDER BY x, y, CASE status WHEN 'draft' THEN 0 ELSE 1 END`,
        [mapNum],
    );
    return result.rows.map((row) =>
        toEntity(row.x, row.y, row.entity_id, row.meta, row.status),
    );
}

async function countEffectiveNpcs(client: Queryable, mapNum: number): Promise<number> {
    const result = await client.query(
        `SELECT COUNT(*)::int AS n FROM (
            SELECT DISTINCT ON (x, y) x, y
            FROM game_map_tile_entities
            WHERE map_num = $1 AND kind = 'npc'
            ORDER BY x, y, CASE status WHEN 'draft' THEN 0 ELSE 1 END
         ) t`,
        [mapNum],
    );
    return Number(result.rows[0]?.n ?? 0);
}

async function hasNpcAt(
    client: Queryable,
    mapNum: number,
    x: number,
    y: number,
): Promise<boolean> {
    const result = await client.query(
        `SELECT 1 FROM game_map_tile_entities
         WHERE map_num = $1 AND x = $2 AND y = $3 AND kind = 'npc'
         LIMIT 1`,
        [mapNum, x, y],
    );
    return (result.rowCount ?? 0) > 0;
}

async function assertPlaceableTile(
    client: Queryable,
    mapNum: number,
    x: number,
    y: number,
    terrain: TerrainSnapshot,
): Promise<void> {
    assertInBounds(x, y);
    const overrideBlocked = await getOverrideBlocked(client, mapNum, x, y);
    assertTileNotBlocked(
        isTerrainTileBlocked(terrain, x, y, overrideBlocked),
        x,
        y,
    );
    assertTileFree(await hasNpcAt(client, mapNum, x, y), x, y);
}

export async function placeMapNpc(
    mapNum: number,
    input: z.infer<typeof placeNpcSchema>,
    accountId: string,
): Promise<{ placed: true; npcIndex: number; movement?: number; count: number }> {
    const movement = normalizeMovement(input.movement);
    assertInBounds(input.x, input.y);
    const terrain = await loadTerrainSnapshot(mapNum);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertNpcExists(client, input.npcIndex);
        await assertPlaceableTile(client, mapNum, input.x, input.y, terrain);
        const count = await countEffectiveNpcs(client, mapNum);
        assertUnderMapNpcLimit(count, 1);
        await client.query(
            `INSERT INTO game_map_tile_entities
                 (map_num, x, y, kind, entity_id, meta, status, updated_by_account_id, updated_at)
             VALUES ($1,$2,$3,'npc',$4,$5::jsonb,'draft',$6,NOW())`,
            [
                mapNum,
                input.x,
                input.y,
                input.npcIndex,
                JSON.stringify(metaFromMovement(movement)),
                accountId,
            ],
        );
        await client.query("COMMIT");
        return movement === undefined
            ? { placed: true, npcIndex: input.npcIndex, count: count + 1 }
            : {
                  placed: true,
                  npcIndex: input.npcIndex,
                  movement,
                  count: count + 1,
              };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function moveMapNpc(
    mapNum: number,
    input: z.infer<typeof moveNpcSchema>,
    accountId: string,
): Promise<{ moved: true; noop?: true; npcIndex: number; movement?: number }> {
    const plan = planNpcMove(
        { x: input.fromX, y: input.fromY },
        { x: input.toX, y: input.toY },
    );
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const current = await client.query<{
            entity_id: number;
            meta: Record<string, unknown> | null;
        }>(
            `SELECT entity_id, meta FROM game_map_tile_entities
             WHERE map_num=$1 AND x=$2 AND y=$3 AND kind='npc' AND status='draft'
             FOR UPDATE`,
            [mapNum, plan.from.x, plan.from.y],
        );
        const row = current.rows[0];
        if (!row) {
            throw new NpcPlacementValidationError(
                "npc_not_found",
                `No hay NPC borrador en (${plan.from.x},${plan.from.y}).`,
            );
        }
        const movement = movementFromMeta(row.meta);
        if (plan.noop) {
            await client.query("COMMIT");
            return movement === undefined
                ? { moved: true, noop: true, npcIndex: row.entity_id }
                : { moved: true, noop: true, npcIndex: row.entity_id, movement };
        }

        const terrain = await loadTerrainSnapshot(mapNum);
        await assertPlaceableTile(client, mapNum, plan.to.x, plan.to.y, terrain);

        await client.query(
            `DELETE FROM game_map_tile_entities
             WHERE map_num=$1 AND x=$2 AND y=$3 AND kind='npc' AND status='draft'`,
            [mapNum, plan.from.x, plan.from.y],
        );
        await client.query(
            `INSERT INTO game_map_tile_entities
                 (map_num, x, y, kind, entity_id, meta, status, updated_by_account_id, updated_at)
             VALUES ($1,$2,$3,'npc',$4,$5::jsonb,'draft',$6,NOW())`,
            [
                mapNum,
                plan.to.x,
                plan.to.y,
                row.entity_id,
                JSON.stringify(metaFromMovement(movement)),
                accountId,
            ],
        );
        await client.query("COMMIT");
        return movement === undefined
            ? { moved: true, npcIndex: row.entity_id }
            : { moved: true, npcIndex: row.entity_id, movement };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function removeMapNpc(
    mapNum: number,
    x: number,
    y: number,
): Promise<{ removed: boolean }> {
    assertInBounds(x, y);
    const removed = await pool.query(
        `DELETE FROM game_map_tile_entities
         WHERE map_num=$1 AND x=$2 AND y=$3 AND kind='npc' AND status='draft'`,
        [mapNum, x, y],
    );
    return { removed: (removed.rowCount ?? 0) > 0 };
}

export { MAX_NPCS_PER_MAP, NpcPlacementValidationError };
