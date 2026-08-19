import pool from "../db";

export interface MapExit {
    sourceMapId: number;
    sourceX: number;
    sourceY: number;
    destinationMapId: number;
    destinationX: number;
    destinationY: number;
    createdBy: string;
    createdAt: string;
}

const MAP_SIZE = 100;

function isValidCoordinate(x: number, y: number): boolean {
    return x >= 1 && x <= MAP_SIZE && y >= 1 && y <= MAP_SIZE;
}

function mapExists(mapId: number): boolean {
    return mapId >= 1 && mapId <= 500;
}

export async function createExit(
    sourceMapId: number,
    sourceX: number,
    sourceY: number,
    destinationMapId: number,
    destinationX: number,
    destinationY: number,
    createdBy: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!isValidCoordinate(sourceX, sourceY)) {
        return { ok: false, reason: "Source coordinates out of bounds (1-" + MAP_SIZE + ")" };
    }
    if (!isValidCoordinate(destinationX, destinationY)) {
        return { ok: false, reason: "Destination coordinates out of bounds (1-" + MAP_SIZE + ")" };
    }
    if (!mapExists(sourceMapId)) {
        return { ok: false, reason: "Source map does not exist" };
    }
    if (!mapExists(destinationMapId)) {
        return { ok: false, reason: "Destination map does not exist" };
    }

    const existing = await pool.query<{ source_map_id: number }>(
        "SELECT source_map_id FROM game_map_exits WHERE source_map_id = $1 AND source_x = $2 AND source_y = $3 LIMIT 1",
        [sourceMapId, sourceX, sourceY],
    );
    if (existing.rows.length > 0) {
        return { ok: false, reason: "An exit already exists at this position" };
    }

    await pool.query(
        "INSERT INTO game_map_exits (source_map_id, source_x, source_y, destination_map_id, destination_x, destination_y, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())",
        [sourceMapId, sourceX, sourceY, destinationMapId, destinationX, destinationY, createdBy],
    );
    return { ok: true };
}

export async function createRoundTripExit(
    mapAId: number, mapAX: number, mapAY: number,
    mapBId: number, mapBX: number, mapBY: number,
    createdBy: string,
): Promise<{ ok: true; exits: number } | { ok: false; reason: string }> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const r1 = await client.query(
            "INSERT INTO game_map_exits (source_map_id, source_x, source_y, destination_map_id, destination_x, destination_y, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) ON CONFLICT DO NOTHING",
            [mapAId, mapAX, mapAY, mapBId, mapBX, mapBY, createdBy],
        );
        const r2 = await client.query(
            "INSERT INTO game_map_exits (source_map_id, source_x, source_y, destination_map_id, destination_x, destination_y, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) ON CONFLICT DO NOTHING",
            [mapBId, mapBX, mapBY, mapAId, mapAX, mapAY, createdBy],
        );

        await client.query("COMMIT");
        return { ok: true, exits: (r1.rowCount || 0) + (r2.rowCount || 0) };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function deleteExit(sourceMapId: number, sourceX: number, sourceY: number): Promise<boolean> {
    const result = await pool.query(
        "DELETE FROM game_map_exits WHERE source_map_id = $1 AND source_x = $2 AND source_y = $3",
        [sourceMapId, sourceX, sourceY],
    );
    return (result.rowCount || 0) > 0;
}

export async function getMapExits(mapId: number): Promise<MapExit[]> {
    const result = await pool.query<{
        source_map_id: number; source_x: number; source_y: number;
        destination_map_id: number; destination_x: number; destination_y: number;
        created_by: string; created_at: Date;
    }>(
        "SELECT source_map_id, source_x, source_y, destination_map_id, destination_x, destination_y, created_by, created_at FROM game_map_exits WHERE source_map_id = $1 ORDER BY source_x, source_y",
        [mapId],
    );
    return result.rows.map(function(r) {
        return {
            sourceMapId: r.source_map_id, sourceX: r.source_x, sourceY: r.source_y,
            destinationMapId: r.destination_map_id, destinationX: r.destination_x, destinationY: r.destination_y,
            createdBy: r.created_by, createdAt: r.created_at.toISOString(),
        };
    });
}

export async function getIncomingExits(mapId: number): Promise<MapExit[]> {
    const result = await pool.query<{
        source_map_id: number; source_x: number; source_y: number;
        destination_map_id: number; destination_x: number; destination_y: number;
        created_by: string; created_at: Date;
    }>(
        "SELECT source_map_id, source_x, source_y, destination_map_id, destination_x, destination_y, created_by, created_at FROM game_map_exits WHERE destination_map_id = $1 ORDER BY source_map_id, source_x, source_y",
        [mapId],
    );
    return result.rows.map(function(r) {
        return {
            sourceMapId: r.source_map_id, sourceX: r.source_x, sourceY: r.source_y,
            destinationMapId: r.destination_map_id, destinationX: r.destination_x, destinationY: r.destination_y,
            createdBy: r.created_by, createdAt: r.created_at.toISOString(),
        };
    });
}

export async function listOrphanMaps(): Promise<{ mapId: number }[]> {
    const result = await pool.query<{ source_map_id: number }>(
        "SELECT DISTINCT source_map_id FROM game_map_exits WHERE source_map_id NOT IN (SELECT DISTINCT destination_map_id FROM game_map_exits)",
    );
    return result.rows.map(function(r) {
        return { mapId: r.source_map_id };
    });
}

export async function updateExit(
    sourceMapId: number, sourceX: number, sourceY: number,
    destinationMapId: number, destinationX: number, destinationY: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!mapExists(destinationMapId)) {
        return { ok: false, reason: "Destination map does not exist" };
    }
    if (!isValidCoordinate(destinationX, destinationY)) {
        return { ok: false, reason: "Destination coordinates out of bounds" };
    }
    const result = await pool.query(
        "UPDATE game_map_exits SET destination_map_id = $1, destination_x = $2, destination_y = $3 WHERE source_map_id = $4 AND source_x = $5 AND source_y = $6",
        [destinationMapId, destinationX, destinationY, sourceMapId, sourceX, sourceY],
    );
    if ((result.rowCount || 0) === 0) {
        return { ok: false, reason: "Exit not found" };
    }
    return { ok: true };
}

export async function hasExitAt(mapId: number, x: number, y: number): Promise<boolean> {
    const result = await pool.query<{ id: number }>(
        "SELECT 1 AS id FROM game_map_exits WHERE source_map_id = $1 AND source_x = $2 AND source_y = $3 LIMIT 1",
        [mapId, x, y],
    );
    return result.rows.length > 0;
}
