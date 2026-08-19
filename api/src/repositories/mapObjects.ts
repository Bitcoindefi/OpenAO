import pool from "../db";

export interface MapObject {
    id: number;
    mapId: number;
    x: number;
    y: number;
    objIndex: number;
    amount: number;
    state: string;
    createdAt: string;
    createdBy: string;
}

const MAP_SIZE = 100;

function isValidCoord(x: number, y: number): boolean {
    return x >= 1 && x <= MAP_SIZE && y >= 1 && y <= MAP_SIZE;
}

export async function placeObject(
    mapId: number, x: number, y: number,
    objIndex: number, amount: number,
    createdBy: string,
): Promise<{ ok: true; id: number } | { ok: false; reason: string }> {
    if (!isValidCoord(x, y)) return { ok: false, reason: "Coordinates out of bounds" };
    if (objIndex < 1) return { ok: false, reason: "Invalid objIndex" };
    const result = await pool.query<{ id: number }>(
        "INSERT INTO game_map_objects (map_id, x, y, obj_index, amount, state, created_by, created_at) VALUES ($1, $2, $3, $4, $5, 'placed', $6, NOW()) RETURNING id",
        [mapId, x, y, objIndex, amount, createdBy],
    );
    return { ok: true, id: result.rows[0].id };
}

export async function moveObject(id: number, newX: number, newY: number): Promise<boolean> {
    if (!isValidCoord(newX, newY)) return false;
    const r = await pool.query(
        "UPDATE game_map_objects SET x = $1, y = $2 WHERE id = $3",
        [newX, newY, id],
    );
    return (r.rowCount || 0) > 0;
}

export async function removeObject(id: number): Promise<boolean> {
    const r = await pool.query("DELETE FROM game_map_objects WHERE id = $1", [id]);
    return (r.rowCount || 0) > 0;
}

export async function getMapObjects(mapId: number): Promise<MapObject[]> {
    const r = await pool.query(
        "SELECT id, map_id, x, y, obj_index, amount, state, created_at, created_by FROM game_map_objects WHERE map_id = $1 ORDER BY y, x, id",
        [mapId],
    );
    return r.rows.map(function(rr) {
        return {
            id: rr.id, mapId: rr.map_id, x: rr.x, y: rr.y,
            objIndex: rr.obj_index, amount: rr.amount, state: rr.state,
            createdAt: rr.created_at.toISOString(), createdBy: rr.created_by,
        };
    });
}

export async function setObjectState(id: number, state: string): Promise<boolean> {
    const r = await pool.query(
        "UPDATE game_map_objects SET state = $1 WHERE id = $2",
        [state, id],
    );
    return (r.rowCount || 0) > 0;
}

export async function placeStructure(
    mapId: number, tiles: { x: number; y: number; objIndex: number }[],
    createdBy: string,
): Promise<{ ok: true; ids: number[] } | { ok: false; reason: string }> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const ids: number[] = [];
        for (const tile of tiles) {
            if (!isValidCoord(tile.x, tile.y)) {
                await client.query("ROLLBACK");
                return { ok: false, reason: "Coordinate out of bounds: " + tile.x + "," + tile.y };
            }
            const ins = await client.query<{ id: number }>(
                "INSERT INTO game_map_objects (map_id, x, y, obj_index, amount, state, created_by, created_at) VALUES ($1, $2, $3, $4, 1, 'structure', $5, NOW()) RETURNING id",
                [mapId, tile.x, tile.y, tile.objIndex, createdBy],
            );
            ids.push(ins.rows[0].id);
        }
        await client.query("COMMIT");
        return { ok: true, ids: ids };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}