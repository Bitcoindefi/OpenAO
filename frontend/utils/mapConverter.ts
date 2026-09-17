/**
 * mapConverter.ts — Bidirectional WorldEditor (.map / .inf / .dat) <-> OpenAO Map Converter
 * 
 * Cleanroom parser and serializer for 20+ years of Argentum Online WorldEditor maps.
 * Translates between classic desktop map binaries/INI and OpenAO web client MapData structures.
 */

import { MapData, MapTile } from "../types/game";

export interface MapMetadata {
    name?: string;
    music?: string | number;
    safeZone?: boolean;
    pkZone?: boolean;
    magiaSinEfecto?: boolean;
    inviSinEfecto?: boolean;
    resuSinEfecto?: boolean;
    backupMode?: boolean;
    rawDat?: Record<string, string>;
}

export interface WorldEditorTile {
    x: number;
    y: number;
    blocked: boolean;
    graphics: number[]; // [layer1, layer2, layer3, layer4] (0 if empty)
    trigger: number;
    tileExit?: {
        map: number;
        x: number;
        y: number;
    };
    npcIndex?: number;
    objInfo?: {
        objIndex: number;
        amount: number;
    };
}

export interface ImportDiagnostic {
    totalTilesProcessed: number;
    blockedTilesCount: number;
    layerTilesCount: {
        layer1: number;
        layer2: number;
        layer3: number;
        layer4: number;
    };
    triggersCount: number;
    tileExitsCount: number;
    npcsCount: number;
    objectsCount: number;
    warnings: string[];
    unsupportedTriggers: number[];
}

export interface ImportResult {
    success: boolean;
    mapNumber: number;
    mapData: MapData;
    metadata: MapMetadata;
    diagnostics: ImportDiagnostic;
}

export interface ExportResult {
    mapBinary: Uint8Array;
    infText: string;
    datText: string;
    exportedTilesCount: number;
}

export interface DiffReport {
    isIdentical: boolean;
    mismatchedTilesCount: number;
    differences: Array<{
        x: number;
        y: number;
        field: string;
        expected: unknown;
        actual: unknown;
    }>;
}

/**
 * Standard WorldEditor .map binary format constants
 */
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
const MAP_VERSION_HEADER_SIZE = 2; // 2-byte integer version

/**
 * Parse INI string helper
 */
export function parseIni(content: string): Record<string, Record<string, string>> {
    const lines = content.split(/\r?\n/);
    const result: Record<string, Record<string, string>> = {};
    let currentSection = "DEFAULT";

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("'") || trimmed.startsWith("#") || trimmed.startsWith(";")) {
            continue;
        }

        const sectionMatch = trimmed.match(/^\[(.*)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].toUpperCase();
            if (!result[currentSection]) {
                result[currentSection] = {};
            }
            continue;
        }

        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim().toUpperCase();
            const val = trimmed.substring(eqIdx + 1).trim();
            if (!result[currentSection]) {
                result[currentSection] = {};
            }
            result[currentSection][key] = val;
        }
    }

    return result;
}

/**
 * Cleanroom binary .map reader
 */
export function importWorldEditorMap(
    mapBuffer: ArrayBuffer | Uint8Array,
    infContent: string = "",
    datContent: string = "",
    mapNumber: number = 1
): ImportResult {
    const bytes = mapBuffer instanceof Uint8Array ? mapBuffer : new Uint8Array(mapBuffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const diagnostics: ImportDiagnostic = {
        totalTilesProcessed: 0,
        blockedTilesCount: 0,
        layerTilesCount: { layer1: 0, layer2: 0, layer3: 0, layer4: 0 },
        triggersCount: 0,
        tileExitsCount: 0,
        npcsCount: 0,
        objectsCount: 0,
        warnings: [],
        unsupportedTriggers: []
    };

    const mapData: MapData = {
        [mapNumber.toString()]: {}
    };

    const mapRef = mapData[mapNumber.toString()];

    for (let y = 1; y <= MAP_HEIGHT; y++) {
        mapRef[y.toString()] = {};
    }

    let offset = 0;

    // Read header (version)
    if (bytes.length >= 2) {
        const version = view.getInt16(offset, true);
        offset += MAP_VERSION_HEADER_SIZE;
        if (version < 0) {
            diagnostics.warnings.push(`Non-standard map version detected: ${version}`);
        }
    }

    // Parse Binary Tiles
    for (let y = 1; y <= MAP_HEIGHT; y++) {
        for (let x = 1; x <= MAP_WIDTH; x++) {
            if (offset >= bytes.length) {
                diagnostics.warnings.push(`Unexpected EOF at tile (${x}, ${y})`);
                break;
            }

            diagnostics.totalTilesProcessed++;

            const flags = view.getUint8(offset);
            offset += 1;

            const isBlocked = (flags & 1) !== 0;
            const hasLayer2 = (flags & 2) !== 0;
            const hasLayer3 = (flags & 4) !== 0;
            const hasLayer4 = (flags & 8) !== 0;
            const hasTrigger = (flags & 16) !== 0;

            const tile: MapTile = {};

            if (isBlocked) {
                tile.blocked = 1;
                diagnostics.blockedTilesCount++;
            }

            const graphics: Record<string, number> = {};

            // Layer 1 is always present (2 bytes GrhIndex)
            if (offset + 2 <= bytes.length) {
                const grh1 = view.getInt16(offset, true);
                offset += 2;
                if (grh1 > 0) {
                    graphics["1"] = grh1;
                    diagnostics.layerTilesCount.layer1++;
                }
            }

            if (hasLayer2 && offset + 2 <= bytes.length) {
                const grh2 = view.getInt16(offset, true);
                offset += 2;
                if (grh2 > 0) {
                    graphics["2"] = grh2;
                    diagnostics.layerTilesCount.layer2++;
                }
            }

            if (hasLayer3 && offset + 2 <= bytes.length) {
                const grh3 = view.getInt16(offset, true);
                offset += 2;
                if (grh3 > 0) {
                    graphics["3"] = grh3;
                    diagnostics.layerTilesCount.layer3++;
                }
            }

            if (hasLayer4 && offset + 2 <= bytes.length) {
                const grh4 = view.getInt16(offset, true);
                offset += 2;
                if (grh4 > 0) {
                    graphics["4"] = grh4;
                    diagnostics.layerTilesCount.layer4++;
                }
            }

            if (Object.keys(graphics).length > 0) {
                tile.graphics = graphics;
            }

            if (hasTrigger && offset + 2 <= bytes.length) {
                const triggerVal = view.getInt16(offset, true);
                offset += 2;
                tile.trigger = triggerVal;
                diagnostics.triggersCount++;

                // Triggers > 6 are custom/non-standard in OpenAO
                if (triggerVal < 1 || triggerVal > 6) {
                    if (!diagnostics.unsupportedTriggers.includes(triggerVal)) {
                        diagnostics.unsupportedTriggers.push(triggerVal);
                    }
                    diagnostics.warnings.push(`Custom trigger (${triggerVal}) at (${x}, ${y}) preserved.`);
                }
            }

            mapRef[y.toString()][x.toString()] = tile;
        }
    }

    // Parse INI (.inf) for Exits, NPCs, Objs
    if (infContent.trim()) {
        const infData = parseIni(infContent);
        for (const [section, values] of Object.entries(infData)) {
            // Tile Exits: [12-34] -> X=12, Y=34
            const coordMatch = section.match(/^(\d+)-(\d+)$/);
            if (coordMatch) {
                const x = parseInt(coordMatch[1], 10);
                const y = parseInt(coordMatch[2], 10);
                if (mapRef[y.toString()] && mapRef[y.toString()][x.toString()]) {
                    const targetMap = parseInt(values["MAP"] || "0", 10);
                    const targetX = parseInt(values["X"] || "0", 10);
                    const targetY = parseInt(values["Y"] || "0", 10);
                    if (targetMap > 0) {
                        mapRef[y.toString()][x.toString()].tileExit = {
                            map: targetMap,
                            x: targetX,
                            y: targetY
                        };
                        diagnostics.tileExitsCount++;
                    }
                }
            }

            // NPCs: [NPC1] -> NPCIndex, X, Y
            if (section.startsWith("NPC")) {
                const npcIndex = parseInt(values["NPCINDEX"] || values["INDEX"] || "0", 10);
                const x = parseInt(values["X"] || "0", 10);
                const y = parseInt(values["Y"] || "0", 10);
                if (npcIndex > 0 && mapRef[y.toString()] && mapRef[y.toString()][x.toString()]) {
                    mapRef[y.toString()][x.toString()].npcIndex = npcIndex;
                    diagnostics.npcsCount++;
                }
            }

            // Objs: [OBJ1] -> ObjIndex, Amount, X, Y
            if (section.startsWith("OBJ")) {
                const objIndex = parseInt(values["OBJINDEX"] || values["INDEX"] || "0", 10);
                const amount = parseInt(values["AMOUNT"] || values["CANT"] || "1", 10);
                const x = parseInt(values["X"] || "0", 10);
                const y = parseInt(values["Y"] || "0", 10);
                if (objIndex > 0 && mapRef[y.toString()] && mapRef[y.toString()][x.toString()]) {
                    mapRef[y.toString()][x.toString()].objInfo = {
                        objIndex,
                        amount
                    };
                    diagnostics.objectsCount++;
                }
            }
        }
    }

    // Parse Metadata (.dat)
    const metadata: MapMetadata = {};
    if (datContent.trim()) {
        const datData = parseIni(datContent);
        const mapSection = datData[`MAPA${mapNumber}`] || datData[`MAP${mapNumber}`] || datData["MAPA"] || datData["DEFAULT"] || {};
        metadata.name = mapSection["NAME"] || mapSection["NOMBRE"];
        metadata.music = mapSection["MUSIC"] || mapSection["MUSICA"];
        metadata.safeZone = mapSection["SEGURO"] === "1" || mapSection["SAFE"] === "1";
        metadata.pkZone = mapSection["PK"] === "1" || mapSection["PVP"] === "1";
        metadata.magiaSinEfecto = mapSection["MAGIASINEFECTO"] === "1";
        metadata.inviSinEfecto = mapSection["INVISINEFECTO"] === "1";
        metadata.resuSinEfecto = mapSection["RESUSINEFECTO"] === "1";
        metadata.rawDat = mapSection;
    }

    return {
        success: true,
        mapNumber,
        mapData,
        metadata,
        diagnostics
    };
}

/**
 * Export OpenAO MapData back into classic WorldEditor binary .map, .inf, and .dat
 */
export function exportWorldEditorMap(
    mapData: MapData,
    mapNumber: number = 1,
    metadata?: MapMetadata
): ExportResult {
    const mapRef = mapData[mapNumber.toString()] || {};
    
    // Estimate binary size: 2 header bytes + 100x100 tiles (1 byte flag + 2..10 bytes graphics/trigger)
    const buffer = new ArrayBuffer(MAP_VERSION_HEADER_SIZE + (MAP_WIDTH * MAP_HEIGHT * 11));
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    let offset = 0;

    // Header: Map version 1
    view.setInt16(offset, 1, true);
    offset += MAP_VERSION_HEADER_SIZE;

    const infLines: string[] = [];
    let npcCounter = 1;
    let objCounter = 1;

    let exportedTilesCount = 0;

    for (let y = 1; y <= MAP_HEIGHT; y++) {
        const row = mapRef[y.toString()] || {};
        for (let x = 1; x <= MAP_WIDTH; x++) {
            const tile = row[x.toString()] || {};
            exportedTilesCount++;

            const isBlocked = !!tile.blocked;
            const grh1 = (tile.graphics && tile.graphics["1"]) || 0;
            const grh2 = (tile.graphics && tile.graphics["2"]) || 0;
            const grh3 = (tile.graphics && tile.graphics["3"]) || 0;
            const grh4 = (tile.graphics && tile.graphics["4"]) || 0;
            const trigger = tile.trigger || 0;

            let flags = 0;
            if (isBlocked) flags |= 1;
            if (grh2 > 0) flags |= 2;
            if (grh3 > 0) flags |= 4;
            if (grh4 > 0) flags |= 8;
            if (trigger > 0) flags |= 16;

            view.setUint8(offset, flags);
            offset += 1;

            // Layer 1 (always written)
            view.setInt16(offset, grh1, true);
            offset += 2;

            if (grh2 > 0) {
                view.setInt16(offset, grh2, true);
                offset += 2;
            }

            if (grh3 > 0) {
                view.setInt16(offset, grh3, true);
                offset += 2;
            }

            if (grh4 > 0) {
                view.setInt16(offset, grh4, true);
                offset += 2;
            }

            if (trigger > 0) {
                view.setInt16(offset, trigger, true);
                offset += 2;
            }

            // Record Tile Exits in .inf
            if (tile.tileExit && tile.tileExit.map > 0) {
                infLines.push(`[${x}-${y}]`);
                infLines.push(`Map=${tile.tileExit.map}`);
                infLines.push(`X=${tile.tileExit.x}`);
                infLines.push(`Y=${tile.tileExit.y}`);
                infLines.push("");
            }

            // Record NPCs in .inf
            if (tile.npcIndex && tile.npcIndex > 0) {
                infLines.push(`[NPC${npcCounter++}]`);
                infLines.push(`NPCIndex=${tile.npcIndex}`);
                infLines.push(`X=${x}`);
                infLines.push(`Y=${y}`);
                infLines.push("");
            }

            // Record Objs in .inf
            if (tile.objInfo && tile.objInfo.objIndex > 0) {
                infLines.push(`[OBJ${objCounter++}]`);
                infLines.push(`ObjIndex=${tile.objInfo.objIndex}`);
                infLines.push(`Amount=${tile.objInfo.amount || 1}`);
                infLines.push(`X=${x}`);
                infLines.push(`Y=${y}`);
                infLines.push("");
            }
        }
    }

    const trimmedBinary = bytes.slice(0, offset);
    const infText = infLines.join("\r\n");

    // Build .dat text
    const datLines: string[] = [
        `[MAPA${mapNumber}]`,
        `Name=${metadata?.name || `Mapa ${mapNumber}`}`,
        `Music=${metadata?.music || "1"}`,
        `Seguro=${metadata?.safeZone ? "1" : "0"}`,
        `Pk=${metadata?.pkZone ? "1" : "0"}`,
        `MagiaSinEfecto=${metadata?.magiaSinEfecto ? "1" : "0"}`,
        `InviSinEfecto=${metadata?.inviSinEfecto ? "1" : "0"}`,
        `ResuSinEfecto=${metadata?.resuSinEfecto ? "1" : "0"}`
    ];

    return {
        mapBinary: trimmedBinary,
        infText,
        datText: datLines.join("\r\n"),
        exportedTilesCount
    };
}

/**
 * Validation & Diff Tool: Compares two MapData objects tile-by-tile
 */
export function validateAndDiffMaps(mapA: MapData, mapB: MapData, mapNumber: number = 1): DiffReport {
    const refA = mapA[mapNumber.toString()] || {};
    const refB = mapB[mapNumber.toString()] || {};

    const differences: DiffReport["differences"] = [];

    for (let y = 1; y <= MAP_HEIGHT; y++) {
        for (let x = 1; x <= MAP_WIDTH; x++) {
            const tileA = (refA[y.toString()] && refA[y.toString()][x.toString()]) || {};
            const tileB = (refB[y.toString()] && refB[y.toString()][x.toString()]) || {};

            // Blocked mismatch
            if (!!tileA.blocked !== !!tileB.blocked) {
                differences.push({
                    x, y,
                    field: "blocked",
                    expected: tileA.blocked || 0,
                    actual: tileB.blocked || 0
                });
            }

            // Graphics layers mismatch
            for (let layer = 1; layer <= 4; layer++) {
                const gA = (tileA.graphics && tileA.graphics[layer.toString()]) || 0;
                const gB = (tileB.graphics && tileB.graphics[layer.toString()]) || 0;
                if (gA !== gB) {
                    differences.push({
                        x, y,
                        field: `graphics[${layer}]`,
                        expected: gA,
                        actual: gB
                    });
                }
            }

            // Trigger mismatch
            if ((tileA.trigger || 0) !== (tileB.trigger || 0)) {
                differences.push({
                    x, y,
                    field: "trigger",
                    expected: tileA.trigger || 0,
                    actual: tileB.trigger || 0
                });
            }

            // TileExit mismatch
            const exitA = tileA.tileExit ? `${tileA.tileExit.map},${tileA.tileExit.x},${tileA.tileExit.y}` : null;
            const exitB = tileB.tileExit ? `${tileB.tileExit.map},${tileB.tileExit.x},${tileB.tileExit.y}` : null;
            if (exitA !== exitB) {
                differences.push({
                    x, y,
                    field: "tileExit",
                    expected: exitA,
                    actual: exitB
                });
            }

            // NPCIndex mismatch
            if ((tileA.npcIndex || 0) !== (tileB.npcIndex || 0)) {
                differences.push({
                    x, y,
                    field: "npcIndex",
                    expected: tileA.npcIndex || 0,
                    actual: tileB.npcIndex || 0
                });
            }

            // ObjInfo mismatch
            const objA = tileA.objInfo ? `${tileA.objInfo.objIndex}:${tileA.objInfo.amount}` : null;
            const objB = tileB.objInfo ? `${tileB.objInfo.objIndex}:${tileB.objInfo.amount}` : null;
            if (objA !== objB) {
                differences.push({
                    x, y,
                    field: "objInfo",
                    expected: objA,
                    actual: objB
                });
            }
        }
    }

    return {
        isIdentical: differences.length === 0,
        mismatchedTilesCount: differences.length,
        differences
    };
}
