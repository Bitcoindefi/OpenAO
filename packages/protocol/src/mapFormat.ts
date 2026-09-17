/**
 * Clean-Room Map Format Specification & Conversion Utilities for OpenAO.
 * Provides bidirectional parsing and schema transformations across Argentum Online map formats.
 */

export interface OpenAoMapMeta {
    id: number;
    name: string;
    musicNum?: number;
    terreno?: string;
    zona?: string;
    pk?: number;
    backup?: number;
}

export interface OpenAoTerrainEntry {
    graphics: Array<number | null>;
    blocked?: boolean;
}

export interface OpenAoTerrain {
    id: number;
    width: number;
    height: number;
    palette: Record<string, OpenAoTerrainEntry>;
    rows: number[][];
}

export interface OpenAoSpecials {
    id: number;
    exits: Record<string, { map: number; x: number; y: number } | { destinations: Array<{ map: number; x: number; y: number }> }>;
    objects: Record<string, { objIndex: number; amount: number }>;
    npcs: Record<string, number>;
    triggers: Record<string, number>;
}

export interface AoClassicTile {
    x: number;
    y: number;
    blocked: boolean;
    layer1: number;
    layer2?: number;
    layer3?: number;
    layer4?: number;
    trigger?: number;
    exit?: { map: number; x: number; y: number };
}

export interface AoBinaryMapHeader {
    version: number;
    name: string;
}

/**
 * Parses binary .map format data (100x100 tiles) using clean-room specifications.
 */
export function parseClassicBinaryMap(bytes: Uint8Array): { header: AoBinaryMapHeader; tiles: AoClassicTile[] } {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;

    let version = 1;
    let name = "";
    if (bytes.length >= 265) {
        version = view.getInt16(0, true);
        const nameBytes: number[] = [];
        for (let i = 2; i < 64 && i < bytes.length; i++) {
            const b = bytes[i];
            if (b === 0) break;
            nameBytes.push(b);
        }
        name = String.fromCharCode(...nameBytes).trim();
        offset = 265;
    }

    const tiles: AoClassicTile[] = [];
    for (let y = 1; y <= 100; y++) {
        for (let x = 1; x <= 100; x++) {
            if (offset >= bytes.length) break;

            const flags = view.getUint8(offset);
            offset += 1;

            const blocked = (flags & 0x01) !== 0;
            const layer1 = view.getUint16(offset, true);
            offset += 2;

            let layer2 = 0;
            if (flags & 0x02) {
                layer2 = view.getUint16(offset, true);
                offset += 2;
            }

            let layer3 = 0;
            if (flags & 0x04) {
                layer3 = view.getUint16(offset, true);
                offset += 2;
            }

            let layer4 = 0;
            if (flags & 0x08) {
                layer4 = view.getUint16(offset, true);
                offset += 2;
            }

            let trigger = 0;
            if (flags & 0x10) {
                trigger = view.getUint16(offset, true);
                offset += 2;
            }

            tiles.push({
                x,
                y,
                blocked,
                layer1,
                ...(layer2 > 0 ? { layer2 } : {}),
                ...(layer3 > 0 ? { layer3 } : {}),
                ...(layer4 > 0 ? { layer4 } : {}),
                ...(trigger > 0 ? { trigger } : {}),
            });
        }
    }

    return {
        header: { version, name },
        tiles,
    };
}

/**
 * Encodes classic binary .map format data (100x100 tiles).
 */
export function encodeClassicBinaryMap(header: AoBinaryMapHeader, tiles: AoClassicTile[]): Uint8Array {
    // 265 bytes header + estimated 10000 tiles * ~15 bytes
    const buffer = new Uint8Array(265 + tiles.length * 15);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    view.setInt16(0, header.version, true);
    for (let i = 0; i < Math.min(60, header.name.length); i++) {
        buffer[2 + i] = header.name.charCodeAt(i);
    }

    let offset = 265;
    for (const tile of tiles) {
        let flags = 0;
        if (tile.blocked) flags |= 0x01;
        if (tile.layer2 && tile.layer2 > 0) flags |= 0x02;
        if (tile.layer3 && tile.layer3 > 0) flags |= 0x04;
        if (tile.layer4 && tile.layer4 > 0) flags |= 0x08;
        if (tile.trigger && tile.trigger > 0) flags |= 0x10;

        view.setUint8(offset, flags);
        offset += 1;

        view.setUint16(offset, tile.layer1, true);
        offset += 2;

        if (flags & 0x02) {
            view.setUint16(offset, tile.layer2 ?? 0, true);
            offset += 2;
        }
        if (flags & 0x04) {
            view.setUint16(offset, tile.layer3 ?? 0, true);
            offset += 2;
        }
        if (flags & 0x08) {
            view.setUint16(offset, tile.layer4 ?? 0, true);
            offset += 2;
        }
        if (flags & 0x10) {
            view.setUint16(offset, tile.trigger ?? 0, true);
            offset += 2;
        }
    }

    return buffer.slice(0, offset);
}

/**
 * Transforms classic tiles into OpenAO modular JSON (terrain + specials).
 */
export function convertClassicTilesToOpenAo(mapId: number, tiles: AoClassicTile[]): { terrain: OpenAoTerrain; specials: OpenAoSpecials } {
    const palette: Record<string, OpenAoTerrainEntry> = {};
    const signatureToId = new Map<string, number>();
    let nextPaletteId = 1;

    const rows: number[][] = Array.from({ length: 100 }, () => Array(100).fill(0));
    const specials: OpenAoSpecials = {
        id: mapId,
        exits: {},
        objects: {},
        npcs: {},
        triggers: {},
    };

    for (const tile of tiles) {
        const graphics: Array<number | null> = [tile.layer1];
        if (tile.layer2) graphics.push(tile.layer2);
        else if (tile.layer3 || tile.layer4) graphics.push(null);

        if (tile.layer3) graphics.push(tile.layer3);
        else if (tile.layer4) graphics.push(null);

        if (tile.layer4) graphics.push(tile.layer4);

        const sig = `${graphics.join(",")}|${tile.blocked ? 1 : 0}`;
        let paletteId = signatureToId.get(sig);
        if (paletteId === undefined) {
            paletteId = nextPaletteId++;
            signatureToId.set(sig, paletteId);
            palette[String(paletteId)] = {
                graphics,
                ...(tile.blocked ? { blocked: true } : {}),
            };
        }

        if (tile.y >= 1 && tile.y <= 100 && tile.x >= 1 && tile.x <= 100) {
            rows[tile.y - 1][tile.x - 1] = paletteId;
        }

        const coordKey = `${tile.x},${tile.y}`;
        if (tile.trigger && tile.trigger > 0) {
            specials.triggers[coordKey] = tile.trigger;
        }
        if (tile.exit) {
            specials.exits[coordKey] = {
                map: tile.exit.map,
                x: tile.exit.x,
                y: tile.exit.y,
            };
        }
    }

    return {
        terrain: {
            id: mapId,
            width: 100,
            height: 100,
            palette,
            rows,
        },
        specials,
    };
}

/**
 * Converts LambdaClass map JSON format to OpenAO modular JSON.
 */
export function convertLambdaClassMapToOpenAo(
    lambdaMap: { id: number; tiles: Array<{ x: number; y: number; layers: number[]; blocked?: boolean; trigger?: number | null }> }
): { terrain: OpenAoTerrain; specials: OpenAoSpecials } {
    const classicTiles: AoClassicTile[] = lambdaMap.tiles.map((t) => ({
        x: t.x,
        y: t.y,
        blocked: Boolean(t.blocked),
        layer1: t.layers[0] ?? 0,
        layer2: t.layers[1] ?? 0,
        layer3: t.layers[2] ?? 0,
        layer4: t.layers[3] ?? 0,
        trigger: t.trigger ? Number(t.trigger) : 0,
    }));

    return convertClassicTilesToOpenAo(lambdaMap.id, classicTiles);
}
