import { existsSync, readdirSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { mapDir, resolveMapsSourceDir } from "../lib/mapSourcePaths";

export const MAP_GRID_MIN = 1;
export const MAP_GRID_MAX = 100;

export type MapExitDestination = {
    map: number;
    x: number;
    y: number;
};

export type MapSpecials = {
    id: number;
    exits: Record<string, MapExitDestination>;
    objects?: unknown;
    npcs?: unknown;
    triggers?: unknown;
    [key: string]: unknown;
};

function httpError(message: string, statusCode = 400): Error {
    return Object.assign(new Error(message), { statusCode });
}

function coordKey(x: number, y: number): string {
    return `${x},${y}`;
}

function assertCoord(x: number, y: number, label: string): void {
    if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < MAP_GRID_MIN ||
        x > MAP_GRID_MAX ||
        y < MAP_GRID_MIN ||
        y > MAP_GRID_MAX
    ) {
        throw httpError(
            `Coordenada ${label} invalida (${x},${y}); debe estar en ${MAP_GRID_MIN}..${MAP_GRID_MAX}`,
        );
    }
}

export function listExistingMapNumbers(
    mapsSourceDir = resolveMapsSourceDir(),
): number[] {
    if (!existsSync(mapsSourceDir)) return [];
    const ids: number[] = [];
    for (const entry of readdirSync(mapsSourceDir)) {
        const match = /^mapa_(\d+)$/.exec(entry);
        if (!match) continue;
        const id = Number.parseInt(match[1], 10);
        if (Number.isInteger(id) && id > 0) ids.push(id);
    }
    return ids.sort((a, b) => a - b);
}

export function mapExists(
    mapNum: number,
    mapsSourceDir = resolveMapsSourceDir(),
): boolean {
    return existsSync(path.join(mapDir(mapNum, mapsSourceDir), "specials.json"))
        || existsSync(path.join(mapDir(mapNum, mapsSourceDir), "terrain.json"));
}

async function readJsonFile<T>(filePath: string): Promise<T> {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
    const payload = `${JSON.stringify(data, null, 4)}\n`;
    await fs.writeFile(filePath, payload, "utf8");
}

export async function loadSpecials(
    mapNum: number,
    mapsSourceDir = resolveMapsSourceDir(),
): Promise<MapSpecials> {
    const filePath = path.join(mapDir(mapNum, mapsSourceDir), "specials.json");
    if (!existsSync(filePath)) {
        throw httpError(`El mapa ${mapNum} no existe (sin specials.json)`, 404);
    }
    const data = await readJsonFile<MapSpecials>(filePath);
    if (!data.exits || typeof data.exits !== "object") {
        data.exits = {};
    }
    data.id = mapNum;
    return data;
}

async function saveSpecials(
    mapNum: number,
    specials: MapSpecials,
    mapsSourceDir = resolveMapsSourceDir(),
): Promise<void> {
    const filePath = path.join(mapDir(mapNum, mapsSourceDir), "specials.json");
    specials.id = mapNum;
    await writeJsonFile(filePath, specials);
}

/**
 * Terrain rows are rows[y-1][x-1] = palette id. Palette entries carry `blocked`.
 * Draft tile overrides in DB are out of scope here; file terrain is the source
 * of truth until the persistence layer owns exits.
 */
export async function isDestinationBlocked(
    mapNum: number,
    x: number,
    y: number,
    mapsSourceDir = resolveMapsSourceDir(),
): Promise<boolean> {
    const terrainPath = path.join(
        mapDir(mapNum, mapsSourceDir),
        "terrain.json",
    );
    if (!existsSync(terrainPath)) {
        // No terrain → cannot prove walkable; reject to avoid trapping players.
        return true;
    }
    const terrain = await readJsonFile<{
        palette?: Record<string, { blocked?: boolean }>;
        rows?: number[][];
    }>(terrainPath);
    const rows = terrain.rows;
    if (!Array.isArray(rows) || rows.length < y) return true;
    const row = rows[y - 1];
    if (!Array.isArray(row) || row.length < x) return true;
    const paletteId = row[x - 1];
    const entry = terrain.palette?.[String(paletteId)];
    return Boolean(entry?.blocked);
}

const exitBodySchema = z.object({
    x: z.number().int(),
    y: z.number().int(),
    targetMap: z.number().int().positive(),
    targetX: z.number().int(),
    targetY: z.number().int(),
});

export async function listMapExits(
    mapNum: number,
    mapsSourceDir = resolveMapsSourceDir(),
) {
    const specials = await loadSpecials(mapNum, mapsSourceDir);
    const outbound = Object.entries(specials.exits).map(([key, dest]) => {
        const [x, y] = key.split(",").map(Number);
        return { x, y, target: dest };
    });

    const inbound: Array<{
        fromMap: number;
        x: number;
        y: number;
        landing: MapExitDestination;
    }> = [];
    for (const other of listExistingMapNumbers(mapsSourceDir)) {
        if (other === mapNum) continue;
        const otherPath = path.join(
            mapDir(other, mapsSourceDir),
            "specials.json",
        );
        if (!existsSync(otherPath)) continue;
        const otherSpecials = await readJsonFile<MapSpecials>(otherPath);
        for (const [key, dest] of Object.entries(otherSpecials.exits ?? {})) {
            if (dest.map !== mapNum) continue;
            const [x, y] = key.split(",").map(Number);
            inbound.push({
                fromMap: other,
                x,
                y,
                landing: dest,
            });
        }
    }

    return { mapNum, outbound, inbound };
}

export async function upsertMapExit(
    mapNum: number,
    input: unknown,
    mapsSourceDir = resolveMapsSourceDir(),
) {
    const parsed = exitBodySchema.parse(input);
    assertCoord(parsed.x, parsed.y, "origen");
    assertCoord(parsed.targetX, parsed.targetY, "destino");
    if (!mapExists(parsed.targetMap, mapsSourceDir)) {
        throw httpError(`El mapa destino ${parsed.targetMap} no existe`);
    }
    if (
        await isDestinationBlocked(
            parsed.targetMap,
            parsed.targetX,
            parsed.targetY,
            mapsSourceDir,
        )
    ) {
        throw httpError(
            `La coordenada destino (${parsed.targetX},${parsed.targetY}) en el mapa ${parsed.targetMap} esta bloqueada`,
        );
    }

    const specials = await loadSpecials(mapNum, mapsSourceDir);
    specials.exits[coordKey(parsed.x, parsed.y)] = {
        map: parsed.targetMap,
        x: parsed.targetX,
        y: parsed.targetY,
    };
    await saveSpecials(mapNum, specials, mapsSourceDir);
    return {
        mapNum,
        exit: {
            x: parsed.x,
            y: parsed.y,
            target: specials.exits[coordKey(parsed.x, parsed.y)],
        },
    };
}

export async function deleteMapExit(
    mapNum: number,
    x: number,
    y: number,
    mapsSourceDir = resolveMapsSourceDir(),
) {
    assertCoord(x, y, "origen");
    const specials = await loadSpecials(mapNum, mapsSourceDir);
    const key = coordKey(x, y);
    if (!(key in specials.exits)) {
        throw httpError(`No hay salida en (${x},${y})`, 404);
    }
    delete specials.exits[key];
    await saveSpecials(mapNum, specials, mapsSourceDir);
    return { mapNum, removed: { x, y } };
}

const pairSchema = z.object({
    a: z.object({
        map: z.number().int().positive(),
        x: z.number().int(),
        y: z.number().int(),
    }),
    b: z.object({
        map: z.number().int().positive(),
        x: z.number().int(),
        y: z.number().int(),
    }),
});

/**
 * Creates A→B and B→A in one operation. Validates both landings first so a
 * partial write cannot leave a one-way orphan link.
 */
export async function createBidirectionalExits(
    input: unknown,
    mapsSourceDir = resolveMapsSourceDir(),
) {
    const parsed = pairSchema.parse(input);
    if (parsed.a.map === parsed.b.map) {
        throw httpError("Una pareja ida/vuelta requiere dos mapas distintos");
    }

    // Pre-validate both directions without writing.
    for (const [origin, target] of [
        [parsed.a, parsed.b],
        [parsed.b, parsed.a],
    ] as const) {
        assertCoord(origin.x, origin.y, "origen");
        assertCoord(target.x, target.y, "destino");
        if (!mapExists(origin.map, mapsSourceDir)) {
            throw httpError(`El mapa ${origin.map} no existe`, 404);
        }
        if (!mapExists(target.map, mapsSourceDir)) {
            throw httpError(`El mapa destino ${target.map} no existe`);
        }
        if (
            await isDestinationBlocked(
                target.map,
                target.x,
                target.y,
                mapsSourceDir,
            )
        ) {
            throw httpError(
                `Destino bloqueado en mapa ${target.map} (${target.x},${target.y})`,
            );
        }
    }

    await upsertMapExit(
        parsed.a.map,
        {
            x: parsed.a.x,
            y: parsed.a.y,
            targetMap: parsed.b.map,
            targetX: parsed.b.x,
            targetY: parsed.b.y,
        },
        mapsSourceDir,
    );
    await upsertMapExit(
        parsed.b.map,
        {
            x: parsed.b.x,
            y: parsed.b.y,
            targetMap: parsed.a.map,
            targetX: parsed.a.x,
            targetY: parsed.a.y,
        },
        mapsSourceDir,
    );

    return {
        pair: [
            {
                from: parsed.a,
                to: parsed.b,
            },
            {
                from: parsed.b,
                to: parsed.a,
            },
        ],
    };
}

export type ExitEdge = {
    fromMap: number;
    fromX: number;
    fromY: number;
    toMap: number;
    toX: number;
    toY: number;
};

export async function collectAllExitEdges(
    mapsSourceDir = resolveMapsSourceDir(),
): Promise<ExitEdge[]> {
    const edges: ExitEdge[] = [];
    for (const mapNum of listExistingMapNumbers(mapsSourceDir)) {
        const filePath = path.join(
            mapDir(mapNum, mapsSourceDir),
            "specials.json",
        );
        if (!existsSync(filePath)) continue;
        const specials = await readJsonFile<MapSpecials>(filePath);
        for (const [key, dest] of Object.entries(specials.exits ?? {})) {
            const [x, y] = key.split(",").map(Number);
            edges.push({
                fromMap: mapNum,
                fromX: x,
                fromY: y,
                toMap: dest.map,
                toX: dest.x,
                toY: dest.y,
            });
        }
    }
    return edges;
}

/** Exits whose destination map folder no longer exists. */
export async function findOrphanExits(
    mapsSourceDir = resolveMapsSourceDir(),
) {
    const edges = await collectAllExitEdges(mapsSourceDir);
    return {
        orphans: edges.filter((edge) => !mapExists(edge.toMap, mapsSourceDir)),
    };
}

/**
 * Maps with no inbound exits (except the configured entry map). Also reports
 * maps unreachable via BFS from the entry map through the directed exit graph.
 */
export async function analyzeMapReachability(
    options: { entryMapId?: number; mapsSourceDir?: string } = {},
) {
    const mapsSourceDir = options.mapsSourceDir ?? resolveMapsSourceDir();
    const entryMapId = options.entryMapId ?? 1;
    const maps = listExistingMapNumbers(mapsSourceDir);
    const edges = await collectAllExitEdges(mapsSourceDir);

    const inbound = new Map<number, number>();
    const adjacency = new Map<number, Set<number>>();
    for (const id of maps) {
        inbound.set(id, 0);
        adjacency.set(id, new Set());
    }
    for (const edge of edges) {
        if (!inbound.has(edge.toMap)) continue;
        inbound.set(edge.toMap, (inbound.get(edge.toMap) ?? 0) + 1);
        adjacency.get(edge.fromMap)?.add(edge.toMap);
    }

    const noInbound = maps.filter(
        (id) => id !== entryMapId && (inbound.get(id) ?? 0) === 0,
    );

    const reachable = new Set<number>();
    if (maps.includes(entryMapId)) {
        const queue = [entryMapId];
        reachable.add(entryMapId);
        while (queue.length > 0) {
            const current = queue.shift()!;
            for (const next of adjacency.get(current) ?? []) {
                if (reachable.has(next)) continue;
                reachable.add(next);
                queue.push(next);
            }
        }
    }

    const unreachableFromEntry = maps.filter((id) => !reachable.has(id));

    return {
        entryMapId,
        totalMaps: maps.length,
        noInbound,
        unreachableFromEntry,
        orphanExits: (await findOrphanExits(mapsSourceDir)).orphans,
    };
}
