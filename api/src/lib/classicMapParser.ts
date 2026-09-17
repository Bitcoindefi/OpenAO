import { Buffer } from "buffer";

export interface ClassicMapHeader {
    version: number;
    mapNum: number;
    name: string;
}

export interface ClassicTile {
    x: number; // 1..100
    y: number; // 1..100
    blocked: boolean;
    layer1: number;
    layer2: number;
    layer3: number;
    layer4: number;
    trigger: number;
}

export interface ClassicInfExit {
    map: number;
    x: number;
    y: number;
}

export interface ClassicInfObject {
    objIndex: number;
    amount: number;
}

export interface ClassicInfNpc {
    npcIndex: number;
}

export interface ClassicMapData {
    header: ClassicMapHeader;
    tiles: ClassicTile[][]; // 100x100
    exits: Record<string, ClassicInfExit>; // "x,y" => Exit
    objects: Record<string, ClassicInfObject>; // "x,y" => Object
    npcs: Record<string, ClassicInfNpc>; // "x,y" => NPC
    metadata: Record<string, string | number>;
}

export interface OpenAOMeta {
    id: number;
    name: string;
    musicNum: number;
    magiaSinEfecto: number;
    noEncriptarMp: number;
    terreno: string;
    zona: string;
    restringir: string;
    maxLevel: number;
    backup: number;
    pk: number;
}

export interface OpenAONpcPlacement {
    mapNum: number;
    x: number;
    y: number;
    npcIndex: number;
    movement?: number;
}

export interface OpenAOSpecials {
    id: number;
    exits?: Record<string, { map: number; x: number; y: number } | { destinations: Array<{ map: number; x: number; y: number }> }>;
    objects?: Record<string, { objIndex: number; amount: number }>;
    npcs?: Record<string, number>;
    triggers?: Record<string, number>;
    blocked?: Record<string, boolean>;
}

export interface OpenAOMapBundle {
    meta: OpenAOMeta;
    terrain: number[][][]; // [100][100][4] or layers
    npcs: OpenAONpcPlacement[];
    specials: OpenAOSpecials;
}

export interface TranslationAuditReport {
    mapId: number;
    success: boolean;
    translatedTiles: number;
    skippedOrShiftedGraphics: Array<{ tile: string; layer: number; originalId: number; mappedId: number }>;
    unmappedTriggers: Array<{ tile: string; triggerId: number; reason: string }>;
    droppedObjects: Array<{ tile: string; reason: string }>;
    warnings: string[];
}

/**
 * Cleanroom parser for classic Argentum Online .map binary format.
 */
export function parseClassicMapBuffer(buffer: Buffer): { header: ClassicMapHeader; tiles: ClassicTile[][] } {
    let offset = 0;

    // Version (Int16)
    const version = buffer.readInt16LE(offset);
    offset += 2;

    // Header Name (32 bytes string)
    const nameBytes = buffer.subarray(offset, offset + 32);
    const name = nameBytes.toString("latin1").replace(/\0.*$/g, "").trim();
    offset += 32;

    // Map Number (Int16)
    const mapNum = buffer.readInt16LE(offset);
    offset += 2;

    // Skip reserved header space if any (padding to 64 bytes)
    if (offset < 64) {
        offset = 64;
    }

    const header: ClassicMapHeader = { version, mapNum, name };
    const tiles: ClassicTile[][] = [];

    for (let y = 1; y <= 100; y++) {
        const row: ClassicTile[] = [];
        for (let x = 1; x <= 100; x++) {
            if (offset + 10 > buffer.length) {
                // Return default empty tile if buffer truncated
                row.push({ x, y, blocked: false, layer1: 0, layer2: 0, layer3: 0, layer4: 0, trigger: 0 });
                continue;
            }

            const blocked = buffer.readUInt8(offset) !== 0;
            offset += 1;

            const layer1 = buffer.readUInt16LE(offset);
            offset += 2;

            const layer2 = buffer.readUInt16LE(offset);
            offset += 2;

            const layer3 = buffer.readUInt16LE(offset);
            offset += 2;

            const layer4 = buffer.readUInt16LE(offset);
            offset += 2;

            const trigger = buffer.readUInt8(offset);
            offset += 1;

            row.push({ x, y, blocked, layer1, layer2, layer3, layer4, trigger });
        }
        tiles.push(row);
    }

    return { header, tiles };
}

/**
 * Serialize OpenAO map data back to classic binary .map format.
 */
export function encodeClassicMapBuffer(header: ClassicMapHeader, tiles: ClassicTile[][]): Buffer {
    const buffer = Buffer.alloc(64 + 100 * 100 * 10);
    let offset = 0;

    buffer.writeInt16LE(header.version, offset);
    offset += 2;

    const nameBuf = Buffer.alloc(32);
    nameBuf.write(header.name, 0, 32, "latin1");
    nameBuf.copy(buffer, offset);
    offset += 32;

    buffer.writeInt16LE(header.mapNum, offset);
    offset += 2;

    // Pad header to 64 bytes
    offset = 64;

    for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
            const tile = tiles[y]?.[x] ?? {
                x: x + 1,
                y: y + 1,
                blocked: false,
                layer1: 0,
                layer2: 0,
                layer3: 0,
                layer4: 0,
                trigger: 0,
            };

            buffer.writeUInt8(tile.blocked ? 1 : 0, offset);
            offset += 1;

            buffer.writeUInt16LE(tile.layer1, offset);
            offset += 2;

            buffer.writeUInt16LE(tile.layer2, offset);
            offset += 2;

            buffer.writeUInt16LE(tile.layer3, offset);
            offset += 2;

            buffer.writeUInt16LE(tile.layer4, offset);
            offset += 2;

            buffer.writeUInt8(tile.trigger, offset);
            offset += 1;
        }
    }

    return buffer;
}

/**
 * Parse classic .inf file (INI text format for exits, objects, npcs).
 */
export function parseClassicInfText(infContent: string): {
    exits: Record<string, ClassicInfExit>;
    objects: Record<string, ClassicInfObject>;
    npcs: Record<string, ClassicInfNpc>;
} {
    const exits: Record<string, ClassicInfExit> = {};
    const objects: Record<string, ClassicInfObject> = {};
    const npcs: Record<string, ClassicInfNpc> = {};

    let currentSection = "";

    for (const rawLine of infContent.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith(";") || line.startsWith("#")) {
            continue;
        }

        if (line.startsWith("[") && line.endsWith("]")) {
            currentSection = line.slice(1, -1).trim();
            continue;
        }

        const matchTile = currentSection.match(/^(\d+)-(\d+)$/);
        if (!matchTile) {
            continue;
        }

        const x = Number.parseInt(matchTile[1], 10);
        const y = Number.parseInt(matchTile[2], 10);
        const tileKey = `${x},${y}`;

        const parts = line.split("=");
        if (parts.length < 2) {
            continue;
        }

        const key = parts[0].trim().toUpperCase();
        const value = parts.slice(1).join("=").trim();

        if (key === "OBJ") {
            const [objIdxStr, amountStr] = value.split(",");
            const objIndex = Number.parseInt(objIdxStr, 10);
            const amount = Number.parseInt(amountStr ?? "1", 10);
            if (Number.isInteger(objIndex) && objIndex > 0) {
                objects[tileKey] = { objIndex, amount: Number.isInteger(amount) ? amount : 1 };
            }
        } else if (key === "NPC") {
            const npcIndex = Number.parseInt(value, 10);
            if (Number.isInteger(npcIndex) && npcIndex > 0) {
                npcs[tileKey] = { npcIndex };
            }
        } else if (key === "EXIT") {
            const [mapStr, exitXStr, exitYStr] = value.split("-");
            const map = Number.parseInt(mapStr, 10);
            const exitX = Number.parseInt(exitXStr, 10);
            const exitY = Number.parseInt(exitYStr, 10);
            if (Number.isInteger(map) && Number.isInteger(exitX) && Number.isInteger(exitY)) {
                exits[tileKey] = { map, x: exitX, y: exitY };
            }
        }
    }

    return { exits, objects, npcs };
}

/**
 * Parse classic .dat header metadata INI content.
 */
export function parseClassicDatText(datContent: string): Record<string, string | number> {
    const metadata: Record<string, string | number> = {};

    for (const rawLine of datContent.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith(";") || line.startsWith("#") || line.startsWith("[")) {
            continue;
        }

        const parts = line.split("=");
        if (parts.length < 2) {
            continue;
        }

        const key = parts[0].trim();
        const rawVal = parts.slice(1).join("=").trim();
        const numVal = Number(rawVal);

        metadata[key] = Number.isFinite(numVal) ? numVal : rawVal;
    }

    return metadata;
}

/**
 * Convert classic map data bundle into OpenAO schema.
 */
export function convertClassicToOpenAO(
    classicData: ClassicMapData,
    graphicsMapping?: Record<number, number>,
): { bundle: OpenAOMapBundle; report: TranslationAuditReport } {
    const { header, tiles, exits, objects, npcs, metadata } = classicData;
    const mapId = header.mapNum || 1;

    const skippedOrShiftedGraphics: TranslationAuditReport["skippedOrShiftedGraphics"] = [];
    const unmappedTriggers: TranslationAuditReport["unmappedTriggers"] = [];
    const droppedObjects: TranslationAuditReport["droppedObjects"] = [];
    const warnings: string[] = [];

    const meta: OpenAOMeta = {
        id: mapId,
        name: (metadata.Name as string) || header.name || `Mapa ${mapId}`,
        musicNum: (metadata.MusicNum as number) ?? 1,
        magiaSinEfecto: (metadata.MagiaSinEfecto as number) ?? 0,
        noEncriptarMp: (metadata.NoEncriptarMp as number) ?? 0,
        terreno: (metadata.Terreno as string) || "BOSQUE",
        zona: (metadata.Zona as string) || "CAMPO",
        restringir: (metadata.Restringir as string) || "No",
        maxLevel: (metadata.MaxLevel as number) ?? 0,
        backup: (metadata.Backup as number) ?? 1,
        pk: (metadata.Pk as number) ?? 1,
    };

    const terrainGrid: number[][][] = [];
    const openAONpcs: OpenAONpcPlacement[] = [];
    const specialsExits: Record<string, { map: number; x: number; y: number }> = {};
    const specialsObjects: Record<string, { objIndex: number; amount: number }> = {};
    const specialsTriggers: Record<string, number> = {};

    let translatedTilesCount = 0;

    for (let yIndex = 0; yIndex < 100; yIndex++) {
        const rowLayers: number[][] = [];
        for (let xIndex = 0; xIndex < 100; xIndex++) {
            const tile = tiles[yIndex]?.[xIndex];
            const posX = xIndex + 1;
            const posY = yIndex + 1;
            const tileKey = `${posX},${posY}`;

            if (!tile) {
                rowLayers.push([0, 0, 0, 0]);
                continue;
            }

            translatedTilesCount++;

            // Graphic index remapping
            const mapGfx = (gfxId: number, layer: number): number => {
                if (gfxId <= 0) return 0;
                if (graphicsMapping && graphicsMapping[gfxId] !== undefined) {
                    const mapped = graphicsMapping[gfxId];
                    if (mapped !== gfxId) {
                        skippedOrShiftedGraphics.push({ tile: tileKey, layer, originalId: gfxId, mappedId: mapped });
                    }
                    return mapped;
                }
                return gfxId;
            };

            const l1 = mapGfx(tile.layer1, 1);
            const l2 = mapGfx(tile.layer2, 2);
            const l3 = mapGfx(tile.layer3, 3);
            const l4 = mapGfx(tile.layer4, 4);

            rowLayers.push([l1, l2, l3, l4]);

            // Triggers
            if (tile.trigger > 0) {
                if (tile.trigger > 10) {
                    unmappedTriggers.push({
                        tile: tileKey,
                        triggerId: tile.trigger,
                        reason: "Trigger ID exceeds standard OpenAO triggers limit",
                    });
                }
                specialsTriggers[tileKey] = tile.trigger;
            }
        }
        terrainGrid.push(rowLayers);
    }

    // Exits
    for (const [key, exit] of Object.entries(exits)) {
        specialsExits[key] = { map: exit.map, x: exit.x, y: exit.y };
    }

    // Objects
    for (const [key, obj] of Object.entries(objects)) {
        if (obj.objIndex <= 0) {
            droppedObjects.push({ tile: key, reason: "Invalid object index <= 0" });
            continue;
        }
        specialsObjects[key] = { objIndex: obj.objIndex, amount: obj.amount };
    }

    // NPCs
    for (const [key, npc] of Object.entries(npcs)) {
        const [xStr, yStr] = key.split(",");
        const x = Number.parseInt(xStr, 10);
        const y = Number.parseInt(yStr, 10);
        openAONpcs.push({ mapNum: mapId, x, y, npcIndex: npc.npcIndex });
    }

    const specials: OpenAOSpecials = {
        id: mapId,
        exits: Object.keys(specialsExits).length > 0 ? specialsExits : undefined,
        objects: Object.keys(specialsObjects).length > 0 ? specialsObjects : undefined,
        triggers: Object.keys(specialsTriggers).length > 0 ? specialsTriggers : undefined,
    };

    const report: TranslationAuditReport = {
        mapId,
        success: true,
        translatedTiles: translatedTilesCount,
        skippedOrShiftedGraphics,
        unmappedTriggers,
        droppedObjects,
        warnings,
    };

    return {
        bundle: {
            meta,
            terrain: terrainGrid,
            npcs: openAONpcs,
            specials,
        },
        report,
    };
}

/**
 * Convert OpenAO map schema back to Classic Map Data for export.
 */
export function convertOpenAOToClassic(bundle: OpenAOMapBundle): ClassicMapData {
    const { meta, terrain, npcs, specials } = bundle;

    const header: ClassicMapHeader = {
        version: 1,
        mapNum: meta.id,
        name: meta.name || `Mapa ${meta.id}`,
    };

    const tiles: ClassicTile[][] = [];
    const exits: Record<string, ClassicInfExit> = {};
    const objects: Record<string, ClassicInfObject> = {};
    const classicNpcs: Record<string, ClassicInfNpc> = {};

    for (let yIndex = 0; yIndex < 100; yIndex++) {
        const row: ClassicTile[] = [];
        for (let xIndex = 0; xIndex < 100; xIndex++) {
            const posX = xIndex + 1;
            const posY = yIndex + 1;
            const tileKey = `${posX},${posY}`;

            const layerVals = terrain[yIndex]?.[xIndex] || [0, 0, 0, 0];
            const triggerVal = specials?.triggers?.[tileKey] ?? 0;

            row.push({
                x: posX,
                y: posY,
                blocked: false,
                layer1: layerVals[0] || 0,
                layer2: layerVals[1] || 0,
                layer3: layerVals[2] || 0,
                layer4: layerVals[3] || 0,
                trigger: triggerVal,
            });
        }
        tiles.push(row);
    }

    if (specials?.exits) {
        for (const [key, val] of Object.entries(specials.exits)) {
            if ("map" in val) {
                exits[key] = { map: val.map, x: val.x, y: val.y };
            }
        }
    }

    if (specials?.objects) {
        for (const [key, val] of Object.entries(specials.objects)) {
            objects[key] = { objIndex: val.objIndex, amount: val.amount };
        }
    }

    for (const npc of npcs) {
        const tileKey = `${npc.x},${npc.y}`;
        classicNpcs[tileKey] = { npcIndex: npc.npcIndex };
    }

    return {
        header,
        tiles,
        exits,
        objects,
        npcs: classicNpcs,
        metadata: {
            Name: meta.name,
            MusicNum: meta.musicNum,
            MagiaSinEfecto: meta.magiaSinEfecto,
            NoEncriptarMp: meta.noEncriptarMp,
            Terreno: meta.terreno,
            Zona: meta.zona,
            Restringir: meta.restringir,
            MaxLevel: meta.maxLevel,
            Backup: meta.backup,
            Pk: meta.pk,
        },
    };
}

/**
 * Round-trip validation test (Classic -> OpenAO -> Classic).
 */
export function validateRoundTrip(originalData: ClassicMapData): { valid: boolean; differences: string[] } {
    const { bundle } = convertClassicToOpenAO(originalData);
    const reexportedData = convertOpenAOToClassic(bundle);

    const differences: string[] = [];

    if (originalData.header.mapNum !== reexportedData.header.mapNum) {
        differences.push(`MapNum mismatch: original ${originalData.header.mapNum} vs reexported ${reexportedData.header.mapNum}`);
    }

    let tileMismatchCount = 0;
    for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
            const origTile = originalData.tiles[y]?.[x];
            const reexpTile = reexportedData.tiles[y]?.[x];

            if (!origTile || !reexpTile) continue;

            if (
                origTile.layer1 !== reexpTile.layer1 ||
                origTile.layer2 !== reexpTile.layer2 ||
                origTile.layer3 !== reexpTile.layer3 ||
                origTile.layer4 !== reexpTile.layer4 ||
                origTile.trigger !== reexpTile.trigger
            ) {
                tileMismatchCount++;
            }
        }
    }

    if (tileMismatchCount > 0) {
        differences.push(`Found ${tileMismatchCount} mismatched tiles in round-trip conversion`);
    }

    return {
        valid: differences.length === 0,
        differences,
    };
}
