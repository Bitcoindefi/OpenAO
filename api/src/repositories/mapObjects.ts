import pool from "../db";

export const MAP_SIZE = 100;

export type MapObjectState = "placed" | "structure" | "door_open" | "door_closed" | "sign";

export type MapObjectRecord = {
    id: number;
    mapId: number;
    x: number;
    y: number;
    objIndex: number;
    amount: number;
    state: MapObjectState;
    createdBy: string | null;
    createdAt: string;
};

export type StructureTileInput = {
    x: number;
    y: number;
    objIndex: number;
    amount?: number;
    state?: MapObjectState;
};

export const ALLOWED_MAP_OBJECT_STATES: MapObjectState[] = [
    "placed",
    "structure",
    "door_open",
    "door_closed",
    "sign",
];

export function validateState(state: unknown): asserts state is MapObjectState {
    if (typeof state !== "string" || !ALLOWED_MAP_OBJECT_STATES.includes(state as MapObjectState)) {
        throw new Error(`Estado no valido. Permitidos: ${ALLOWED_MAP_OBJECT_STATES.join(", ")}`);
    }
}

function validateCoordinates(x: unknown, y: unknown): void {
    if (!Number.isInteger(x) || !Number.isInteger(y) || (x as number) < 1 || (x as number) > MAP_SIZE || (y as number) < 1 || (y as number) > MAP_SIZE) {
        throw new Error(`Coordenadas fuera de rango (1-${MAP_SIZE}): (${x}, ${y})`);
    }
}

export async function placeObject(
    mapId: number,
    x: number,
    y: number,
    objIndex: number,
    amount: number = 1,
    createdBy: string | null = null,
    state: MapObjectState = "placed"
): Promise<MapObjectRecord> {
    if (!Number.isInteger(mapId) || mapId < 1) {
        throw new Error("mapId debe ser un entero positivo");
    }
    validateCoordinates(x, y);
    if (!Number.isInteger(objIndex) || objIndex <= 0) {
        throw new Error("objIndex debe ser mayor a 0");
    }
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error("amount debe ser mayor a 0");
    }
    validateState(state);

    const res = await pool.query(
        `INSERT INTO game_map_objects (map_id, x, y, obj_index, amount, state, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, map_id AS "mapId", x, y, obj_index AS "objIndex", amount, state, created_by AS "createdBy", created_at AS "createdAt"`,
        [mapId, x, y, objIndex, amount, state, createdBy]
    );
    return res.rows[0];
}

export async function moveObject(id: number, newX: number, newY: number): Promise<MapObjectRecord | null> {
    validateCoordinates(newX, newY);
    const res = await pool.query(
        `UPDATE game_map_objects
         SET x = $1, y = $2
         WHERE id = $3
         RETURNING id, map_id AS "mapId", x, y, obj_index AS "objIndex", amount, state, created_by AS "createdBy", created_at AS "createdAt"`,
        [newX, newY, id]
    );
    return res.rows[0] || null;
}

export async function removeObject(id: number): Promise<boolean> {
    const res = await pool.query(`DELETE FROM game_map_objects WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
}

export async function getMapObjects(mapId: number): Promise<MapObjectRecord[]> {
    const res = await pool.query(
        `SELECT id, map_id AS "mapId", x, y, obj_index AS "objIndex", amount, state, created_by AS "createdBy", created_at AS "createdAt"
         FROM game_map_objects
         WHERE map_id = $1
         ORDER BY id ASC`,
        [mapId]
    );
    return res.rows;
}

export async function setObjectState(id: number, state: MapObjectState): Promise<MapObjectRecord | null> {
    if (!Number.isInteger(id) || id < 1) {
        throw new Error("id debe ser un entero positivo");
    }
    validateState(state);
    const res = await pool.query(
        `UPDATE game_map_objects
         SET state = $1
         WHERE id = $2
         RETURNING id, map_id AS "mapId", x, y, obj_index AS "objIndex", amount, state, created_by AS "createdBy", created_at AS "createdAt"`,
        [state, id]
    );
    return res.rows[0] || null;
}

export async function placeStructure(
    mapId: number,
    tiles: StructureTileInput[],
    createdBy: string | null = null
): Promise<MapObjectRecord[]> {
    if (!Number.isInteger(mapId) || mapId < 1) {
        throw new Error("mapId debe ser un entero positivo");
    }
    if (!Array.isArray(tiles) || !tiles.length) return [];

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const results: MapObjectRecord[] = [];
        for (const tile of tiles) {
            validateCoordinates(tile.x, tile.y);
            if (!Number.isInteger(tile.objIndex) || tile.objIndex <= 0) {
                throw new Error("objIndex debe ser mayor a 0");
            }
            const tileAmount = tile.amount ?? 1;
            if (!Number.isInteger(tileAmount) || tileAmount <= 0) {
                throw new Error("amount debe ser mayor a 0");
            }
            const tileState = tile.state ?? "structure";
            validateState(tileState);
            const res = await client.query(
                `INSERT INTO game_map_objects (map_id, x, y, obj_index, amount, state, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id, map_id AS "mapId", x, y, obj_index AS "objIndex", amount, state, created_by AS "createdBy", created_at AS "createdAt"`,
                [mapId, tile.x, tile.y, tile.objIndex, tileAmount, tileState, createdBy]
            );
            results.push(res.rows[0]);
        }
        await client.query("COMMIT");
        return results;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}
