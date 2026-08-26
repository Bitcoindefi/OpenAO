import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export type TileExit = {
    map: number;
    x: number;
    y: number;
};

export type TileExitConfig = TileExit | { destinations: TileExit[] };

export type SpecialsJson = {
    id: number;
    exits: Record<string, TileExitConfig>;
    objects: Record<string, { objIndex: number; amount: number }>;
    npcs: Record<string, number>;
    triggers: Record<string, number>;
};

const MAPS_SOURCE_DIR = process.env.MAPS_SOURCE_DIR || path.resolve(__dirname, "../../../server/mapas_source");

const mapWriteLocks = new Map<number, Promise<unknown>>();

type MapLockSelectionChangedError = Error & {
    code: "MAP_LOCK_SELECTION_CHANGED";
    mapNums: number[];
};

function mapLockSelectionChanged(mapNums: number[]): MapLockSelectionChangedError {
    const error = new Error("Map lock selection changed") as MapLockSelectionChangedError;
    error.code = "MAP_LOCK_SELECTION_CHANGED";
    error.mapNums = mapNums;
    return error;
}

function isMapLockSelectionChangedError(error: unknown): error is MapLockSelectionChangedError {
    return (
        error instanceof Error &&
        "code" in error &&
        error.code === "MAP_LOCK_SELECTION_CHANGED" &&
        "mapNums" in error &&
        Array.isArray(error.mapNums)
    );
}

async function withMapLock<T>(mapNum: number, fn: () => Promise<T> | T): Promise<T> {
    while (mapWriteLocks.has(mapNum)) {
        try {
            await mapWriteLocks.get(mapNum);
        } catch {
            // Ignore previous errors on lock release
        }
    }

    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
        resolveLock = resolve;
    });
    mapWriteLocks.set(mapNum, lockPromise);

    try {
        return await fn();
    } finally {
        if (mapWriteLocks.get(mapNum) === lockPromise) {
            mapWriteLocks.delete(mapNum);
        }
        resolveLock();
    }
}

async function withMapLocks<T>(mapNums: number[], fn: () => Promise<T> | T): Promise<T> {
    const orderedMapNums = Array.from(new Set(mapNums)).sort((a, b) => a - b);

    const acquireNext = (index: number): Promise<T> => {
        if (index >= orderedMapNums.length) {
            return Promise.resolve(fn());
        }
        return withMapLock(orderedMapNums[index], () => acquireNext(index + 1));
    };

    return acquireNext(0);
}

async function withStableMapLocks<T>(
    initialMapNums: number[],
    fn: (lockedMapNums: Set<number>) => Promise<T> | T,
): Promise<T> {
    let mapNums = initialMapNums;

    while (true) {
        const lockedMapNums = new Set(mapNums);
        try {
            return await withMapLocks(mapNums, () => fn(lockedMapNums));
        } catch (error) {
            if (!isMapLockSelectionChangedError(error)) {
                throw error;
            }
            mapNums = [...lockedMapNums, ...error.mapNums];
        }
    }
}

function getMapSpecialsPath(mapNum: number): string {
    return path.join(MAPS_SOURCE_DIR, `mapa_${mapNum}`, "specials.json");
}

function readMapSpecials(mapNum: number): SpecialsJson {
    const filePath = getMapSpecialsPath(mapNum);
    if (!fs.existsSync(filePath)) {
        return {
            id: mapNum,
            exits: {},
            objects: {},
            npcs: {},
            triggers: {},
        };
    }

    try {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw) as SpecialsJson;
    } catch {
        return {
            id: mapNum,
            exits: {},
            objects: {},
            npcs: {},
            triggers: {},
        };
    }
}

function writeMapSpecials(mapNum: number, data: SpecialsJson): void {
    const filePath = getMapSpecialsPath(mapNum);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    // Atomic write-then-rename to prevent partial/corrupted reads
    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmpPath, filePath);
}

export const upsertExitSchema = z.object({
    destMap: z.number().int().positive(),
    destX: z.number().int().min(1).max(100),
    destY: z.number().int().min(1).max(100),
    createPaired: z.boolean().optional().default(false),
});

export type UpsertExitInput = z.infer<typeof upsertExitSchema>;

export async function getMapExits(mapNum: number): Promise<{ mapNum: number; exits: Record<string, TileExitConfig> }> {
    const specials = readMapSpecials(mapNum);
    return {
        mapNum,
        exits: specials.exits ?? {},
    };
}

export async function upsertMapExit(
    mapNum: number,
    x: number,
    y: number,
    input: UpsertExitInput,
): Promise<{
    mapNum: number;
    x: number;
    y: number;
    exit: TileExit;
    pairedExitCreated: boolean;
}> {
    const lockMapNums = input.createPaired ? [mapNum, input.destMap] : [mapNum];

    return withMapLocks(lockMapNums, async () => {
        const coordKey = `${x},${y}`;
        const exitTarget: TileExit = {
            map: input.destMap,
            x: input.destX,
            y: input.destY,
        };

        const sourceSpecials = readMapSpecials(mapNum);
        if (!sourceSpecials.exits) {
            sourceSpecials.exits = {};
        }
        sourceSpecials.exits[coordKey] = exitTarget;

        let pairedExitCreated = false;
        let destSpecials: SpecialsJson | undefined;

        if (input.createPaired) {
            destSpecials = input.destMap === mapNum ? sourceSpecials : readMapSpecials(input.destMap);
            if (!destSpecials.exits) {
                destSpecials.exits = {};
            }
            const destCoordKey = `${input.destX},${input.destY}`;
            destSpecials.exits[destCoordKey] = {
                map: mapNum,
                x,
                y,
            };
            pairedExitCreated = true;
        }

        writeMapSpecials(mapNum, sourceSpecials);
        if (destSpecials && input.destMap !== mapNum) {
            writeMapSpecials(input.destMap, destSpecials);
        }

        return {
            mapNum,
            x,
            y,
            exit: exitTarget,
            pairedExitCreated,
        };
    });
}

export async function deleteMapExit(
    mapNum: number,
    x: number,
    y: number,
    deletePaired = false,
): Promise<{
    mapNum: number;
    x: number;
    y: number;
    deleted: boolean;
    pairedExitDeleted: boolean;
}> {
    const coordKey = `${x},${y}`;
    const lockMapNums = [mapNum];

    if (deletePaired) {
        await withMapLock(mapNum, async () => {
            const sourceSpecials = readMapSpecials(mapNum);
            const existingExit = sourceSpecials.exits?.[coordKey];
            if (existingExit && "map" in existingExit) {
                lockMapNums.push(existingExit.map);
            }
        });
    }

    return withStableMapLocks(lockMapNums, async (lockedMapNums) => {
        const sourceSpecials = readMapSpecials(mapNum);
        const existingExit = sourceSpecials.exits?.[coordKey];

        if (!existingExit) {
            return {
                mapNum,
                x,
                y,
                deleted: false,
                pairedExitDeleted: false,
            };
        }

        delete sourceSpecials.exits[coordKey];

        let pairedExitDeleted = false;
        let destSpecials: SpecialsJson | undefined;
        let destMap: number | undefined;

        if (deletePaired && "map" in existingExit) {
            destMap = existingExit.map;
            if (!lockedMapNums.has(destMap)) {
                throw mapLockSelectionChanged([destMap]);
            }

            const destX = existingExit.x;
            const destY = existingExit.y;
            const destCoordKey = `${destX},${destY}`;
            destSpecials = destMap === mapNum ? sourceSpecials : readMapSpecials(destMap);

            if (destSpecials.exits?.[destCoordKey]) {
                delete destSpecials.exits[destCoordKey];
                pairedExitDeleted = true;
            }
        }

        writeMapSpecials(mapNum, sourceSpecials);
        if (destSpecials && destMap !== undefined && destMap !== mapNum) {
            writeMapSpecials(destMap, destSpecials);
        }

        return {
            mapNum,
            x,
            y,
            deleted: true,
            pairedExitDeleted,
        };
    });
}
