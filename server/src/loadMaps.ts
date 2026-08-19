export {};
const vars = require("./vars");
const fs = require("fs");
const path = require("path");
const loadNpcs = require("./loadNpcs");

type MapMetadata = {
    id?: number;
    name?: string;
    musicNum?: number;
    magiaSinEfecto?: number;
    noEncriptarMp?: number;
    terreno?: string;
    zona?: string;
    restringir?: string | number;
    minLevel?: number;
    maxLevel?: number;
    backup?: number;
    pk?: number;
};

type TerrainTile = {
    blocked?: boolean;
    graphics?: number | Array<number | null>;
};

type TerrainMap = {
    id?: number;
    width?: number;
    height?: number;
    palette?: Record<string, TerrainTile>;
    rows?: number[][];
};

type TileExitDestination = {
    map?: number;
    x?: number;
    y?: number;
};

type TileExitConfig = TileExitDestination | TileExitDestination[] | { destinations?: TileExitDestination[] };

type SpecialsMap = {
    id?: number;
    exits?: Record<string, TileExitConfig>;
    objects?: Record<string, { objIndex?: number; amount?: number }>;
    npcs?: Record<string, number>;
    triggers?: Record<string, number>;
};

const MAPS_SOURCE_DIR = path.join(__dirname, "../mapas_source");

function readJsonFile(filePath: string) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

function normalizeGraphics(graphics: unknown): Record<number, number> | undefined {
    if (typeof graphics === "number" && Number.isFinite(graphics)) {
        return { 1: graphics };
    }

    if (!Array.isArray(graphics)) {
        return undefined;
    }

    const normalizedGraphics: Record<number, number> = {};

    for (let index = 0; index < graphics.length; index++) {
        const value = graphics[index];
        if (typeof value === "number" && Number.isFinite(value)) {
            normalizedGraphics[index + 1] = value;
        }
    }

    return Object.keys(normalizedGraphics).length > 0 ? normalizedGraphics : undefined;
}

function parseCoordinateKey(key: string): { x: number; y: number } | null {
    const [rawX, rawY] = key.split(",");
    const x = Number.parseInt(rawX ?? "", 10);
    const y = Number.parseInt(rawY ?? "", 10);

    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1) {
        return null;
    }

    return { x, y };
}

function normalizeTileExitDestinations(exit: TileExitConfig | undefined): Array<{ map: number; x: number; y: number }> {
    let rawDestinations: TileExitDestination[] = [];

    if (Array.isArray(exit)) {
        rawDestinations = exit as TileExitDestination[];
    } else if (exit && typeof exit === "object" && "destinations" in exit && Array.isArray(exit.destinations)) {
        rawDestinations = exit.destinations;
    } else if (exit && typeof exit === "object") {
        rawDestinations = [exit as TileExitDestination];
    }

    const destinations: Array<{ map: number; x: number; y: number }> = [];

    for (const destination of rawDestinations) {
        const map = toNumber(destination?.map, Number.NaN);
        const x = toNumber(destination?.x, Number.NaN);
        const y = toNumber(destination?.y, Number.NaN);

        if (!Number.isFinite(map) || !Number.isFinite(x) || !Number.isFinite(y)) {
            continue;
        }

        destinations.push({ map, x, y });
    }

    return destinations;
}

function ensureRuntimeTile(mapId: number, x: number, y: number) {
    if (!vars.mapa[mapId][y]) {
        vars.mapa[mapId][y] = {};
    }

    if (!vars.mapa[mapId][y][x]) {
        vars.mapa[mapId][y][x] = {};
    }

    return vars.mapa[mapId][y][x];
}

class LoadMaps {
    constructor() {}

    getMapDirectory(mapNum: number) {
        return path.join(MAPS_SOURCE_DIR, `mapa_${mapNum}`);
    }

    mapFilesExist(mapNum: number) {
        const mapDir = this.getMapDirectory(mapNum);

        return fs.existsSync(path.join(mapDir, "meta.json")) && fs.existsSync(path.join(mapDir, "terrain.json"));
    }

    async initialize() {
        const arMapsToLoad: Array<Promise<unknown>> = [];
        const extraTestMaps = [500, 501, 502, 503, 504, 505, 506];

        for (let i = 1; i < 291; i++) {
            if (this.mapFilesExist(i)) {
                arMapsToLoad.push(this.readMap(i));
            }
        }

        for (const mapId of extraTestMaps) {
            if (this.mapFilesExist(mapId)) {
                arMapsToLoad.push(this.readMap(mapId));
            }
        }

        await Promise.all(arMapsToLoad);

        console.log("Mapas Cargados.");

        const LoadNpcs = new loadNpcs();
        await LoadNpcs.initialize();
    }

    readMap(mapNum: number) {
        return new Promise((resolve: (value: number) => void) => {
            const mapDir = this.getMapDirectory(mapNum);
            const metadata = readJsonFile(path.join(mapDir, "meta.json")) as MapMetadata;
            const terrain = readJsonFile(path.join(mapDir, "terrain.json")) as TerrainMap;
            const specialsPath = path.join(mapDir, "specials.json");
            const specials = fs.existsSync(specialsPath)
                ? (readJsonFile(specialsPath) as SpecialsMap)
                : ({ exits: {}, objects: {}, npcs: {}, triggers: {} } as SpecialsMap);
            const palette = terrain.palette ?? {};
            const rows = Array.isArray(terrain.rows) ? terrain.rows : [];
            const width = Math.max(1, toNumber(terrain.width, 100));
            const height = Math.max(1, toNumber(terrain.height, 100));

            vars.mapa[mapNum] = {};
            vars.mapData[mapNum] = [];

            for (let y = 1; y <= height; y++) {
                vars.mapa[mapNum][y] = {};
                vars.mapData[mapNum][y] = [];

                const row = Array.isArray(rows[y - 1]) ? rows[y - 1] : [];

                for (let x = 1; x <= width; x++) {
                    const runtimeTile: Record<string, unknown> = {};
                    const paletteId = toNumber(row[x - 1], 0);
                    const paletteTile = paletteId > 0 ? palette[String(paletteId)] : undefined;
                    const graphics = normalizeGraphics(paletteTile?.graphics);

                    if (paletteTile?.blocked) {
                        runtimeTile.blocked = 1;
                    }

                    if (graphics) {
                        runtimeTile.graphics = graphics;
                    }

                    vars.mapa[mapNum][y][x] = runtimeTile;
                    vars.mapData[mapNum][y][x] = {
                        id: 0,
                    };
                }
            }

            for (const [coordinateKey, exit] of Object.entries(specials.exits ?? {})) {
                const coordinates = parseCoordinateKey(coordinateKey);
                if (!coordinates) {
                    continue;
                }

                const destinations = normalizeTileExitDestinations(exit);
                if (destinations.length === 0) {
                    continue;
                }

                const tile = ensureRuntimeTile(mapNum, coordinates.x, coordinates.y);
                tile.tileExit = destinations.length === 1 ? destinations[0] : { destinations };
            }

            for (const [coordinateKey, objectInfo] of Object.entries(specials.objects ?? {})) {
                const coordinates = parseCoordinateKey(coordinateKey);
                if (!coordinates) {
                    continue;
                }

                const tile = ensureRuntimeTile(mapNum, coordinates.x, coordinates.y);
                tile.objInfo = {
                    objIndex: toNumber(objectInfo.objIndex),
                    amount: toNumber(objectInfo.amount),
                };
            }

            for (const [coordinateKey, npcIndex] of Object.entries(specials.npcs ?? {})) {
                const coordinates = parseCoordinateKey(coordinateKey);
                if (!coordinates) {
                    continue;
                }

                const tile = ensureRuntimeTile(mapNum, coordinates.x, coordinates.y);
                tile.npcIndex = toNumber(npcIndex);
            }

            for (const [coordinateKey, trigger] of Object.entries(specials.triggers ?? {})) {
                const coordinates = parseCoordinateKey(coordinateKey);
                if (!coordinates) {
                    continue;
                }

                const tile = ensureRuntimeTile(mapNum, coordinates.x, coordinates.y);
                tile.trigger = toNumber(trigger);
            }

            vars.mapData[mapNum].name = metadata.name || "";
            vars.mapData[mapNum].musicNum = toNumber(metadata.musicNum);
            vars.mapData[mapNum].magiaSinEfecto = toNumber(metadata.magiaSinEfecto);
            vars.mapData[mapNum].noEncriptarMp = toNumber(metadata.noEncriptarMp);
            vars.mapData[mapNum].terreno = metadata.terreno || "";
            vars.mapData[mapNum].zona = metadata.zona || "";
            vars.mapData[mapNum].restringir = metadata.restringir || 0;
            vars.mapData[mapNum].minLevel = toNumber(metadata.minLevel);
            vars.mapData[mapNum].maxLevel = toNumber(metadata.maxLevel);
            vars.mapData[mapNum].backup = toNumber(metadata.backup);
            vars.mapData[mapNum].pk = toNumber(metadata.pk);

            resolve(mapNum);
        });
    }
}

    /** Recarga un mapa individual desde disco y actualiza el runtime. */
    async reloadMapByNumber(mapNum: number): Promise<{ ok: boolean; playersAffected: number }> {
        if (!this.mapFilesExist(mapNum)) {
            console.log("[MAP RELOAD] Map " + mapNum + " does not exist, skipping.");
            return { ok: false, playersAffected: 0 };
        }

        // Read the map files fresh
        const mapDir = this.getMapDirectory(mapNum);
        const metadata = readJsonFile(path.join(mapDir, "meta.json")) as MapMetadata;
        const terrain = readJsonFile(path.join(mapDir, "terrain.json")) as TerrainMap;
        const specialsPath = path.join(mapDir, "specials.json");
        const specials = fs.existsSync(specialsPath)
            ? (readJsonFile(specialsPath) as SpecialsMap)
            : ({ exits: {}, objects: {}, npcs: {}, triggers: {} } as SpecialsMap);

        // Clear existing runtime state for this map
        vars.mapa[mapNum] = [];
        vars.mapData[mapNum] = {};

        // Re-apply terrain, metadata, specials using the same logic as readMap
        const palette = terrain.palette ?? {};
        const rows = Array.isArray(terrain.rows) ? terrain.rows : [];
        const width = Math.max(1, toNumber(terrain.width, 100));
        const height = Math.max(1, toNumber(terrain.height, 100));

        for (let y = 1; y <= height; y++) {
            vars.mapa[mapNum][y] = {};
            for (let x = 1; x <= width; x++) {
                const rawTile = rows[y - 1]?.[x - 1];
                const tileIndex = toNumber(rawTile, 1);
                const tile: Record<string, unknown> = { tileIndex };

                const paletteEntry = palette[String(tileIndex)];
                if (paletteEntry) {
                    tile.blocked = paletteEntry.blocked === true;
                    tile.graphics = normalizeGraphics(paletteEntry.graphics);
                }

                vars.mapa[mapNum][y][x] = tile;
            }
        }

        // Apply exits
        for (const [coordinateKey, exit] of Object.entries(specials.exits ?? {})) {
            const coordinates = parseCoordinateKey(coordinateKey);
            if (!coordinates) continue;
            const destinations = normalizeTileExitDestinations(exit);
            const tile = ensureRuntimeTile(mapNum, coordinates.x, coordinates.y);
            tile.tileExit = destinations.length === 1 ? destinations[0] : { destinations };
        }

        // Apply objects, npcs, triggers
        for (const [ck, objInfo] of Object.entries(specials.objects ?? {})) {
            const coords = parseCoordinateKey(ck);
            if (!coords) continue;
            const tile = ensureRuntimeTile(mapNum, coords.x, coords.y);
            tile.objInfo = { objIndex: toNumber(objInfo.objIndex), amount: toNumber(objInfo.amount) };
        }
        for (const [ck, npcIdx] of Object.entries(specials.npcs ?? {})) {
            const coords = parseCoordinateKey(ck);
            if (!coords) continue;
            const tile = ensureRuntimeTile(mapNum, coords.x, coords.y);
            tile.npcIndex = toNumber(npcIdx);
        }
        for (const [ck, trigger] of Object.entries(specials.triggers ?? {})) {
            const coords = parseCoordinateKey(ck);
            if (!coords) continue;
            const tile = ensureRuntimeTile(mapNum, coords.x, coords.y);
            tile.trigger = toNumber(trigger);
        }

        // Apply metadata
        vars.mapData[mapNum].name = metadata.name || "";
        vars.mapData[mapNum].musicNum = toNumber(metadata.musicNum);
        vars.mapData[mapNum].terreno = metadata.terreno || "";
        vars.mapData[mapNum].zona = metadata.zona || "";
        vars.mapData[mapNum].pk = toNumber(metadata.pk);

        // Handle player safety: move players off blocked tiles
        const socket = require("./socket");
        const playersOnMap = Object.values(vars.personajes).filter(function(p) {
            return p.map === mapNum && p.connection;
        });

        let movedPlayers = 0;
        for (const player of playersOnMap) {
            const tile = vars.mapa[mapNum]?.[player.pos.y]?.[player.pos.x];
            if (!tile || tile.blocked) {
                const FallbackMap = 1, FallbackX = 50, FallbackY = 50;
                player.map = FallbackMap;
                player.pos = { x: FallbackX, y: FallbackY };
                player.posX = FallbackX;
                player.posY = FallbackY;
                movedPlayers++;
            }
        }

        // Broadcast map reload to clients on this map
        for (const player of playersOnMap) {
            if (player.connection && player.connection.emit) {
                player.connection.emit("mapReloaded", { mapNum: mapNum });
            }
        }

        console.log("[MAP RELOAD] Map " + mapNum + " reloaded, " + movedPlayers + " players repositioned.");
        return { ok: true, playersAffected: movedPlayers };
    },

module.exports = LoadMaps;
