import fs from "node:fs";
import path from "node:path";

export type LegacyTile = {
    blocked: boolean;
    layer1: number;
    layer2: number;
    layer3: number;
    layer4: number;
    trigger: number;
};

export type LegacyMapData = {
    version: number;
    header: string;
    tiles: LegacyTile[][]; // 100 x 100 (1-indexed or 0-indexed 100x100)
    metadata: Record<string, string | number>;
};

export type SourceTerrainTile = {
    blocked?: boolean;
    graphics: number | Array<number | null>;
};

export type SourceTerrain = {
    id: number;
    width: number;
    height: number;
    palette: Record<string, SourceTerrainTile>;
    rows: number[][];
};

export type SourceSpecials = {
    id: number;
    exits: Record<string, { map: number; x: number; y: number } | { destinations: Array<{ map: number; x: number; y: number }> }>;
    objects: Record<string, { objIndex: number; amount: number }>;
    npcs: Record<string, number>;
    triggers: Record<string, number>;
};

export type SourceMeta = {
    id: number;
    name: string;
    musicNum: number;
    magiaSinEfecto: number;
    noEncriptarMp: number;
    terreno: string;
    zona: string;
    restringir: string | number;
    minLevel: number;
    maxLevel: number;
    backup: number;
    pk: number;
};

const VB6_MAP_HEADER_SIZE = 261; // 2 bytes version (Int16) + 255 bytes description + 4 bytes padding (Int32) = 261 bytes
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;

/**
 * Safely writes a 16-bit signed integer into buffer without throwing RangeError.
 * Legacy VB6 binary .map format strictly uses 16-bit signed integers (2 bytes per layer, 11 bytes per tile).
 * If modern OpenAO graphic indices or triggers exceed the Int16 range (-32768..32767), they are clamped
 * to prevent runtime crashes during legacy map exports.
 */
function writeSafeInt16LE(buffer: Buffer, value: number, offset: number): void {
    const intVal = Number.isFinite(value) ? Math.trunc(value) : 0;
    const clamped = Math.min(32767, Math.max(-32768, intVal));
    buffer.writeInt16LE(clamped, offset);
}

/**
 * Encodes a 100x100 grid of tiles into the classic binary format (.map)
 */
export function encodeVb6BinaryMap(tiles: LegacyTile[][], mapName = "Argentum Online Map"): Buffer {
    const buffer = Buffer.alloc(VB6_MAP_HEADER_SIZE + MAP_WIDTH * MAP_HEIGHT * 11);
    let offset = 0;

    // Header: Map version (Int16)
    buffer.writeInt16LE(1, offset);
    offset += 2;

    // Header string (255 bytes)
    const nameBuf = Buffer.alloc(255);
    nameBuf.write(mapName, "latin1");
    nameBuf.copy(buffer, offset);
    offset += 255;

    // Extra header padding (Int32)
    buffer.writeInt32LE(0, offset);
    offset += 4;

    // Tile stream: Y (1 to 100), X (1 to 100)
    for (let y = 1; y <= MAP_HEIGHT; y++) {
        for (let x = 1; x <= MAP_WIDTH; x++) {
            const tile = tiles[y]?.[x] ?? {
                blocked: false,
                layer1: 0,
                layer2: 0,
                layer3: 0,
                layer4: 0,
                trigger: 0,
            };

            buffer.writeUInt8(tile.blocked ? 1 : 0, offset);
            offset += 1;
            writeSafeInt16LE(buffer, tile.layer1, offset);
            offset += 2;
            writeSafeInt16LE(buffer, tile.layer2, offset);
            offset += 2;
            writeSafeInt16LE(buffer, tile.layer3, offset);
            offset += 2;
            writeSafeInt16LE(buffer, tile.layer4, offset);
            offset += 2;
            writeSafeInt16LE(buffer, tile.trigger, offset);
            offset += 2;
        }
    }

    return buffer;
}

/**
 * Decodes a binary .map buffer into a 100x100 LegacyTile grid
 */
export function decodeVb6BinaryMap(buffer: Buffer): { version: number; header: string; tiles: LegacyTile[][] } {
    let offset = 0;
    const version = buffer.readInt16LE(offset);
    offset += 2;

    const header = buffer.toString("latin1", offset, offset + 255).replace(/\0/g, "").trim();
    offset += 255;

    offset += 4; // padding

    const tiles: LegacyTile[][] = [];

    for (let y = 1; y <= MAP_HEIGHT; y++) {
        tiles[y] = [];
        for (let x = 1; x <= MAP_WIDTH; x++) {
            const blocked = buffer.readUInt8(offset) === 1;
            offset += 1;
            const layer1 = buffer.readInt16LE(offset);
            offset += 2;
            const layer2 = buffer.readInt16LE(offset);
            offset += 2;
            const layer3 = buffer.readInt16LE(offset);
            offset += 2;
            const layer4 = buffer.readInt16LE(offset);
            offset += 2;
            const trigger = buffer.readInt16LE(offset);
            offset += 2;

            tiles[y][x] = {
                blocked,
                layer1,
                layer2,
                layer3,
                layer4,
                trigger,
            };
        }
    }

    return { version, header, tiles };
}

/**
 * Converts OpenAO JSON map (meta.json, terrain.json, specials.json) into legacy VB6 .map + .dat files
 */
export function convertSourceMapToVb6(
    meta: SourceMeta,
    terrain: SourceTerrain,
    specials: SourceSpecials,
): { mapBuffer: Buffer; datText: string } {
    const tiles: LegacyTile[][] = [];

    for (let y = 1; y <= MAP_HEIGHT; y++) {
        tiles[y] = [];
        for (let x = 1; x <= MAP_WIDTH; x++) {
            const paletteId = terrain.rows[y - 1]?.[x - 1];
            const terrainTile = paletteId ? terrain.palette[String(paletteId)] : undefined;

            let layer1 = 0;
            let layer2 = 0;
            let layer3 = 0;
            let layer4 = 0;

            if (terrainTile) {
                if (typeof terrainTile.graphics === "number") {
                    layer1 = terrainTile.graphics;
                } else if (Array.isArray(terrainTile.graphics)) {
                    layer1 = terrainTile.graphics[0] ?? 0;
                    layer2 = terrainTile.graphics[1] ?? 0;
                    layer3 = terrainTile.graphics[2] ?? 0;
                    layer4 = terrainTile.graphics[3] ?? 0;
                }
            }

            const coordKey = `${x},${y}`;
            const trigger = specials.triggers?.[coordKey] ?? 0;
            const blocked = !!terrainTile?.blocked;

            tiles[y][x] = {
                blocked,
                layer1,
                layer2,
                layer3,
                layer4,
                trigger,
            };
        }
    }

    const mapBuffer = encodeVb6BinaryMap(tiles, meta.name || `Mapa ${meta.id}`);

    const datLines = [
        `[MAPA${meta.id}]`,
        `Name=${meta.name || ""}`,
        `MusicNum=${meta.musicNum || 0}`,
        `MagiaSinEfecto=${meta.magiaSinEfecto || 0}`,
        `NoEncriptarMp=${meta.noEncriptarMp || 0}`,
        `Terreno=${meta.terreno || "BOSQUE"}`,
        `Zona=${meta.zona || "CAMPO"}`,
        `Restringir=${meta.restringir ?? "No"}`,
        `MinLevel=${meta.minLevel || 0}`,
        `MaxLevel=${meta.maxLevel || 0}`,
        `Backup=${meta.backup || 0}`,
        `Pk=${meta.pk || 0}`,
    ];

    return {
        mapBuffer,
        datText: datLines.join("\r\n") + "\r\n",
    };
}

/**
 * Converts legacy VB6 .map buffer + INI text into OpenAO JSON source structures
 */
export function convertVb6ToSourceMap(
    mapNum: number,
    mapBuffer: Buffer,
    datText?: string,
): { meta: SourceMeta; terrain: SourceTerrain; specials: SourceSpecials } {
    const decoded = decodeVb6BinaryMap(mapBuffer);

    // Parse INI datText if provided
    const iniValues: Record<string, string> = {};
    if (datText) {
        for (const line of datText.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("[") || trimmed.startsWith("#")) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx !== -1) {
                const k = trimmed.slice(0, eqIdx).trim().toLowerCase();
                const v = trimmed.slice(eqIdx + 1).trim();
                iniValues[k] = v;
            }
        }
    }

    const meta: SourceMeta = {
        id: mapNum,
        name: iniValues["name"] || decoded.header || `Mapa ${mapNum}`,
        musicNum: Number(iniValues["musicnum"] || 0),
        magiaSinEfecto: Number(iniValues["magiasinefecto"] || 0),
        noEncriptarMp: Number(iniValues["noencriptarmp"] || 0),
        terreno: iniValues["terreno"] || "BOSQUE",
        zona: iniValues["zona"] || "CAMPO",
        restringir: iniValues["restringir"] || "No",
        minLevel: Number(iniValues["minlevel"] || 0),
        maxLevel: Number(iniValues["maxlevel"] || 0),
        backup: Number(iniValues["backup"] || 0),
        pk: Number(iniValues["pk"] || 0),
    };

    const palette: Record<string, SourceTerrainTile> = {};
    const paletteSigToId = new Map<string, number>();
    let nextPaletteId = 1;

    const rows: number[][] = [];
    const specials: SourceSpecials = {
        id: mapNum,
        exits: {},
        objects: {},
        npcs: {},
        triggers: {},
    };

    for (let y = 1; y <= MAP_HEIGHT; y++) {
        const row: number[] = [];
        for (let x = 1; x <= MAP_WIDTH; x++) {
            const tile = decoded.tiles[y][x];

            let graphics: number | Array<number | null>;
            if (tile.layer2 === 0 && tile.layer3 === 0 && tile.layer4 === 0) {
                graphics = tile.layer1;
            } else {
                graphics = [
                    tile.layer1 || null,
                    tile.layer2 || null,
                    tile.layer3 || null,
                    tile.layer4 || null,
                ];
            }

            const terrainTile: SourceTerrainTile = {
                graphics,
            };
            if (tile.blocked) {
                terrainTile.blocked = true;
            }

            const sig = JSON.stringify(terrainTile);
            let paletteId = paletteSigToId.get(sig);
            if (paletteId === undefined) {
                paletteId = nextPaletteId++;
                paletteSigToId.set(sig, paletteId);
                palette[String(paletteId)] = terrainTile;
            }

            row.push(paletteId);

            if (tile.trigger > 0) {
                specials.triggers[`${x},${y}`] = tile.trigger;
            }
        }
        rows.push(row);
    }

    const terrain: SourceTerrain = {
        id: mapNum,
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        palette,
        rows,
    };

    return { meta, terrain, specials };
}
