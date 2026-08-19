import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

const MAP_DIR_PATTERN = /^mapa_(\d+)$/i;
const MAP_SIZE = 100;

// ─── Types ────────────────────────────────────────────────────────────────

export type ExitDestination = {
    map: number;
    x: number;
    y: number;
};

export type SpecialsFile = {
    id: number;
    exits: Record<string, ExitDestination>;
};

export type BlockedTilesFile = Record<string, number>;

export type ExitValidationError =
    | { ok: false; reason: "destination_map_not_found"; detail: string }
    | { ok: false; reason: "destination_tile_blocked"; detail: string }
    | { ok: false; reason: "destination_out_of_bounds"; detail: string }
    | { ok: false; reason: "grid_coordinate_invalid"; detail: string }
    | { ok: false; reason: "map_not_found"; detail: string }
    | { ok: false; reason: "exit_not_found"; detail: string };

// ─── Helpers ──────────────────────────────────────────────────────────────

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function gridKey(x: number, y: number): string {
    return `${x},${y}`;
}

// ─── Read / Write ─────────────────────────────────────────────────────────

async function readJson<T>(filePath: string): Promise<T> {
    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function getSpecialsPath(mapsSourceDir: string, mapNum: number): string {
    return path.join(mapsSourceDir, `mapa_${mapNum}`, "specials.json");
}

function getTerrainPath(mapsSourceDir: string, mapNum: number): string {
    return path.join(mapsSourceDir, `mapa_${mapNum}`, "terrain.json");
}

export async function loadSpecials(
    mapsSourceDir: string,
    mapNum: number,
): Promise<SpecialsFile> {
    const filePath = getSpecialsPath(mapsSourceDir, mapNum);
    if (!existsSync(filePath)) {
        return { id: mapNum, exits: {} };
    }
    return readJson<SpecialsFile>(filePath);
}

export async function saveSpecials(
    mapsSourceDir: string,
    specials: SpecialsFile,
): Promise<void> {
    const filePath = getSpecialsPath(mapsSourceDir, specials.id);
    await writeJson(filePath, specials);
}

async function loadBlockedTiles(
    mapsSourceDir: string,
    mapNum: number,
): Promise<BlockedTilesFile> {
    const filePath = getTerrainPath(mapsSourceDir, mapNum);
    if (!existsSync(filePath)) {
        return {};
    }
    // terrain.json has { "x,y": blockValue, ... } or a more complex structure
    const terrain = await readJson<Record<string, unknown>>(filePath);
    // Filter only blocked tiles (value > 0 and not undefined)
    const blocked: BlockedTilesFile = {};
    for (const [key, value] of Object.entries(terrain)) {
        const num = toFiniteNumber(value);
        if (num !== null && num > 0) {
            // Only include entries where key matches "x,y" format
            const parts = key.split(",");
            if (parts.length === 2) {
                const x = Number.parseInt(parts[0], 10);
                const y = Number.parseInt(parts[1], 10);
                if (Number.isInteger(x) && Number.isInteger(y)) {
                    blocked[key] = num;
                }
            }
        }
    }
    return blocked;
}

export async function listAvailableMapIds(
    sourceDir: string,
): Promise<number[]> {
    if (!existsSync(sourceDir)) return [];
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name.match(MAP_DIR_PATTERN))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => Number.parseInt(match[1], 10))
        .filter((mapId) => Number.isInteger(mapId) && mapId > 0)
        .sort((a, b) => a - b);
}

// ─── Validation ───────────────────────────────────────────────────────────

export async function validateExit(
    mapsSourceDir: string,
    fromMap: number,
    fromX: number,
    fromY: number,
    destMap: number,
    destX: number,
    destY: number,
): Promise<ExitValidationError | { ok: true }> {
    // Validate grid coordinates
    if (
        !Number.isInteger(fromX) || fromX < 0 || fromX >= MAP_SIZE ||
        !Number.isInteger(fromY) || fromY < 0 || fromY >= MAP_SIZE
    ) {
        return { ok: false, reason: "grid_coordinate_invalid", detail: `(${fromX},${fromY}) fuera de la grilla 0..${MAP_SIZE - 1}` };
    }

    if (
        !Number.isInteger(destX) || destX < 0 || destX >= MAP_SIZE ||
        !Number.isInteger(destY) || destY < 0 || destY >= MAP_SIZE
    ) {
        return { ok: false, reason: "destination_out_of_bounds", detail: `Destino (${destX},${destY}) fuera de la grilla 0..${MAP_SIZE - 1}` };
    }

    // Validate source map exists
    const sourceDir = path.join(mapsSourceDir, `mapa_${fromMap}`);
    if (!existsSync(sourceDir)) {
        return { ok: false, reason: "map_not_found", detail: `Mapa origen ${fromMap} no existe` };
    }

    // Validate destination map exists
    const destDir = path.join(mapsSourceDir, `mapa_${destMap}`);
    if (!existsSync(destDir)) {
        return { ok: false, reason: "destination_map_not_found", detail: `Mapa destino ${destMap} no existe` };
    }

    // Validate destination tile is not blocked
    const blocked = await loadBlockedTiles(mapsSourceDir, destMap);
    const destKey = gridKey(destX, destY);
    if (destKey in blocked) {
        return { ok: false, reason: "destination_tile_blocked", detail: `Tile (${destX},${destY}) del mapa ${destMap} esta bloqueado` };
    }

    return { ok: true };
}

// ─── CRUD Operations ──────────────────────────────────────────────────────

/**
 * Lista todas las salidas de un mapa.
 */
export async function listExits(
    mapsSourceDir: string,
    mapNum: number,
): Promise<{ exits: Record<string, ExitDestination>; inbound: Record<string, ExitDestination[]> }> {
    const specials = await loadSpecials(mapsSourceDir, mapNum);
    const exits = specials.exits || {};

    // Find inbound exits (other maps pointing to this one)
    const allMapIds = await listAvailableMapIds(mapsSourceDir);
    const inbound: Record<string, ExitDestination[]> = {};

    for (const otherMapNum of allMapIds) {
        if (otherMapNum === mapNum) continue;
        const otherSpecials = await loadSpecials(mapsSourceDir, otherMapNum);
        if (otherSpecials.exits) {
            for (const [key, dest] of Object.entries(otherSpecials.exits)) {
                if (dest.map === mapNum) {
                    if (!inbound[key]) inbound[key] = [];
                    inbound[key].push({ map: otherMapNum, x: dest.x, y: dest.y });
                }
            }
        }
    }

    return { exits, inbound };
}

/**
 * Crea o actualiza una salida en un mapa.
 */
export async function createOrUpdateExit(
    mapsSourceDir: string,
    mapNum: number,
    x: number,
    y: number,
    destMap: number,
    destX: number,
    destY: number,
): Promise<ExitValidationError | { ok: true }> {
    const validation = await validateExit(mapsSourceDir, mapNum, x, y, destMap, destX, destY);
    if (!validation.ok) return validation;

    const specials = await loadSpecials(mapsSourceDir, mapNum);
    if (!specials.exits) specials.exits = {};
    specials.exits[gridKey(x, y)] = { map: destMap, x: destX, y: destY };
    await saveSpecials(mapsSourceDir, specials);
    return { ok: true };
}

/**
 * Crea una salida de ida y vuelta (pair) en una sola operacion.
 */
export async function createRoundTripExit(
    mapsSourceDir: string,
    mapA: number,
    ax: number,
    ay: number,
    mapB: number,
    bx: number,
    by: number,
): Promise<ExitValidationError | { ok: true }> {
    // Validate both exits
    const valA = await validateExit(mapsSourceDir, mapA, ax, ay, mapB, bx, by);
    if (!valA.ok) return valA;
    const valB = await validateExit(mapsSourceDir, mapB, bx, by, mapA, ax, ay);
    if (!valB.ok) return valB;

    // Create both exits
    const specialsA = await loadSpecials(mapsSourceDir, mapA);
    if (!specialsA.exits) specialsA.exits = {};
    specialsA.exits[gridKey(ax, ay)] = { map: mapB, x: bx, y: by };
    await saveSpecials(mapsSourceDir, specialsA);

    const specialsB = await loadSpecials(mapsSourceDir, mapB);
    if (!specialsB.exits) specialsB.exits = {};
    specialsB.exits[gridKey(bx, by)] = { map: mapA, x: ax, y: ay };
    await saveSpecials(mapsSourceDir, specialsB);

    return { ok: true };
}

/**
 * Borra una salida de un mapa.
 */
export async function deleteExit(
    mapsSourceDir: string,
    mapNum: number,
    x: number,
    y: number,
): Promise<ExitValidationError | { ok: true }> {
    if (
        !Number.isInteger(x) || x < 0 || x >= MAP_SIZE ||
        !Number.isInteger(y) || y < 0 || y >= MAP_SIZE
    ) {
        return { ok: false, reason: "grid_coordinate_invalid", detail: `(${x},${y}) fuera de la grilla` };
    }

    const specials = await loadSpecials(mapsSourceDir, mapNum);
    const key = gridKey(x, y);
    if (!specials.exits || !(key in specials.exits)) {
        return { ok: false, reason: "exit_not_found", detail: `No hay salida en (${x},${y}) del mapa ${mapNum}` };
    }

    delete specials.exits[key];
    await saveSpecials(mapsSourceDir, specials);
    return { ok: true };
}

/**
 * Detecta mapas inalcanzables (sin ninguna salida entrante).
 */
export async function findInaccessibleMaps(
    mapsSourceDir: string,
): Promise<number[]> {
    const allMapIds = await listAvailableMapIds(mapsSourceDir);
    if (allMapIds.length <= 1) return [];

    const reachable = new Set<number>();
    // Map 1 is always reachable (starting point)
    reachable.add(1);

    // BFS from map 1 through exits
    const queue = [1];
    while (queue.length > 0) {
        const current = queue.shift()!;
        const specials = await loadSpecials(mapsSourceDir, current);
        if (specials.exits) {
            for (const dest of Object.values(specials.exits)) {
                if (!reachable.has(dest.map)) {
                    reachable.add(dest.map);
                    queue.push(dest.map);
                }
            }
        }
    }

    return allMapIds.filter((id) => !reachable.has(id));
}

export async function findOrphanExits(
    mapsSourceDir: string,
): Promise<Array<{ fromMap: number; fromKey: string; destination: ExitDestination }>> {
    const allMapIds = await listAvailableMapIds(mapsSourceDir);
    const orphans: Array<{ fromMap: number; fromKey: string; destination: ExitDestination }> = [];

    for (const mapNum of allMapIds) {
        const specials = await loadSpecials(mapsSourceDir, mapNum);
        if (!specials.exits) continue;
        for (const [key, dest] of Object.entries(specials.exits)) {
            const destDir = path.join(mapsSourceDir, `mapa_${dest.map}`);
            if (!existsSync(destDir)) {
                orphans.push({ fromMap: mapNum, fromKey: key, destination: dest });
            }
        }
    }

    return orphans;
}
