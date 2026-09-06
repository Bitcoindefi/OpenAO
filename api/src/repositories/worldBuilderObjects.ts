/**
 * Etapa 2 (#9): floor objects (amount + move), multi-tile structures,
 * doors with collision state, and text signs — on top of existing worldBuilder drafts.
 */

import { z } from "zod";
import pool from "../db";
import {
    PlacementValidationError,
    assertInBounds,
    assertValidObjIndex,
    doorBlocksWhen,
    normalizeObjectAmount,
    normalizeSignText,
    planObjectMove,
    structureBoundingBox,
    validateStructureTiles,
    type DoorState,
    type StructureTile,
} from "../lib/mapObjectPlacement";
import { MAP_SIZE, paintTiles, type TilePaint } from "../repositories/worldBuilder";

export const floorObjectSchema = z.object({
    x: z.coerce.number().int().min(1).max(MAP_SIZE),
    y: z.coerce.number().int().min(1).max(MAP_SIZE),
    objIndex: z.coerce.number().int().positive(),
    amount: z.coerce.number().int().positive().optional(),
});

export const moveFloorObjectSchema = z.object({
    fromX: z.coerce.number().int().min(1).max(MAP_SIZE),
    fromY: z.coerce.number().int().min(1).max(MAP_SIZE),
    toX: z.coerce.number().int().min(1).max(MAP_SIZE),
    toY: z.coerce.number().int().min(1).max(MAP_SIZE),
});

export const structureSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    tiles: z
        .array(
            z.object({
                x: z.coerce.number().int().min(1).max(MAP_SIZE),
                y: z.coerce.number().int().min(1).max(MAP_SIZE),
                layer: z.union([z.literal(3), z.literal(4)]),
                grhIndex: z.coerce.number().int().positive(),
                blocked: z.boolean().optional(),
            }),
        )
        .min(1)
        .max(500),
});

export const doorSchema = z.object({
    x: z.coerce.number().int().min(1).max(MAP_SIZE),
    y: z.coerce.number().int().min(1).max(MAP_SIZE),
    objIndex: z.coerce.number().int().positive(),
    state: z.enum(["open", "closed"]).default("closed"),
});

export const doorStateSchema = z.object({
    state: z.enum(["open", "closed"]),
});

export const signSchema = z.object({
    x: z.coerce.number().int().min(1).max(MAP_SIZE),
    y: z.coerce.number().int().min(1).max(MAP_SIZE),
    objIndex: z.coerce.number().int().positive(),
    text: z.string().min(1).max(200),
});

async function assertObjectExists(client: { query: Function }, objIndex: number): Promise<void> {
    assertValidObjIndex(objIndex);
    const exists = await client.query(`SELECT 1 FROM game_objects WHERE id = $1 LIMIT 1`, [objIndex]);
    if (exists.rowCount === 0) {
        throw new PlacementValidationError(
            "invalid_obj_index",
            `El objeto ${objIndex} no existe.`,
        );
    }
}

export async function placeFloorObject(
    mapNum: number,
    input: z.infer<typeof floorObjectSchema>,
    accountId: string,
): Promise<{ placed: true; amount: number }> {
    const amount = normalizeObjectAmount(input.amount);
    assertInBounds(input.x, input.y);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertObjectExists(client, input.objIndex);
        await client.query(
            `INSERT INTO game_map_tile_entities
                 (map_num, x, y, kind, entity_id, amount, meta, status, updated_by_account_id, updated_at)
             VALUES ($1,$2,$3,'obj',$4,$5,$6::jsonb,'draft',$7,NOW())
             ON CONFLICT (map_num, x, y, kind, status) DO UPDATE
             SET entity_id = EXCLUDED.entity_id,
                 amount = EXCLUDED.amount,
                 meta = EXCLUDED.meta,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()`,
            [mapNum, input.x, input.y, input.objIndex, amount, JSON.stringify({ role: "floor" }), accountId],
        );
        await client.query("COMMIT");
        return { placed: true, amount };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function moveFloorObject(
    mapNum: number,
    input: z.infer<typeof moveFloorObjectSchema>,
    accountId: string,
): Promise<{ moved: true; objIndex: number; amount: number }> {
    const { from, to } = planObjectMove(
        { x: input.fromX, y: input.fromY },
        { x: input.toX, y: input.toY },
    );
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const current = await client.query<{
            entity_id: number;
            amount: number;
            meta: unknown;
        }>(
            `SELECT entity_id, amount, meta FROM game_map_tile_entities
             WHERE map_num=$1 AND x=$2 AND y=$3 AND kind='obj' AND status='draft'
             FOR UPDATE`,
            [mapNum, from.x, from.y],
        );
        const row = current.rows[0];
        if (!row) {
            throw new Error(`No hay objeto borrador en (${from.x},${from.y}).`);
        }
        await client.query(
            `DELETE FROM game_map_tile_entities
             WHERE map_num=$1 AND x=$2 AND y=$3 AND kind='obj' AND status='draft'`,
            [mapNum, from.x, from.y],
        );
        await client.query(
            `INSERT INTO game_map_tile_entities
                 (map_num, x, y, kind, entity_id, amount, meta, status, updated_by_account_id, updated_at)
             VALUES ($1,$2,$3,'obj',$4,$5,$6::jsonb,'draft',$7,NOW())
             ON CONFLICT (map_num, x, y, kind, status) DO UPDATE
             SET entity_id = EXCLUDED.entity_id,
                 amount = EXCLUDED.amount,
                 meta = EXCLUDED.meta,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()`,
            [
                mapNum,
                to.x,
                to.y,
                row.entity_id,
                row.amount ?? 1,
                JSON.stringify(row.meta ?? { role: "floor" }),
                accountId,
            ],
        );
        await client.query("COMMIT");
        return { moved: true, objIndex: row.entity_id, amount: row.amount ?? 1 };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function placeStructure(
    mapNum: number,
    input: z.infer<typeof structureSchema>,
    accountId: string,
): Promise<{ applied: number; bounds: ReturnType<typeof structureBoundingBox>; name?: string }> {
    const tiles = validateStructureTiles(input.tiles as StructureTile[]);
    const bounds = structureBoundingBox(tiles);
    const paint: TilePaint[] = tiles.map((tile) => ({
        x: tile.x,
        y: tile.y,
        layer: tile.layer,
        grhIndex: tile.grhIndex,
        blocked: tile.blocked ?? null,
    }));
    // paintTiles already wraps BEGIN/COMMIT — one atomic structure op.
    const result = await paintTiles(mapNum, paint, accountId);
    return { applied: result.applied, bounds, name: input.name };
}

export async function placeDoor(
    mapNum: number,
    input: z.infer<typeof doorSchema>,
    accountId: string,
): Promise<{ placed: true; state: DoorState; blocked: boolean }> {
    const state = input.state;
    const blocked = doorBlocksWhen(state);
    assertInBounds(input.x, input.y);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertObjectExists(client, input.objIndex);
        await client.query(
            `INSERT INTO game_map_tile_entities
                 (map_num, x, y, kind, entity_id, amount, meta, status, updated_by_account_id, updated_at)
             VALUES ($1,$2,$3,'obj',$4,1,$5::jsonb,'draft',$6,NOW())
             ON CONFLICT (map_num, x, y, kind, status) DO UPDATE
             SET entity_id = EXCLUDED.entity_id,
                 amount = 1,
                 meta = EXCLUDED.meta,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()`,
            [
                mapNum,
                input.x,
                input.y,
                input.objIndex,
                JSON.stringify({ role: "door", state }),
                accountId,
            ],
        );
        await client.query(
            `INSERT INTO game_map_tile_overrides
                 (map_num, x, y, layer, grh_index, blocked, status, updated_by_account_id, updated_at)
             VALUES ($1,$2,$3,1,NULL,$4,'draft',$5,NOW())
             ON CONFLICT (map_num, x, y, layer, status) DO UPDATE
             SET blocked = EXCLUDED.blocked,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()`,
            [mapNum, input.x, input.y, blocked, accountId],
        );
        await client.query("COMMIT");
        return { placed: true, state, blocked };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function setDoorState(
    mapNum: number,
    x: number,
    y: number,
    state: DoorState,
    accountId: string,
): Promise<{ updated: true; state: DoorState; blocked: boolean }> {
    assertInBounds(x, y);
    const blocked = doorBlocksWhen(state);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const current = await client.query<{ meta: { role?: string; state?: string } | null }>(
            `SELECT meta FROM game_map_tile_entities
             WHERE map_num=$1 AND x=$2 AND y=$3 AND kind='obj' AND status='draft'
             FOR UPDATE`,
            [mapNum, x, y],
        );
        const row = current.rows[0];
        if (!row || row.meta?.role !== "door") {
            throw new Error(`No hay puerta borrador en (${x},${y}).`);
        }
        await client.query(
            `UPDATE game_map_tile_entities
             SET meta = $4::jsonb,
                 updated_by_account_id = $5,
                 updated_at = NOW()
             WHERE map_num=$1 AND x=$2 AND y=$3 AND kind='obj' AND status='draft'`,
            [mapNum, x, y, JSON.stringify({ role: "door", state }), accountId],
        );
        await client.query(
            `INSERT INTO game_map_tile_overrides
                 (map_num, x, y, layer, grh_index, blocked, status, updated_by_account_id, updated_at)
             VALUES ($1,$2,$3,1,NULL,$4,'draft',$5,NOW())
             ON CONFLICT (map_num, x, y, layer, status) DO UPDATE
             SET blocked = EXCLUDED.blocked,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()`,
            [mapNum, x, y, blocked, accountId],
        );
        await client.query("COMMIT");
        return { updated: true, state, blocked };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function placeSign(
    mapNum: number,
    input: z.infer<typeof signSchema>,
    accountId: string,
): Promise<{ placed: true; text: string }> {
    const text = normalizeSignText(input.text);
    assertInBounds(input.x, input.y);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertObjectExists(client, input.objIndex);
        await client.query(
            `INSERT INTO game_map_tile_entities
                 (map_num, x, y, kind, entity_id, amount, meta, status, updated_by_account_id, updated_at)
             VALUES ($1,$2,$3,'obj',$4,1,$5::jsonb,'draft',$6,NOW())
             ON CONFLICT (map_num, x, y, kind, status) DO UPDATE
             SET entity_id = EXCLUDED.entity_id,
                 amount = 1,
                 meta = EXCLUDED.meta,
                 updated_by_account_id = EXCLUDED.updated_by_account_id,
                 updated_at = NOW()`,
            [
                mapNum,
                input.x,
                input.y,
                input.objIndex,
                JSON.stringify({ role: "sign", text }),
                accountId,
            ],
        );
        await client.query("COMMIT");
        return { placed: true, text };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export { PlacementValidationError };
