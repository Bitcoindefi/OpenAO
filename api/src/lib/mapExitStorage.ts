import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { MAP_GRID_SIZE, listAvailableMapIds, withMapLock } from "./mapNpcStorage";

export type MapExitDestination = { map: number; x: number; y: number };

export type MapExit = {
    mapNum: number;
    x: number;
    y: number;
    destination: MapExitDestination;
};

export type MapExitResult<T = object> =
    | ({ ok: true; warnings: string[] } & T)
    | { ok: false; reason: string };

type SpecialsFile = {
    id?: number;
    exits?: Record<string, unknown>;
    [key: string]: unknown;
};

const mapDir = (dir: string, mapNum: number) => path.join(dir, `mapa_${mapNum}`);

const inGrid = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAP_GRID_SIZE;

function parseDestination(raw: unknown): MapExitDestination | null {
    if (!raw || typeof raw !== "object") return null;
    const { map, x, y } = raw as Record<string, unknown>;
    if (!Number.isInteger(map) || typeof x !== "number" || typeof y !== "number") return null;
    return { map: map as number, x, y };
}

/** Una entrada de specials.json puede ser un destino o `{ destinations: [...] }`. */
function destinationsOf(raw: unknown): MapExitDestination[] {
    const list = (raw as { destinations?: unknown })?.destinations;
    const candidates = Array.isArray(list) ? list : [raw];
    return candidates
        .map(parseDestination)
        .filter((d): d is MapExitDestination => d !== null);
}

async function readSpecials(dir: string, mapNum: number): Promise<SpecialsFile> {
    const file = path.join(mapDir(dir, mapNum), "specials.json");
    if (!existsSync(file)) return { id: mapNum, exits: {} };
    const parsed = JSON.parse(await fs.readFile(file, "utf8")) as SpecialsFile;
    return { ...parsed, exits: parsed.exits ?? {} };
}

async function writeSpecials(dir: string, mapNum: number, specials: SpecialsFile) {
    await fs.writeFile(
        path.join(mapDir(dir, mapNum), "specials.json"),
        JSON.stringify(specials),
        "utf8",
    );
}

export function mapExists(dir: string, mapNum: number): boolean {
    return Number.isInteger(mapNum) && mapNum > 0 && existsSync(path.join(mapDir(dir, mapNum), "terrain.json"));
}

/** Tile bloqueado segun la paleta de terrain.json (coordenadas base 1). */
export async function isMapTileBlocked(dir: string, mapNum: number, x: number, y: number): Promise<boolean> {
    const terrain = JSON.parse(
        await fs.readFile(path.join(mapDir(dir, mapNum), "terrain.json"), "utf8"),
    ) as { palette?: Record<string, { blocked?: boolean }>; rows?: unknown[][] };
    const id = Number(terrain.rows?.[y - 1]?.[x - 1] ?? 0);
    return id > 0 && Boolean(terrain.palette?.[String(id)]?.blocked);
}

async function validateDestination(dir: string, dest: MapExitDestination): Promise<string | null> {
    if (!mapExists(dir, dest.map)) return `El mapa destino ${dest.map} no existe.`;
    if (!inGrid(dest.x) || !inGrid(dest.y)) {
        return `La coordenada destino (${dest.x}, ${dest.y}) está fuera de la grilla (1-${MAP_GRID_SIZE}).`;
    }
    if (await isMapTileBlocked(dir, dest.map, dest.x, dest.y)) {
        return `La coordenada destino (${dest.x}, ${dest.y}) del mapa ${dest.map} es un tile bloqueado.`;
    }
    return null;
}

async function validateSource(dir: string, mapNum: number, x: number, y: number): Promise<string | null> {
    if (!mapExists(dir, mapNum)) return `El mapa origen ${mapNum} no existe.`;
    if (!inGrid(x) || !inGrid(y)) {
        return `La coordenada origen (${x}, ${y}) está fuera de la grilla (1-${MAP_GRID_SIZE}).`;
    }
    return null;
}

export async function listMapExits(dir: string, mapNum: number): Promise<MapExit[]> {
    const specials = await readSpecials(dir, mapNum);
    const exits: MapExit[] = [];
    for (const [key, raw] of Object.entries(specials.exits ?? {})) {
        const [x, y] = key.split(",").map((v) => Number.parseInt(v, 10));
        if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
        for (const destination of destinationsOf(raw)) exits.push({ mapNum, x, y, destination });
    }
    return exits.sort((a, b) => a.y - b.y || a.x - b.x);
}

async function listAllExits(dir: string): Promise<MapExit[]> {
    const ids = await listAvailableMapIds(dir);
    return (await Promise.all(ids.map((id) => listMapExits(dir, id)))).flat();
}

/** Salidas de otros mapas que apuntan a `mapNum`. */
export async function listIncomingExits(dir: string, mapNum: number): Promise<MapExit[]> {
    return (await listAllExits(dir)).filter((e) => e.destination.map === mapNum && e.mapNum !== mapNum);
}

export async function listMapExitsWithIncoming(dir: string, mapNum: number) {
    return { mapNum, exits: await listMapExits(dir, mapNum), incoming: await listIncomingExits(dir, mapNum) };
}

/** Salidas que llevan a un mapa que ya no existe. */
export async function findOrphanExits(dir: string): Promise<MapExit[]> {
    return (await listAllExits(dir)).filter((e) => !mapExists(dir, e.destination.map));
}

/** Mapas sin ninguna salida entrante desde otro mapa. */
export async function findMapsWithoutIncomingExits(dir: string): Promise<number[]> {
    const incoming = new Set(
        (await listAllExits(dir)).filter((e) => e.mapNum !== e.destination.map).map((e) => e.destination.map),
    );
    return (await listAvailableMapIds(dir)).filter((id) => !incoming.has(id));
}

/** Mapas a los que no se puede llegar siguiendo salidas desde `rootMaps`. */
export async function findUnreachableMaps(dir: string, rootMaps: number[] = [1]): Promise<number[]> {
    const exits = await listAllExits(dir);
    const graph = new Map<number, number[]>();
    for (const e of exits) graph.set(e.mapNum, [...(graph.get(e.mapNum) ?? []), e.destination.map]);

    const seen = new Set<number>(rootMaps);
    const queue = [...rootMaps];
    while (queue.length > 0) {
        for (const next of graph.get(queue.shift() as number) ?? []) {
            if (!seen.has(next)) {
                seen.add(next);
                queue.push(next);
            }
        }
    }
    return (await listAvailableMapIds(dir)).filter((id) => !seen.has(id));
}

async function orphanedTargetWarnings(dir: string, previous: MapExitDestination[]): Promise<string[]> {
    const warnings: string[] = [];
    for (const map of new Set(previous.map((d) => d.map))) {
        if (mapExists(dir, map) && (await listIncomingExits(dir, map)).length === 0) {
            warnings.push(`El mapa ${map} quedó sin ninguna salida entrante.`);
        }
    }
    return warnings;
}

/** Crea o modifica la salida en (x, y) de un mapa. */
export async function setMapExit(
    dir: string,
    mapNum: number,
    x: number,
    y: number,
    destination: unknown,
): Promise<MapExitResult<{ created: boolean; exits: MapExit[] }>> {
    const dest = parseDestination(destination);
    if (!dest) return { ok: false, reason: "Destino de salida inválido." };
    const invalid = (await validateSource(dir, mapNum, x, y)) ?? (await validateDestination(dir, dest));
    if (invalid) return { ok: false, reason: invalid };

    const previous = await withMapLock(mapNum, async () => {
        const specials = await readSpecials(dir, mapNum);
        const key = `${x},${y}`;
        const old = key in (specials.exits ?? {}) ? destinationsOf(specials.exits![key]) : null;
        specials.exits![key] = dest;
        await writeSpecials(dir, mapNum, specials);
        return old;
    });

    const warnings = previous ? await orphanedTargetWarnings(dir, previous) : [];
    return { ok: true, created: previous === null, warnings, exits: await listMapExits(dir, mapNum) };
}

export async function deleteMapExit(
    dir: string,
    mapNum: number,
    x: number,
    y: number,
): Promise<MapExitResult<{ exits: MapExit[] }>> {
    if (!mapExists(dir, mapNum)) return { ok: false, reason: `El mapa ${mapNum} no existe.` };

    const removed = await withMapLock(mapNum, async () => {
        const specials = await readSpecials(dir, mapNum);
        const key = `${x},${y}`;
        if (!(key in (specials.exits ?? {}))) return null;
        const old = destinationsOf(specials.exits![key]);
        delete specials.exits![key];
        await writeSpecials(dir, mapNum, specials);
        return old;
    });
    if (!removed) return { ok: false, reason: `No hay salida en (${x}, ${y}) del mapa ${mapNum}.` };

    return {
        ok: true,
        warnings: await orphanedTargetWarnings(dir, removed),
        exits: await listMapExits(dir, mapNum),
    };
}

type ExitSpec = { from: MapExitDestination; to: MapExitDestination };

/**
 * Crea ida y vuelta en una sola operación. `forward` va de `from` a `to`;
 * `back` por defecto sale de `forward.to` y llega a `forward.from`.
 * Ambos lados se validan antes de escribir, de modo que un lado inválido no
 * deja una salida a medias.
 */
export async function createExitPair(
    dir: string,
    forward: ExitSpec,
    back?: ExitSpec,
): Promise<MapExitResult<{ exits: MapExit[] }>> {
    const f = { from: parseDestination(forward?.from), to: parseDestination(forward?.to) };
    const b = back
        ? { from: parseDestination(back.from), to: parseDestination(back.to) }
        : { from: f.to, to: f.from };
    if (!f.from || !f.to || !b.from || !b.to) {
        return { ok: false, reason: "Extremos de la pareja de salidas inválidos." };
    }
    const legs = [f, b] as Array<{ from: MapExitDestination; to: MapExitDestination }>;

    for (const leg of legs) {
        const invalid =
            (await validateSource(dir, leg.from.map, leg.from.x, leg.from.y)) ??
            (await validateDestination(dir, leg.to));
        if (invalid) return { ok: false, reason: invalid };
    }

    const maps = [...new Set(legs.map((l) => l.from.map))].sort((l, r) => l - r);
    const lockAll = (index: number, op: () => Promise<void>): Promise<void> =>
        index >= maps.length ? op() : withMapLock(maps[index], () => lockAll(index + 1, op));

    await lockAll(0, async () => {
        for (const { from, to } of legs) {
            const specials = await readSpecials(dir, from.map);
            specials.exits![`${from.x},${from.y}`] = { map: to.map, x: to.x, y: to.y };
            await writeSpecials(dir, from.map, specials);
        }
    });

    const exits = (await Promise.all(maps.map((m) => listMapExits(dir, m)))).flat();
    return { ok: true, warnings: [], exits };
}
