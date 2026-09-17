import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { MAP_GRID_SIZE, withMapLock } from "./mapNpcStorage";

export { MAP_GRID_SIZE };

/**
 * Coordenada destino de un traslado / salida de mapa.
 */
export type MapExitTarget = {
    map: number;
    x: number;
    y: number;
};

/**
 * Salida de mapa: puede ser un único destino o un conjunto de destinos aleatorios.
 */
export type MapExitEntry =
    | MapExitTarget
    | {
          destinations: MapExitTarget[];
      };

export type MapExitPlacement = {
    mapNum: number;
    x: number;
    y: number;
    exit: MapExitEntry;
};

export type MapSpecialsData = {
    id: number;
    exits?: Record<string, MapExitEntry>;
    objects?: Record<string, unknown>;
    npcs?: Record<string, unknown>;
    triggers?: Record<string, unknown>;
    [key: string]: unknown;
};

export type TileBlockCheckFn = (
    mapNum: number,
    x: number,
    y: number,
) => boolean;

export interface BFSValidationOptions {
    isTileBlocked?: TileBlockCheckFn;
    minAccessibleNeighbors?: number;
    minConnectedTiles?: number;
    maxNodesToExplore?: number;
    targetCoords?: { x: number; y: number };
}

export interface BFSValidationResult {
    ok: boolean;
    reason?: string;
    reachableCount?: number;
    accessibleNeighbors?: number;
}

export const MIN_ACCESSIBLE_NEIGHBORS_DEFAULT = 1;
export const MIN_CONNECTED_TILES_DEFAULT = 2;
export const MAX_BFS_EXPLORATION_DEFAULT = 200;

export function toExitKey(x: number, y: number): string {
    return `${x},${y}`;
}

export function parseExitKey(key: string): { x: number; y: number } | null {
    if (!key || typeof key !== "string") return null;
    const parts = key.split(",");
    if (parts.length !== 2) return null;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 1 ||
        x > MAP_GRID_SIZE ||
        y < 1 ||
        y > MAP_GRID_SIZE
    ) {
        return null;
    }
    return { x, y };
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

/**
 * Normaliza y valida un único destino de salida.
 */
export function normalizeExitTarget(value: unknown): MapExitTarget | null {
    if (!value || typeof value !== "object") {
        return null;
    }
    const candidate = value as Record<string, unknown>;
    const map = toFiniteNumber(candidate.map);
    const x = toFiniteNumber(candidate.x);
    const y = toFiniteNumber(candidate.y);

    if (
        map === null ||
        !Number.isInteger(map) ||
        map <= 0 ||
        x === null ||
        !Number.isInteger(x) ||
        x < 1 ||
        x > MAP_GRID_SIZE ||
        y === null ||
        !Number.isInteger(y) ||
        y < 1 ||
        y > MAP_GRID_SIZE
    ) {
        return null;
    }

    return { map, x, y };
}

/**
 * Normaliza una entrada de salida (simple o con destinos múltiples).
 */
export function normalizeExitEntry(value: unknown): MapExitEntry | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const candidate = value as Record<string, unknown>;

    // Formato con destinos múltiples
    if (Array.isArray(candidate.destinations)) {
        const normalizedList = candidate.destinations
            .map(normalizeExitTarget)
            .filter((d): d is MapExitTarget => d !== null);

        if (normalizedList.length === 0) {
            return null;
        }

        return { destinations: normalizedList };
    }

    // Formato simple { map, x, y }
    const single = normalizeExitTarget(value);
    if (single) {
        return single;
    }

    return null;
}

/**
 * Obtiene la lista de todos los destinos en una entrada de salida.
 */
export function extractExitTargets(entry: MapExitEntry): MapExitTarget[] {
    if ("destinations" in entry && Array.isArray(entry.destinations)) {
        return entry.destinations;
    }
    return [entry as MapExitTarget];
}

/**
 * Valida la accesibilidad de una coordenada destino mediante una búsqueda BFS en la grilla.
 * Verifica:
 * 1. Que el tile destino no esté bloqueado.
 * 2. Que tenga vecinos inmediatos transitables (no quede completamente encerrado en un hueco 1x1).
 * 3. Que el componente conexo de tiles transitables alcance al menos `minConnectedTiles`.
 * 4. Opcionalmente, que alcance una coordenada objetivo específica.
 */
export function checkExitConnectivityBFS(
    target: MapExitTarget,
    options: BFSValidationOptions = {},
): BFSValidationResult {
    const isTileBlocked = options.isTileBlocked ?? (() => false);
    const minAccessibleNeighbors =
        options.minAccessibleNeighbors ?? MIN_ACCESSIBLE_NEIGHBORS_DEFAULT;
    const minConnectedTiles =
        options.minConnectedTiles ?? MIN_CONNECTED_TILES_DEFAULT;
    const maxNodes = options.maxNodesToExplore ?? MAX_BFS_EXPLORATION_DEFAULT;

    // 1. Validar límites de mapa
    if (
        target.x < 1 ||
        target.x > MAP_GRID_SIZE ||
        target.y < 1 ||
        target.y > MAP_GRID_SIZE
    ) {
        return {
            ok: false,
            reason: `Coordenada destino (${target.x}, ${target.y}) fuera de límites de grilla (1-${MAP_GRID_SIZE}).`,
        };
    }

    // 2. Validar que el propio destino no esté bloqueado
    if (isTileBlocked(target.map, target.x, target.y)) {
        return {
            ok: false,
            reason: `El tile de destino (${target.x}, ${target.y}) en mapa ${target.map} está bloqueado.`,
        };
    }

    // 3. BFS para conectividad en la grilla
    const queue: Array<{ x: number; y: number }> = [{ x: target.x, y: target.y }];
    const visited = new Set<string>();
    visited.add(`${target.x},${target.y}`);

    let reachableCount = 1;
    let immediateAccessibleNeighbors = 0;

    const directions = [
        { dx: 0, dy: -1 }, // Arriba (Norte)
        { dx: 0, dy: 1 },  // Abajo (Sur)
        { dx: -1, dy: 0 }, // Izquierda (Oeste)
        { dx: 1, dy: 0 },  // Derecha (Este)
    ];

    // Chequear vecinos inmediatos
    for (const dir of directions) {
        const nx = target.x + dir.dx;
        const ny = target.y + dir.dy;

        if (nx >= 1 && nx <= MAP_GRID_SIZE && ny >= 1 && ny <= MAP_GRID_SIZE) {
            if (!isTileBlocked(target.map, nx, ny)) {
                immediateAccessibleNeighbors++;
            }
        }
    }

    if (immediateAccessibleNeighbors < minAccessibleNeighbors) {
        return {
            ok: false,
            reason: `El tile de destino (${target.x}, ${target.y}) en mapa ${target.map} no posee coordenadas vecinas transitables (atrapado sin salida).`,
            accessibleNeighbors: immediateAccessibleNeighbors,
            reachableCount: 1,
        };
    }

    let targetCoordsReached = options.targetCoords
        ? target.x === options.targetCoords.x && target.y === options.targetCoords.y
        : true;

    while (queue.length > 0 && reachableCount < maxNodes) {
        const current = queue.shift()!;

        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            const key = `${nx},${ny}`;

            if (
                nx >= 1 &&
                nx <= MAP_GRID_SIZE &&
                ny >= 1 &&
                ny <= MAP_GRID_SIZE &&
                !visited.has(key)
            ) {
                visited.add(key);

                if (!isTileBlocked(target.map, nx, ny)) {
                    reachableCount++;
                    queue.push({ x: nx, y: ny });

                    if (
                        options.targetCoords &&
                        nx === options.targetCoords.x &&
                        ny === options.targetCoords.y
                    ) {
                        targetCoordsReached = true;
                    }
                }
            }
        }
    }

    if (reachableCount < minConnectedTiles) {
        return {
            ok: false,
            reason: `El componente transitable del destino (${target.x}, ${target.y}) en mapa ${target.map} es insuficiente (${reachableCount} tiles alcanzables).`,
            accessibleNeighbors: immediateAccessibleNeighbors,
            reachableCount,
        };
    }

    if (options.targetCoords && !targetCoordsReached) {
        return {
            ok: false,
            reason: `No hay camino transitable entre (${target.x}, ${target.y}) y (${options.targetCoords.x}, ${options.targetCoords.y}) en mapa ${target.map}.`,
            accessibleNeighbors: immediateAccessibleNeighbors,
            reachableCount,
        };
    }

    return {
        ok: true,
        accessibleNeighbors: immediateAccessibleNeighbors,
        reachableCount,
    };
}

/**
 * Valida todas las transiciones de una entrada de salida (simple o múltiple).
 */
export function validateExitEntryBFS(
    entry: MapExitEntry,
    options: BFSValidationOptions = {},
): BFSValidationResult {
    const targets = extractExitTargets(entry);

    for (const target of targets) {
        const result = checkExitConnectivityBFS(target, options);
        if (!result.ok) {
            return result;
        }
    }

    return { ok: true };
}

/**
 * Escritura atómica con mecanismo de rollback garantizado en caso de fallo.
 * 1. Si el archivo destino existe, crea un backup temporal.
 * 2. Escribe el nuevo contenido en un archivo de staging (.tmp).
 * 3. Valida la integridad del archivo de staging leyéndolo y parseándolo.
 * 4. Realiza rename atómico al archivo final.
 * 5. Si ocurre cualquier error, restaura el archivo original desde el backup.
 */
export async function atomicWriteJsonFile(
    filePath: string,
    data: unknown,
): Promise<void> {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tempPath = `${filePath}.tmp_${uniqueId}`;
    const backupPath = `${filePath}.bak_${uniqueId}`;
    const originalExists = existsSync(filePath);

    if (originalExists) {
        await fs.copyFile(filePath, backupPath);
    }

    try {
        const serialized = JSON.stringify(data, null, 2);
        await fs.writeFile(tempPath, serialized, "utf8");

        // Verificación de integridad previa al reemplazo
        const readBack = await fs.readFile(tempPath, "utf8");
        JSON.parse(readBack);

        // Reemplazo atómico
        await fs.rename(tempPath, filePath);

        // Limpieza de backup tras éxito
        if (originalExists && existsSync(backupPath)) {
            await fs.unlink(backupPath);
        }
    } catch (error) {
        // Rollback atómico
        if (existsSync(tempPath)) {
            await fs.unlink(tempPath).catch(() => {});
        }

        if (originalExists && existsSync(backupPath)) {
            try {
                await fs.copyFile(backupPath, filePath);
                await fs.unlink(backupPath);
            } catch {
                // Preservar backup si la restauración falla catastróficamente
            }
        }

        throw new Error(
            `Fallo en guardado atómico de mapa (${path.basename(filePath)}). Rollback ejecutado: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

/**
 * Wrapper transaccional para modificar un archivo con rollback atómico garantizado.
 */
export async function withAtomicRollback<T>(
    filePath: string,
    operation: (currentContent: any) => Promise<{ dataToSave: any; result: T }>,
): Promise<T> {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
    }

    const originalExists = existsSync(filePath);
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const backupPath = `${filePath}.bak_${uniqueId}`;

    let currentContent: any = null;
    if (originalExists) {
        await fs.copyFile(filePath, backupPath);
        try {
            currentContent = JSON.parse(await fs.readFile(filePath, "utf8"));
        } catch {
            currentContent = null;
        }
    }

    try {
        const { dataToSave, result } = await operation(currentContent);
        await atomicWriteJsonFile(filePath, dataToSave);

        if (originalExists && existsSync(backupPath)) {
            await fs.unlink(backupPath).catch(() => {});
        }

        return result;
    } catch (err) {
        if (originalExists && existsSync(backupPath)) {
            try {
                await fs.copyFile(backupPath, filePath);
                await fs.unlink(backupPath);
            } catch {
                // Mantener backup
            }
        } else if (!originalExists && existsSync(filePath)) {
            await fs.unlink(filePath).catch(() => {});
        }
        throw err;
    }
}

/**
 * Carga las salidas configuradas en specials.json del mapa indicado.
 */
export async function loadMapExits(
    mapsSourceDir: string,
    mapNum: number,
): Promise<Record<string, MapExitEntry>> {
    const specialsPath = path.join(mapsSourceDir, `mapa_${mapNum}`, "specials.json");
    if (!existsSync(specialsPath)) {
        return {};
    }

    try {
        const raw = await fs.readFile(specialsPath, "utf8");
        const parsed = JSON.parse(raw) as MapSpecialsData;

        if (!parsed || typeof parsed !== "object" || !parsed.exits) {
            return {};
        }

        const validExits: Record<string, MapExitEntry> = {};
        for (const [key, val] of Object.entries(parsed.exits)) {
            const parsedCoords = parseExitKey(key);
            const normalizedVal = normalizeExitEntry(val);
            if (parsedCoords && normalizedVal) {
                validExits[key] = normalizedVal;
            }
        }

        return validExits;
    } catch {
        return {};
    }
}

/**
 * Guarda las salidas en specials.json preservando el resto de las secciones.
 */
export async function saveMapExits(
    mapsSourceDir: string,
    mapNum: number,
    exits: Record<string, MapExitEntry>,
): Promise<void> {
    const mapDir = path.join(mapsSourceDir, `mapa_${mapNum}`);
    const specialsPath = path.join(mapDir, "specials.json");

    let currentSpecials: MapSpecialsData = { id: mapNum };
    if (existsSync(specialsPath)) {
        try {
            const content = await fs.readFile(specialsPath, "utf8");
            currentSpecials = JSON.parse(content) as MapSpecialsData;
        } catch {
            currentSpecials = { id: mapNum };
        }
    }

    currentSpecials.id = mapNum;
    currentSpecials.exits = exits;

    await atomicWriteJsonFile(specialsPath, currentSpecials);
}

/**
 * Valida y coloca una salida en el mapa fuente con rollback atómico ante fallos.
 */
export async function placeMapExit(
    mapsSourceDir: string,
    placement: unknown,
    options: BFSValidationOptions = {},
): Promise<
    | { ok: true; exits: Record<string, MapExitEntry> }
    | { ok: false; reason: string }
> {
    if (!placement || typeof placement !== "object") {
        return { ok: false, reason: "Objeto de colocación de salida inválido." };
    }

    const cand = placement as Record<string, unknown>;
    const mapNum = toFiniteNumber(cand.mapNum);
    const x = toFiniteNumber(cand.x);
    const y = toFiniteNumber(cand.y);

    if (
        mapNum === null ||
        !Number.isInteger(mapNum) ||
        mapNum <= 0 ||
        x === null ||
        !Number.isInteger(x) ||
        x < 1 ||
        x > MAP_GRID_SIZE ||
        y === null ||
        !Number.isInteger(y) ||
        y < 1 ||
        y > MAP_GRID_SIZE
    ) {
        return {
            ok: false,
            reason: `Coordenadas de origen (${cand.x}, ${cand.y}) o mapa (${cand.mapNum}) inválidos (1-${MAP_GRID_SIZE}).`,
        };
    }

    const normalizedExit = normalizeExitEntry(cand.exit);
    if (!normalizedExit) {
        return {
            ok: false,
            reason: "Definición de destino(s) de la salida inválida o vacía.",
        };
    }

    // Validar que el tile de origen no esté bloqueado
    if (options.isTileBlocked && options.isTileBlocked(mapNum, x, y)) {
        return {
            ok: false,
            reason: `La coordenada de origen (${x}, ${y}) en mapa ${mapNum} es un tile bloqueado.`,
        };
    }

    // Validación BFS de conectividad y accesibilidad de los destinos
    const bfsResult = validateExitEntryBFS(normalizedExit, options);
    if (!bfsResult.ok) {
        return { ok: false, reason: bfsResult.reason || "Validación BFS de salida falló." };
    }

    return withMapLock(mapNum, async () => {
        const currentExits = await loadMapExits(mapsSourceDir, mapNum);
        const exitKey = toExitKey(x, y);

        const updatedExits = {
            ...currentExits,
            [exitKey]: normalizedExit,
        };

        await saveMapExits(mapsSourceDir, mapNum, updatedExits);
        return { ok: true, exits: updatedExits };
    });
}

/**
 * Elimina una salida del mapa con guardado atómico.
 */
export async function removeMapExit(
    mapsSourceDir: string,
    mapNum: number,
    x: number,
    y: number,
): Promise<
    | { ok: true; exits: Record<string, MapExitEntry> }
    | { ok: false; reason: string }
> {
    if (x < 1 || x > MAP_GRID_SIZE || y < 1 || y > MAP_GRID_SIZE) {
        return {
            ok: false,
            reason: `Coordenadas (${x}, ${y}) fuera de límites (1-${MAP_GRID_SIZE}).`,
        };
    }

    return withMapLock(mapNum, async () => {
        const currentExits = await loadMapExits(mapsSourceDir, mapNum);
        const exitKey = toExitKey(x, y);

        if (!currentExits[exitKey]) {
            return {
                ok: false,
                reason: `No existe ninguna salida en (${x}, ${y}) en el mapa ${mapNum}.`,
            };
        }

        const updatedExits = { ...currentExits };
        delete updatedExits[exitKey];

        await saveMapExits(mapsSourceDir, mapNum, updatedExits);
        return { ok: true, exits: updatedExits };
    });
}
