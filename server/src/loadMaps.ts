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

async function readJsonFile(filePath: string) {
    const data = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(data);
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

        const allCandidateMapIds = Array.from({ length: 290 }, (_, i) => i + 1)
            .concat([500, 501, 502, 503, 504, 505, 506])
            .filter((mapId) => this.mapFilesExist(mapId));

        for (const mapId of allCandidateMapIds) {
            arMapsToLoad.push(this.readMap(mapId));
        }

        await Promise.all(arMapsToLoad);

        console.log("Mapas Cargados.");

        const LoadNpcs = new loadNpcs();
        await LoadNpcs.initialize();
    }

    async readMap(mapNum: number): Promise<number> {
        const mapDir = this.getMapDirectory(mapNum);
        const metadata = (await readJsonFile(path.join(mapDir, "meta.json"))) as MapMetadata;
        const terrain = (await readJsonFile(path.join(mapDir, "terrain.json"))) as TerrainMap;
        const specialsPath = path.join(mapDir, "specials.json");
        let specials: SpecialsMap;
        try {
            specials = (await readJsonFile(specialsPath)) as SpecialsMap;
        } catch {
            specials = { exits: {}, objects: {}, npcs: {}, triggers: {} } as SpecialsMap;
        }
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

            return mapNum;
    }

    findNearestWalkableTile(mapNum: number, startX: number, startY: number): { x: number; y: number } {
        if (!vars.mapa[mapNum]?.[startY]?.[startX]?.blocked) {
            return { x: startX, y: startY };
        }

        for (let radius = 1; radius <= 5; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const checkX = startX + dx;
                    const checkY = startY + dy;
                    if (
                        checkX >= 1 &&
                        checkX <= 100 &&
                        checkY >= 1 &&
                        checkY <= 100 &&
                        vars.mapa[mapNum]?.[checkY]?.[checkX] &&
                        !vars.mapa[mapNum][checkY][checkX].blocked &&
                        vars.mapData[mapNum]?.[checkY]?.[checkX]?.id === 0
                    ) {
                        return { x: checkX, y: checkY };
                    }
                }
            }
        }
        return { x: startX, y: startY };
    }

    private reconcileEntities(source: Record<string, any> | undefined, mapNum: number): number {
        if (!source) return 0;
        let count = 0;
        for (const entity of Object.values(source) as any[]) {
            if (entity && toNumber(entity.map) === mapNum && entity.pos && entity.id) {
                const safe = this.findNearestWalkableTile(mapNum, toNumber(entity.pos.x), toNumber(entity.pos.y));
                entity.pos = { x: safe.x, y: safe.y };
                if (vars.mapData[mapNum]?.[safe.y]?.[safe.x]) {
                    vars.mapData[mapNum][safe.y][safe.x].id = Number(entity.id);
                    count += 1;
                }
            }
        }
        return count;
    }

    async reloadMap(mapNum: number): Promise<{ mapNum: number; reloaded: boolean; charactersPreserved: number; npcsPreserved: number }> {
        if (!this.mapFilesExist(mapNum)) {
            return { mapNum, reloaded: false, charactersPreserved: 0, npcsPreserved: 0 };
        }

        await this.readMap(mapNum);

        const charactersPreserved = this.reconcileEntities(vars.personajes, mapNum);
        const npcsPreserved = this.reconcileEntities(vars.npcs, mapNum);

        return {
            mapNum,
            reloaded: true,
            charactersPreserved,
            npcsPreserved,
        };
    }

    async reloadAllMaps(): Promise<{ reloadedMaps: number[]; charactersPreserved: number; npcsPreserved: number }> {
        const reloadedMaps: number[] = [];
        let totalCharactersPreserved = 0;
        let totalNpcsPreserved = 0;

        const allCandidateMapIds = Array.from({ length: 290 }, (_, i) => i + 1)
            .concat([500, 501, 502, 503, 504, 505, 506])
            .filter((mapId) => this.mapFilesExist(mapId));

        for (const mapId of allCandidateMapIds) {
            const res = await this.reloadMap(mapId);
            if (res.reloaded) {
                reloadedMaps.push(mapId);
                totalCharactersPreserved += res.charactersPreserved;
                totalNpcsPreserved += res.npcsPreserved;
            }
        }

        return {
            reloadedMaps,
            charactersPreserved: totalCharactersPreserved,
            npcsPreserved: totalNpcsPreserved,
        };
    }
}

module.exports = LoadMaps;
