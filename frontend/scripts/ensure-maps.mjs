import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, "../public/maps_optimized");
const MAP_DIR_PATTERN = /^mapa_(\d+)$/i;

function parseCliArgs(argv) {
    const force = argv.includes("--force");
    let customSourceDir = null;
    let customOutputDir = null;

    for (const arg of argv) {
        if (arg.startsWith("--source-dir=")) {
            customSourceDir = path.resolve(process.cwd(), arg.slice("--source-dir=".length));
        } else if (arg.startsWith("--output-dir=")) {
            customOutputDir = path.resolve(process.cwd(), arg.slice("--output-dir=".length));
        }
    }

    return { force, customSourceDir, customOutputDir };
}

function resolveSourceDir(customSourceDir) {
    if (customSourceDir) {
        return fs.existsSync(customSourceDir) ? customSourceDir : null;
    }

    const candidatePaths = [
        process.env.MAPS_SOURCE_DIR,
        path.resolve(__dirname, "../../server/mapas_source"),
        path.resolve(__dirname, "../server/mapas_source"),
        "/app/server/mapas_source",
        path.resolve(process.cwd(), "../server/mapas_source"),
        path.resolve(process.cwd(), "server/mapas_source"),
    ].filter(Boolean);

    for (const candidate of candidatePaths) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function countExistingOptimizedMaps(outputDir) {
    if (!fs.existsSync(outputDir)) {
        return 0;
    }

    try {
        const files = fs.readdirSync(outputDir);
        return files.filter((f) => /^mapa_\d+\.json$/i.test(f)).length;
    } catch {
        return 0;
    }
}

function toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function normalizePlacement(value, fallbackMapNum) {
    if (!value || typeof value !== "object") {
        return null;
    }

    const candidate = value;
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
        y === null ||
        !Number.isInteger(y) ||
        y <= 0 ||
        npcIndex === null ||
        !Number.isInteger(npcIndex) ||
        npcIndex <= 0
    ) {
        return null;
    }

    return movement !== undefined && movement !== null && Number.isInteger(movement)
        ? { mapNum, x, y, npcIndex, movement }
        : { mapNum, x, y, npcIndex };
}

function sortPlacements(placements) {
    return [...placements].sort(
        (left, right) =>
            left.mapNum - right.mapNum || left.y - right.y || left.x - right.x || left.npcIndex - right.npcIndex,
    );
}

function readMapNpcFile(sourceDir, mapNum) {
    const filePath = path.join(sourceDir, `mapa_${mapNum}`, "npcs.json");
    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (!Array.isArray(parsed)) {
            return [];
        }

        return sortPlacements(
            parsed
                .map((entry) => normalizePlacement(entry, mapNum))
                .filter(Boolean),
        );
    } catch {
        return [];
    }
}

function parseCoordinateKey(key) {
    const [rawX, rawY] = key.split(",");
    const x = Number.parseInt(rawX ?? "", 10);
    const y = Number.parseInt(rawY ?? "", 10);

    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1) {
        return null;
    }

    return { x, y };
}

function sortCompactTile(tile) {
    const result = {};

    if (tile.b) {
        result.b = 1;
    }
    if (tile.g !== undefined) {
        result.g = tile.g;
    }
    if (tile.e) {
        result.e = tile.e;
    }
    if (tile.n !== undefined) {
        result.n = tile.n;
    }
    if (tile.t !== undefined) {
        result.t = tile.t;
    }
    if (tile.o) {
        result.o = tile.o;
    }

    return result;
}

function buildCompactMap(mapId, terrain, specials) {
    const width = Math.max(1, toFiniteNumber(terrain.width) ?? 100);
    const height = Math.max(1, toFiniteNumber(terrain.height) ?? 100);
    const palette = terrain.palette ?? {};
    const rows = Array.isArray(terrain.rows) ? terrain.rows : [];
    const exitByCoordinate = new Map();
    const objectByCoordinate = new Map();
    const triggerByCoordinate = new Map();
    const complexIndexBySignature = new Map();
    const complexTiles = [];
    const data = [];

    for (const [coordinateKey, exit] of Object.entries(specials.exits ?? {})) {
        const coordinates = parseCoordinateKey(coordinateKey);
        if (!coordinates) {
            continue;
        }

        const map = toFiniteNumber(exit.map);
        const x = toFiniteNumber(exit.x);
        const y = toFiniteNumber(exit.y);
        if (map === undefined || x === undefined || y === undefined) {
            continue;
        }

        exitByCoordinate.set(`${coordinates.x},${coordinates.y}`, { map, x, y });
    }

    for (const [coordinateKey, objectInfo] of Object.entries(specials.objects ?? {})) {
        const coordinates = parseCoordinateKey(coordinateKey);
        if (!coordinates) {
            continue;
        }

        const objIndex = toFiniteNumber(objectInfo.objIndex);
        const amount = toFiniteNumber(objectInfo.amount);
        if (objIndex === undefined || amount === undefined) {
            continue;
        }

        objectByCoordinate.set(`${coordinates.x},${coordinates.y}`, { objIndex, amount });
    }

    for (const [coordinateKey, trigger] of Object.entries(specials.triggers ?? {})) {
        const coordinates = parseCoordinateKey(coordinateKey);
        if (!coordinates) {
            continue;
        }

        const normalizedTrigger = toFiniteNumber(trigger);
        if (normalizedTrigger === undefined) {
            continue;
        }

        triggerByCoordinate.set(`${coordinates.x},${coordinates.y}`, normalizedTrigger);
    }

    for (let y = 1; y <= height; y++) {
        for (let x = 1; x <= width; x++) {
            const paletteId = rows[y - 1]?.[x - 1] ?? 0;
            const terrainTile = paletteId > 0 ? palette[String(paletteId)] : undefined;
            const coordinateKey = `${x},${y}`;
            const compactTile = {};

            if (terrainTile?.blocked) {
                compactTile.b = 1;
            }

            if (terrainTile?.graphics !== undefined) {
                compactTile.g = terrainTile.graphics;
            }

            const exit = exitByCoordinate.get(coordinateKey);
            if (exit) {
                compactTile.e = {
                    m: exit.map,
                    x: exit.x,
                    y: exit.y,
                };
            }

            const objectInfo = objectByCoordinate.get(coordinateKey);
            if (objectInfo) {
                compactTile.o = {
                    i: objectInfo.objIndex,
                    a: objectInfo.amount,
                };
            }

            const trigger = triggerByCoordinate.get(coordinateKey);
            if (trigger !== undefined) {
                compactTile.t = trigger;
            }

            const npcIndex = toFiniteNumber((specials.npcs ?? {})[coordinateKey]);
            if (npcIndex !== undefined) {
                compactTile.n = npcIndex;
            }

            const normalizedTile = sortCompactTile(compactTile);
            const tileKeys = Object.keys(normalizedTile);

            if (tileKeys.length === 0) {
                data.push(0);
                continue;
            }

            if (tileKeys.length === 1 && normalizedTile.g !== undefined) {
                if (typeof normalizedTile.g === "number") {
                    data.push(normalizedTile.g);
                    continue;
                }
            }

            if (tileKeys.length === 2 && normalizedTile.b === 1 && typeof normalizedTile.g === "number") {
                data.push(100000 + normalizedTile.g);
                continue;
            }

            const signature = JSON.stringify(normalizedTile);
            let complexIndex = complexIndexBySignature.get(signature);

            if (complexIndex === undefined) {
                complexIndex = complexTiles.length;
                complexIndexBySignature.set(signature, complexIndex);
                complexTiles.push(normalizedTile);
            }

            data.push(-(complexIndex + 1));
        }
    }

    return complexTiles.length > 0
        ? { id: mapId, w: width, h: height, d: data, cx: complexTiles }
        : { id: mapId, w: width, h: height, d: data };
}

function mergeNpcPlacements(specials, npcPlacements) {
    const mergedNpcs = { ...(specials.npcs ?? {}) };

    for (const placement of npcPlacements) {
        const x = toFiniteNumber(placement.x);
        const y = toFiniteNumber(placement.y);
        const npcIndex = toFiniteNumber(placement.npcIndex);
        if (x === undefined || y === undefined || npcIndex === undefined) {
            continue;
        }

        mergedNpcs[`${x},${y}`] = npcIndex;
    }

    return {
        ...specials,
        npcs: mergedNpcs,
    };
}

function getAvailableMapIds(sourceDir) {
    return fs
        .readdirSync(sourceDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name.match(MAP_DIR_PATTERN))
        .filter(Boolean)
        .map((match) => Number.parseInt(match[1], 10))
        .filter((mapId) => Number.isInteger(mapId) && mapId > 0)
        .sort((left, right) => left - right);
}

function exportAllMaps(sourceDir, outputDir) {
    const mapIds = getAvailableMapIds(sourceDir);
    if (mapIds.length === 0) {
        throw new Error(`No se encontraron carpetas de mapas en ${sourceDir}`);
    }

    fs.mkdirSync(outputDir, { recursive: true });

    for (const mapId of mapIds) {
        const mapDir = path.join(sourceDir, `mapa_${mapId}`);
        const terrainPath = path.join(mapDir, "terrain.json");
        const specialsPath = path.join(mapDir, "specials.json");

        if (!fs.existsSync(terrainPath)) {
            continue;
        }

        const terrain = JSON.parse(fs.readFileSync(terrainPath, "utf8"));
        const specials = fs.existsSync(specialsPath)
            ? JSON.parse(fs.readFileSync(specialsPath, "utf8"))
            : { id: mapId, exits: {}, objects: {}, npcs: {}, triggers: {} };
        const npcs = readMapNpcFile(sourceDir, mapId);
        const optimizedMap = buildCompactMap(mapId, terrain, mergeNpcPlacements(specials, npcs));

        const destPath = path.join(outputDir, `mapa_${mapId}.json`);
        fs.writeFileSync(destPath, JSON.stringify(optimizedMap), "utf8");
    }

    return mapIds.length;
}

function main() {
    const { force, customSourceDir, customOutputDir } = parseCliArgs(process.argv.slice(2));
    const outputDir = customOutputDir || OUTPUT_DIR;

    const existingCount = countExistingOptimizedMaps(outputDir);
    const hasBaseMap = fs.existsSync(path.join(outputDir, "mapa_1.json"));

    if (!force && existingCount >= 294 && hasBaseMap) {
        console.log(
            `[maps] Mapas optimizados ya presentes (${existingCount} mapas en ${path.relative(process.cwd(), outputDir)}). Omitiendo generación.`,
        );
        process.exit(0);
    }

    const sourceDir = resolveSourceDir(customSourceDir);

    if (!sourceDir) {
        console.error(`
================================================================================
[ERROR] Faltan los mapas optimizados en frontend/public/maps_optimized/.
El mundo no se dibujará si se compila o ejecuta el frontend sin estos archivos.

Para generarlos, ejecuta desde la raíz del proyecto:
    cd server && pnpm export-frontend-maps

O asegúrate de que el directorio 'server/mapas_source' esté disponible para
su generación automática.
================================================================================
`);
        process.exit(1);
    }

    console.log(
        `[maps] Generando mapas optimizados desde ${path.relative(process.cwd(), sourceDir) || sourceDir} hacia ${path.relative(process.cwd(), outputDir)}...`,
    );
    const count = exportAllMaps(sourceDir, outputDir);
    console.log(`[maps] Listo: ${count} mapas optimizados exportados correctamente.`);
}

main();
