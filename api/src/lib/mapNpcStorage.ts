import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

export type MapNpcPlacement = {
    mapNum: number;
    x: number;
    y: number;
    npcIndex: number;
    movement?: number;
};

export const MAX_NPCS_PER_MAP = 50;
export const MAP_GRID_SIZE = 100;

const MAP_DIR_PATTERN = /^mapa_(\d+)$/i;

const mapMutexes = new Map<number, Promise<void>>();

export async function withMapLock<T>(
    mapNum: number,
    operation: () => Promise<T>,
): Promise<T> {
    const previousLock = mapMutexes.get(mapNum) ?? Promise.resolve();
    let releaseLock: () => void = () => {};
    const operationLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
    });
    const queuedLock = previousLock
        .catch(() => undefined)
        .then(() => operationLock);

    mapMutexes.set(mapNum, queuedLock);

    try {
        await previousLock.catch(() => undefined);
        return await operation();
    } finally {
        releaseLock();
        if (mapMutexes.get(mapNum) === queuedLock) {
            mapMutexes.delete(mapNum);
        }
    }
}

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

export function normalizePlacement(
    value: unknown,
    fallbackMapNum?: number,
): MapNpcPlacement | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const candidate = value as Record<string, unknown>;
    const mapNum = toFiniteNumber(candidate.mapNum) ?? fallbackMapNum ?? null;
    const x = toFiniteNumber(candidate.x);
    const y = toFiniteNumber(candidate.y);
    const npcIndex = toFiniteNumber(candidate.npcIndex);
    const movement = toFiniteNumber(candidate.movement);

    if (
        mapNum === null ||
        !Number.isInteger(mapNum) ||
        mapNum <= 0 ||
        x === null ||
        !Number.isInteger(x) ||
        x <= 0 ||
        x > MAP_GRID_SIZE ||
        y === null ||
        !Number.isInteger(y) ||
        y <= 0 ||
        y > MAP_GRID_SIZE ||
        npcIndex === null ||
        !Number.isInteger(npcIndex) ||
        npcIndex <= 0
    ) {
        return null;
    }

    return movement !== null && Number.isInteger(movement)
        ? { mapNum, x, y, npcIndex, movement }
        : { mapNum, x, y, npcIndex };
}

export function sortPlacements(placements: MapNpcPlacement[]): MapNpcPlacement[] {
    return [...placements].sort(
        (left, right) =>
            left.mapNum - right.mapNum ||
            left.y - right.y ||
            left.x - right.x ||
            left.npcIndex - right.npcIndex,
    );
}

export async function listAvailableMapIds(
    sourceDir: string,
): Promise<number[]> {
    if (!existsSync(sourceDir)) {
        return [];
    }

    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name.match(MAP_DIR_PATTERN))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => Number.parseInt(match[1], 10))
        .filter((mapId) => Number.isInteger(mapId) && mapId > 0)
        .sort((left, right) => left - right);
}

export async function loadMapNpcPlacements(
    mapsSourceDir: string,
    mapNum: number,
): Promise<MapNpcPlacement[]> {
    const filePath = path.join(mapsSourceDir, `mapa_${mapNum}`, "npcs.json");

    if (!existsSync(filePath)) {
        return [];
    }

    const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
    if (!Array.isArray(parsed)) {
        return [];
    }

    return sortPlacements(
        parsed
            .map((entry) => normalizePlacement(entry, mapNum))
            .filter((entry): entry is MapNpcPlacement => Boolean(entry)),
    );
}

export async function loadAllMapNpcPlacements(
    mapsSourceDir: string,
): Promise<MapNpcPlacement[]> {
    const mapIds = await listAvailableMapIds(mapsSourceDir);
    const placements = await Promise.all(
        mapIds.map((mapId) => loadMapNpcPlacements(mapsSourceDir, mapId)),
    );

    return sortPlacements(placements.flat());
}

export async function saveMapNpcPlacements(
    mapsSourceDir: string,
    mapNum: number,
    placements: MapNpcPlacement[],
): Promise<void> {
    const mapDir = path.join(mapsSourceDir, `mapa_${mapNum}`);
    if (!existsSync(mapDir)) {
        await fs.mkdir(mapDir, { recursive: true });
    }

    const filePath = path.join(mapDir, "npcs.json");
    const formatted = sortPlacements(placements).map((p) => ({
        mapNum: p.mapNum,
        x: p.x,
        y: p.y,
        npcIndex: p.npcIndex,
        ...(p.movement !== undefined ? { movement: p.movement } : {}),
    }));

    await fs.writeFile(filePath, JSON.stringify(formatted, null, 2), "utf8");
}

export async function placeMapNpc(
    mapsSourceDir: string,
    rawPlacement: unknown,
    options: {
        maxNpcs?: number;
        isTileBlocked?: (x: number, y: number) => boolean;
        isValidNpcIndex?: (npcIndex: number) => boolean | Promise<boolean>;
    } = {},
): Promise<{ ok: true; placements: MapNpcPlacement[] } | { ok: false; reason: string }> {
    const placement = normalizePlacement(rawPlacement);
    if (!placement) {
        return { ok: false, reason: "Formato de colocación de NPC inválido o coordenadas fuera de límites (1-100)." };
    }

    if (options.isValidNpcIndex) {
        const valid = await options.isValidNpcIndex(placement.npcIndex);
        if (!valid) {
            return { ok: false, reason: `El npcIndex ${placement.npcIndex} no existe en el catálogo.` };
        }
    }

    if (options.isTileBlocked && options.isTileBlocked(placement.x, placement.y)) {
        return { ok: false, reason: `La coordenada (${placement.x}, ${placement.y}) es un tile bloqueado.` };
    }

    return withMapLock(placement.mapNum, async () => {
        const currentPlacements = await loadMapNpcPlacements(mapsSourceDir, placement.mapNum);

        const alreadyAtTile = currentPlacements.some((p) => p.x === placement.x && p.y === placement.y);
        if (alreadyAtTile) {
            return { ok: false, reason: `Ya existe un NPC colocado en la coordenada (${placement.x}, ${placement.y}).` };
        }

        const maxAllowed = options.maxNpcs ?? MAX_NPCS_PER_MAP;
        if (currentPlacements.length >= maxAllowed) {
            return { ok: false, reason: `Se alcanzó el límite máximo de ${maxAllowed} NPCs para el mapa ${placement.mapNum}.` };
        }

        const updated = [...currentPlacements, placement];
        await saveMapNpcPlacements(mapsSourceDir, placement.mapNum, updated);

        return { ok: true, placements: sortPlacements(updated) };
    });
}

export async function moveMapNpc(
    mapsSourceDir: string,
    mapNum: number,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: {
        isTileBlocked?: (x: number, y: number) => boolean;
    } = {},
): Promise<{ ok: true; placements: MapNpcPlacement[] } | { ok: false; reason: string }> {
    if (toX < 1 || toX > MAP_GRID_SIZE || toY < 1 || toY > MAP_GRID_SIZE) {
        return { ok: false, reason: "Las coordenadas de destino están fuera de la grilla (1-100)." };
    }

    if (options.isTileBlocked && options.isTileBlocked(toX, toY)) {
        return { ok: false, reason: `La coordenada de destino (${toX}, ${toY}) es un tile bloqueado.` };
    }

    return withMapLock(mapNum, async () => {
        const currentPlacements = await loadMapNpcPlacements(mapsSourceDir, mapNum);

        const sourceIndex = currentPlacements.findIndex((p) => p.x === fromX && p.y === fromY);
        if (sourceIndex === -1) {
            return { ok: false, reason: `No se encontró ningún NPC en (${fromX}, ${fromY}) en el mapa ${mapNum}.` };
        }

        const destOccupied = currentPlacements.some((p) => p.x === toX && p.y === toY && !(p.x === fromX && p.y === fromY));
        if (destOccupied) {
            return { ok: false, reason: `La coordenada de destino (${toX}, ${toY}) ya está ocupada por otro NPC.` };
        }

        const targetNpc = currentPlacements[sourceIndex];
        const updated = currentPlacements.filter((_, idx) => idx !== sourceIndex);
        updated.push({ ...targetNpc, x: toX, y: toY });

        await saveMapNpcPlacements(mapsSourceDir, mapNum, updated);
        return { ok: true, placements: sortPlacements(updated) };
    });
}

export async function removeMapNpc(
    mapsSourceDir: string,
    mapNum: number,
    x: number,
    y: number,
): Promise<{ ok: true; placements: MapNpcPlacement[] } | { ok: false; reason: string }> {
    return withMapLock(mapNum, async () => {
        const currentPlacements = await loadMapNpcPlacements(mapsSourceDir, mapNum);
        const filtered = currentPlacements.filter((p) => !(p.x === x && p.y === y));

        if (filtered.length === currentPlacements.length) {
            return { ok: false, reason: `No se encontró ningún NPC en (${x}, ${y}) para remover del mapa ${mapNum}.` };
        }

        await saveMapNpcPlacements(mapsSourceDir, mapNum, filtered);
        return { ok: true, placements: sortPlacements(filtered) };
    });
}
