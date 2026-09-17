import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { computeChecksum } from "./gameData";
import { listAvailableMapIds, type MapNpcPlacement } from "./mapNpcStorage";

/**
 * Tipos y normalizacion de mapas fuente (meta/terrain/npcs/specials).
 *
 * La capa de persistencia (#3) reutiliza estas formas tanto para importar
 * `mapas_source/` como para reconstruir un mapa desde las tablas
 * `game_maps` + `game_map_palette` + `game_map_grids`.
 */

export type GameMapMetadata = {
    id: number;
    name: string;
    musicNum: number;
    magiaSinEfecto: number;
    noEncriptarMp: number;
    terreno: string;
    zona: string;
    restringir: string;
    minLevel: number;
    maxLevel: number;
    backup: number;
    pk: number;
    [key: string]: unknown;
};

export type GameMapTerrainTile = {
    blocked?: boolean;
    graphics?: number | Array<number | null>;
    [key: string]: unknown;
};

export type GameMapTerrain = {
    id: number;
    width: number;
    height: number;
    palette: Record<string, GameMapTerrainTile>;
    rows: number[][];
    [key: string]: unknown;
};

export type GameMapSpecials = {
    id: number;
    exits: Record<string, unknown>;
    objects: Record<string, unknown>;
    npcs: Record<string, unknown>;
    triggers: Record<string, unknown>;
    [key: string]: unknown;
};

export type GameMapRecordData = {
    metadata: GameMapMetadata;
    terrain: GameMapTerrain;
    npcs: MapNpcPlacement[];
    specials: GameMapSpecials;
};

export type GameMapPaletteEntry = {
    paletteKey: number;
    graphics: unknown;
    blocked: boolean;
    tile: GameMapTerrainTile;
};

const MAP_DIR_PATTERN = /^mapa_(\d+)$/i;

export const DEFAULT_MAPS_SOURCE_DIR = path.resolve(
    __dirname,
    "../mapas_source",
);

function toInteger(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.trunc(value);
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.trunc(parsed);
        }
    }

    return fallback;
}

function toText(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
}

function asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? { ...(value as Record<string, unknown>) }
        : {};
}

function normalizeMetadata(value: unknown, mapId: number): GameMapMetadata {
    const raw = asObject(value);

    return {
        ...raw,
        id: mapId,
        name: toText(raw.name, `Mapa ${mapId}`),
        musicNum: toInteger(raw.musicNum),
        magiaSinEfecto: toInteger(raw.magiaSinEfecto),
        noEncriptarMp: toInteger(raw.noEncriptarMp),
        terreno: toText(raw.terreno),
        zona: toText(raw.zona),
        restringir: toText(raw.restringir, "No"),
        minLevel: toInteger(raw.minLevel),
        maxLevel: toInteger(raw.maxLevel),
        backup: toInteger(raw.backup),
        pk: toInteger(raw.pk),
    };
}

function normalizePaletteTile(value: unknown): GameMapTerrainTile | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return { ...(value as GameMapTerrainTile) };
}

export function normalizePalette(
    value: unknown,
): Record<string, GameMapTerrainTile> {
    const raw = asObject(value);
    const out: Record<string, GameMapTerrainTile> = {};

    for (const [key, tileValue] of Object.entries(raw)) {
        const paletteKey = toInteger(key, Number.NaN);
        if (!Number.isInteger(paletteKey) || paletteKey <= 0) {
            continue;
        }

        const tile = normalizePaletteTile(tileValue);
        if (!tile) {
            continue;
        }

        out[String(paletteKey)] = tile;
    }

    return out;
}

export function paletteEntriesFromTerrain(
    palette: Record<string, GameMapTerrainTile>,
): GameMapPaletteEntry[] {
    return Object.entries(palette)
        .map(([key, tile]) => {
            const paletteKey = toInteger(key);
            return {
                paletteKey,
                graphics: tile.graphics ?? null,
                blocked: Boolean(tile.blocked),
                tile,
            };
        })
        .filter((entry) => entry.paletteKey > 0)
        .sort((left, right) => left.paletteKey - right.paletteKey);
}

export function terrainFromParts(
    mapId: number,
    width: number,
    height: number,
    paletteEntries: GameMapPaletteEntry[],
    rows: number[][],
): GameMapTerrain {
    const palette: Record<string, GameMapTerrainTile> = {};
    for (const entry of paletteEntries) {
        palette[String(entry.paletteKey)] = entry.tile;
    }

    return {
        id: mapId,
        width: Math.max(1, width),
        height: Math.max(1, height),
        palette,
        rows,
    };
}

function normalizeRows(value: unknown): number[][] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((row) =>
        Array.isArray(row) ? row.map((cell) => toInteger(cell)) : [],
    );
}

function normalizeTerrain(value: unknown, mapId: number): GameMapTerrain {
    const raw = asObject(value);

    return {
        ...raw,
        id: mapId,
        width: Math.max(1, toInteger(raw.width, 100)),
        height: Math.max(1, toInteger(raw.height, 100)),
        palette: normalizePalette(raw.palette),
        rows: normalizeRows(raw.rows),
    };
}

function normalizeSpecials(value: unknown, mapId: number): GameMapSpecials {
    const raw = asObject(value);

    return {
        ...raw,
        id: mapId,
        exits: asObject(raw.exits),
        objects: asObject(raw.objects),
        npcs: asObject(raw.npcs),
        triggers: asObject(raw.triggers),
    };
}

function normalizeNpcPlacement(
    value: unknown,
    fallbackMapNum: number,
): MapNpcPlacement | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const raw = value as Record<string, unknown>;
    const mapNum = toInteger(raw.mapNum, fallbackMapNum);
    const x = toInteger(raw.x);
    const y = toInteger(raw.y);
    const npcIndex = toInteger(raw.npcIndex);
    const movement = raw.movement == null ? null : toInteger(raw.movement);

    if (mapNum <= 0 || x <= 0 || y <= 0 || npcIndex <= 0) {
        return null;
    }

    return movement === null
        ? { mapNum, x, y, npcIndex }
        : { mapNum, x, y, npcIndex, movement };
}

export function sortMapNpcPlacements(
    placements: MapNpcPlacement[],
): MapNpcPlacement[] {
    return [...placements].sort(
        (left, right) =>
            left.mapNum - right.mapNum ||
            left.y - right.y ||
            left.x - right.x ||
            left.npcIndex - right.npcIndex,
    );
}

function normalizeNpcPlacements(
    value: unknown,
    fallbackMapNum: number,
): MapNpcPlacement[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return sortMapNpcPlacements(
        value
            .map((entry) => normalizeNpcPlacement(entry, fallbackMapNum))
            .filter((entry): entry is MapNpcPlacement => Boolean(entry)),
    );
}

export function normalizeGameMapData(
    input: unknown,
    fallbackMapId?: number,
): GameMapRecordData {
    const raw = asObject(input);
    const rawMetadata = asObject(raw.metadata);
    const rawTerrain = asObject(raw.terrain);
    const rawSpecials = asObject(raw.specials);
    const mapId =
        fallbackMapId ??
        toInteger(
            rawMetadata.id,
            toInteger(rawTerrain.id, toInteger(rawSpecials.id)),
        );

    if (!Number.isInteger(mapId) || mapId <= 0) {
        throw new Error("Map id invalido");
    }

    return {
        metadata: normalizeMetadata(rawMetadata, mapId),
        terrain: normalizeTerrain(rawTerrain, mapId),
        npcs: normalizeNpcPlacements(raw.npcs, mapId),
        specials: normalizeSpecials(rawSpecials, mapId),
    };
}

export function computeGameMapChecksum(data: GameMapRecordData): string {
    return computeChecksum(normalizeGameMapData(data, data.metadata.id));
}

async function readJsonIfExists(filePath: string, fallback: unknown) {
    if (!existsSync(filePath)) {
        return fallback;
    }

    return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
}

export async function listGameMapSourceIds(
    mapsSourceDir = DEFAULT_MAPS_SOURCE_DIR,
): Promise<number[]> {
    if (!existsSync(mapsSourceDir)) {
        return [];
    }

    const directoryIds = await listAvailableMapIds(mapsSourceDir);
    const idsWithRequiredFiles: number[] = [];

    for (const mapId of directoryIds) {
        const mapDir = path.join(mapsSourceDir, `mapa_${mapId}`);
        if (
            existsSync(path.join(mapDir, "meta.json")) &&
            existsSync(path.join(mapDir, "terrain.json"))
        ) {
            idsWithRequiredFiles.push(mapId);
        }
    }

    return idsWithRequiredFiles;
}

export async function loadGameMapFromDirectory(
    mapsSourceDir: string,
    mapId: number,
): Promise<GameMapRecordData | null> {
    const mapDir = path.join(mapsSourceDir, `mapa_${mapId}`);
    const metaPath = path.join(mapDir, "meta.json");
    const terrainPath = path.join(mapDir, "terrain.json");

    if (!existsSync(metaPath) || !existsSync(terrainPath)) {
        return null;
    }

    const [metadata, terrain, npcs, specials] = await Promise.all([
        readJsonIfExists(metaPath, { id: mapId }),
        readJsonIfExists(terrainPath, { id: mapId }),
        readJsonIfExists(path.join(mapDir, "npcs.json"), []),
        readJsonIfExists(path.join(mapDir, "specials.json"), { id: mapId }),
    ]);

    return normalizeGameMapData(
        {
            metadata,
            terrain,
            npcs,
            specials,
        },
        mapId,
    );
}

export async function loadGameMapsFromDirectory(
    mapsSourceDir = DEFAULT_MAPS_SOURCE_DIR,
): Promise<GameMapRecordData[]> {
    const mapIds = await listGameMapSourceIds(mapsSourceDir);
    const maps = await Promise.all(
        mapIds.map((mapId) => loadGameMapFromDirectory(mapsSourceDir, mapId)),
    );

    return maps.filter((map): map is GameMapRecordData => Boolean(map));
}

export function parseMapIdFromDirectoryName(name: string): number | null {
    const match = name.match(MAP_DIR_PATTERN);
    if (!match) {
        return null;
    }

    const mapId = Number.parseInt(match[1] ?? "", 10);
    return Number.isInteger(mapId) && mapId > 0 ? mapId : null;
}
