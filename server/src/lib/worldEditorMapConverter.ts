/**
 * Clean-room WorldEditor (.map / .inf / .dat) <-> OpenAO mapas_source converter.
 *
 * Format knowledge comes from publicly documented AO binary layouts and
 * interoperability needs — no VB6 WorldEditor source was copied.
 */

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;
export const CLASSIC_MAP_VERSION = 1;
/** Triggers commonly used by classic AO clients (bajo techo, anti-piquete, etc.). */
export const KNOWN_TRIGGER_RANGE = { min: 1, max: 8 } as const;

export type TileExit = { map: number; x: number; y: number };
export type ObjectInfo = { objIndex: number; amount: number };

export type TerrainTile = {
    blocked?: true;
    graphics: number | Array<number | null>;
};

export type MapMetadata = {
    id: number;
    name: string;
    musicNum: number;
    magiaSinEfecto: number;
    noEncriptarMp: number;
    terreno: string;
    zona: string;
    restringir: string | number;
    minLevel?: number;
    maxLevel: number;
    backup: number;
    pk: number;
};

export type EditableTerrain = {
    id: number;
    width: number;
    height: number;
    palette: Record<string, TerrainTile>;
    rows: number[][];
};

export type EditableSpecials = {
    id: number;
    exits: Record<string, TileExit>;
    objects: Record<string, ObjectInfo>;
    npcs: Record<string, number>;
    triggers: Record<string, number>;
};

export type NpcPlacement = {
    mapNum: number;
    x: number;
    y: number;
    npcIndex: number;
};

export type OpenAoMapSource = {
    meta: MapMetadata;
    terrain: EditableTerrain;
    specials: EditableSpecials;
    npcs: NpcPlacement[];
};

export type ConversionReport = {
    mapId: number;
    totalTiles: number;
    blockedTiles: number;
    layerCounts: { layer1: number; layer2: number; layer3: number; layer4: number };
    triggersTranslated: number;
    exitsTranslated: number;
    npcsTranslated: number;
    objectsTranslated: number;
    warnings: string[];
    untranslated: string[];
};

export type ClassicMapFiles = {
    map: Uint8Array;
    inf: string;
    dat: string;
};

export type MapDiffEntry = {
    kind: "terrain" | "blocked" | "trigger" | "exit" | "npc" | "object" | "meta";
    key: string;
    left: unknown;
    right: unknown;
};

export type MapDiffResult = {
    equivalent: boolean;
    differences: MapDiffEntry[];
};

type MutableTile = {
    blocked: boolean;
    layers: [number, number, number, number];
    trigger: number;
};

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

function coordKey(x: number, y: number): string {
    return `${x},${y}`;
}

function parseCoordKey(key: string): { x: number; y: number } | null {
    const match = /^(\d+),(\d+)$/.exec(key);
    if (!match) {
        return null;
    }
    return { x: Number(match[1]), y: Number(match[2]) };
}

function emptyReport(mapId: number): ConversionReport {
    return {
        mapId,
        totalTiles: 0,
        blockedTiles: 0,
        layerCounts: { layer1: 0, layer2: 0, layer3: 0, layer4: 0 },
        triggersTranslated: 0,
        exitsTranslated: 0,
        npcsTranslated: 0,
        objectsTranslated: 0,
        warnings: [],
        untranslated: [],
    };
}

function pushUnique(list: string[], value: string): void {
    if (!list.includes(value)) {
        list.push(value);
    }
}

function sortJsonValue(value: JsonValue): JsonValue {
    if (Array.isArray(value)) {
        return value.map((entry) => sortJsonValue(entry));
    }
    if (!value || typeof value !== "object") {
        return value;
    }
    return Object.fromEntries(
        Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, entry]) => [key, sortJsonValue(entry)]),
    );
}

function stableStringify(value: JsonValue): string {
    return JSON.stringify(sortJsonValue(value));
}

function normalizeGraphics(layers: [number, number, number, number]): number | Array<number | null> | undefined {
    const present = layers
        .map((value, index) => ({ layer: index + 1, value }))
        .filter((entry) => entry.value > 0);

    if (present.length === 0) {
        return undefined;
    }

    if (present.length === 1 && present[0].layer === 1) {
        return present[0].value;
    }

    const lastLayer = present[present.length - 1].layer;
    const result: Array<number | null> = Array.from({ length: lastLayer }, () => null);
    for (const entry of present) {
        result[entry.layer - 1] = entry.value;
    }
    return result;
}

function graphicsToLayers(graphics: number | Array<number | null> | undefined): [number, number, number, number] {
    const layers: [number, number, number, number] = [0, 0, 0, 0];
    if (typeof graphics === "number" && Number.isFinite(graphics) && graphics > 0) {
        layers[0] = Math.trunc(graphics);
        return layers;
    }
    if (Array.isArray(graphics)) {
        for (let index = 0; index < Math.min(4, graphics.length); index++) {
            const value = graphics[index];
            if (typeof value === "number" && Number.isFinite(value) && value > 0) {
                layers[index] = Math.trunc(value);
            }
        }
    }
    return layers;
}

function readInt16LE(view: DataView, offset: number): number {
    return view.getInt16(offset, true);
}

function writeInt16LE(view: DataView, offset: number, value: number): void {
    view.setInt16(offset, value, true);
}

function clampGrh(value: number, report: ConversionReport, where: string): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }
    const truncated = Math.trunc(value);
    if (truncated > 32767) {
        pushUnique(
            report.untranslated,
            `GRH ${truncated} at ${where} exceeds signed Int16 WorldEditor range; omitted on classic export`,
        );
        report.warnings.push(`GRH ${truncated} at ${where} cannot be represented in classic .map Int16 fields`);
        return 0;
    }
    return truncated;
}

export function parseIni(content: string): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    let section = "DEFAULT";

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("'") || line.startsWith(";") || line.startsWith("#")) {
            continue;
        }

        const sectionMatch = /^\[(.+)\]$/.exec(line);
        if (sectionMatch) {
            section = sectionMatch[1].trim().toUpperCase();
            if (!result[section]) {
                result[section] = {};
            }
            continue;
        }

        const eq = line.indexOf("=");
        if (eq <= 0) {
            continue;
        }

        const key = line.slice(0, eq).trim().toUpperCase();
        const value = line.slice(eq + 1).trim();
        if (!result[section]) {
            result[section] = {};
        }
        result[section][key] = value;
    }

    return result;
}

function toInt(value: string | undefined, fallback = 0): number {
    if (value === undefined || value === "") {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMusicNum(raw: string | undefined): number {
    if (!raw) {
        return 0;
    }
    const direct = Number.parseInt(raw, 10);
    if (Number.isFinite(direct)) {
        return direct;
    }
    const match = /(\d+)/.exec(raw);
    return match ? Number.parseInt(match[1], 10) : 0;
}

function buildPalette(tiles: MutableTile[][]): {
    terrain: EditableTerrain;
    blockedTiles: number;
} {
    const paletteBySignature = new Map<string, TerrainTile>();
    let blockedTiles = 0;

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = tiles[y][x];
            const graphics = normalizeGraphics(tile.layers);
            if (graphics === undefined && !tile.blocked) {
                continue;
            }
            const terrainTile: TerrainTile = {
                graphics: graphics ?? 0,
            };
            if (tile.blocked) {
                terrainTile.blocked = true;
                blockedTiles++;
            }
            paletteBySignature.set(stableStringify(terrainTile as JsonValue), terrainTile);
        }
    }

    const sorted = [...paletteBySignature.entries()].sort(([left], [right]) => left.localeCompare(right));
    const palette: Record<string, TerrainTile> = {};
    const idBySignature = new Map<string, number>();
    sorted.forEach(([signature, tile], index) => {
        const id = index + 1;
        idBySignature.set(signature, id);
        palette[String(id)] = tile;
    });

    const rows: number[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        const row: number[] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = tiles[y][x];
            const graphics = normalizeGraphics(tile.layers);
            if (graphics === undefined && !tile.blocked) {
                row.push(0);
                continue;
            }
            const terrainTile: TerrainTile = {
                graphics: graphics ?? 0,
            };
            if (tile.blocked) {
                terrainTile.blocked = true;
            }
            row.push(idBySignature.get(stableStringify(terrainTile as JsonValue)) ?? 0);
        }
        rows.push(row);
    }

    return {
        blockedTiles,
        terrain: {
            id: 0,
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            palette,
            rows,
        },
    };
}

function decodeClassicMapBinary(mapBytes: Uint8Array, report: ConversionReport): MutableTile[][] {
    const view = new DataView(mapBytes.buffer, mapBytes.byteOffset, mapBytes.byteLength);
    let offset = 0;

    if (mapBytes.byteLength < 2) {
        throw new Error("Classic .map is truncated (missing version header)");
    }

    const version = readInt16LE(view, offset);
    offset += 2;
    if (version !== CLASSIC_MAP_VERSION) {
        report.warnings.push(
            `Classic .map version ${version} (expected ${CLASSIC_MAP_VERSION}); continuing with clean-room Int16 tile layout`,
        );
    }

    // Detect accidental nextgen/extended headers: a 273-byte header would leave
    // far too few bytes for 10_000 Int16 tiles.
    const remaining = mapBytes.byteLength - offset;
    const minBody = MAP_WIDTH * MAP_HEIGHT * 3; // flag + layer1
    if (remaining < minBody) {
        throw new Error(
            `Classic .map body too small (${remaining} bytes after header). Extended/nextgen headers are not translated.`,
        );
    }
    if (mapBytes.byteLength >= 273 + minBody && version > 10) {
        pushUnique(
            report.untranslated,
            "Extended WorldEditor/nextgen .map headers (desc/CRC/particles/lights) are not mapped into OpenAO meta/terrain",
        );
    }

    const tiles: MutableTile[][] = Array.from({ length: MAP_HEIGHT }, () =>
        Array.from({ length: MAP_WIDTH }, () => ({
            blocked: false,
            layers: [0, 0, 0, 0] as [number, number, number, number],
            trigger: 0,
        })),
    );

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (offset >= mapBytes.byteLength) {
                report.warnings.push(`Unexpected EOF at tile (${x + 1},${y + 1})`);
                return tiles;
            }

            const flags = view.getUint8(offset);
            offset += 1;
            report.totalTiles += 1;

            const tile = tiles[y][x];
            tile.blocked = (flags & 0x01) !== 0;

            if (offset + 2 > mapBytes.byteLength) {
                report.warnings.push(`Truncated layer1 at (${x + 1},${y + 1})`);
                return tiles;
            }
            tile.layers[0] = readInt16LE(view, offset);
            offset += 2;
            if (tile.layers[0] > 0) {
                report.layerCounts.layer1 += 1;
            }

            const optionalReads: Array<{ bit: number; layerIndex?: number; kind: "layer" | "trigger" | "extra" }> = [
                { bit: 0x02, layerIndex: 1, kind: "layer" },
                { bit: 0x04, layerIndex: 2, kind: "layer" },
                { bit: 0x08, layerIndex: 3, kind: "layer" },
                { bit: 0x10, kind: "trigger" },
            ];

            for (const optional of optionalReads) {
                if ((flags & optional.bit) === 0) {
                    continue;
                }
                if (offset + 2 > mapBytes.byteLength) {
                    report.warnings.push(`Truncated optional field at (${x + 1},${y + 1})`);
                    return tiles;
                }
                const value = readInt16LE(view, offset);
                offset += 2;
                if (optional.kind === "layer" && optional.layerIndex !== undefined) {
                    tile.layers[optional.layerIndex] = value;
                    if (value > 0) {
                        const key = `layer${optional.layerIndex + 1}` as keyof ConversionReport["layerCounts"];
                        report.layerCounts[key] += 1;
                    }
                } else if (optional.kind === "trigger") {
                    tile.trigger = value;
                }
            }

            // Bits used by some extended clients; classic Int16 body has no payload we can store.
            if (flags & 0x20) {
                pushUnique(
                    report.untranslated,
                    `Particle-group flag at (${x + 1},${y + 1}) — OpenAO mapas_source has no particle field`,
                );
            }
            if (flags & 0x40) {
                pushUnique(
                    report.untranslated,
                    `Light-data flag at (${x + 1},${y + 1}) — OpenAO mapas_source has no per-tile light field`,
                );
            }
            if (flags & 0x80) {
                pushUnique(report.untranslated, `Unknown flag 0x80 at (${x + 1},${y + 1})`);
            }
        }
    }

    if (offset < mapBytes.byteLength) {
        report.warnings.push(`Trailing ${mapBytes.byteLength - offset} byte(s) after 100×100 tile body ignored`);
    }

    return tiles;
}

function applyInf(
    infContent: string,
    specials: EditableSpecials,
    report: ConversionReport,
): void {
    if (!infContent.trim()) {
        return;
    }

    const ini = parseIni(infContent);
    for (const [section, values] of Object.entries(ini)) {
        const coordMatch = /^(\d+)-(\d+)$/.exec(section);
        if (coordMatch) {
            const x = Number(coordMatch[1]);
            const y = Number(coordMatch[2]);
            const map = toInt(values.MAP ?? values.MAPA);
            const destX = toInt(values.X);
            const destY = toInt(values.Y);
            if (map > 0 && x >= 1 && x <= MAP_WIDTH && y >= 1 && y <= MAP_HEIGHT) {
                specials.exits[coordKey(x, y)] = { map, x: destX, y: destY };
                report.exitsTranslated += 1;
            } else {
                report.warnings.push(`Skipped invalid exit section [${section}]`);
            }
            continue;
        }

        if (section.startsWith("NPC")) {
            const npcIndex = toInt(values.NPCINDEX ?? values.INDEX);
            const x = toInt(values.X);
            const y = toInt(values.Y);
            if (npcIndex > 0 && x >= 1 && x <= MAP_WIDTH && y >= 1 && y <= MAP_HEIGHT) {
                specials.npcs[coordKey(x, y)] = npcIndex;
                report.npcsTranslated += 1;
            } else {
                report.warnings.push(`Skipped invalid NPC section [${section}]`);
            }
            continue;
        }

        if (section.startsWith("OBJ")) {
            const objIndex = toInt(values.OBJINDEX ?? values.INDEX);
            const amount = toInt(values.AMOUNT ?? values.CANT, 1);
            const x = toInt(values.X);
            const y = toInt(values.Y);
            if (objIndex > 0 && x >= 1 && x <= MAP_WIDTH && y >= 1 && y <= MAP_HEIGHT) {
                specials.objects[coordKey(x, y)] = { objIndex, amount: Math.max(1, amount) };
                report.objectsTranslated += 1;
            } else {
                report.warnings.push(`Skipped invalid OBJ section [${section}]`);
            }
            continue;
        }

        if (section !== "DEFAULT" && section !== "MAPA" && !section.startsWith("MAPA")) {
            // Preserve silence for known empty headings; flag odd leftovers.
            if (Object.keys(values).length > 0 && !section.match(/^\d/)) {
                pushUnique(report.untranslated, `Unrecognized .inf section [${section}]`);
            }
        }
    }
}

function applyDat(datContent: string, mapId: number, report: ConversionReport): MapMetadata {
    const meta: MapMetadata = {
        id: mapId,
        name: "",
        musicNum: 0,
        magiaSinEfecto: 0,
        noEncriptarMp: 0,
        terreno: "",
        zona: "",
        restringir: "No",
        minLevel: 0,
        maxLevel: 0,
        backup: 0,
        pk: 0,
    };

    if (!datContent.trim()) {
        report.warnings.push("No .dat metadata provided; meta.json filled with defaults");
        return meta;
    }

    const ini = parseIni(datContent);
    const section =
        ini[`MAPA${mapId}`] ||
        ini[`MAP${mapId}`] ||
        ini.MAPA ||
        ini.DEFAULT ||
        Object.values(ini)[0] ||
        {};

    meta.name = section.NAME ?? section.NOMBRE ?? "";
    meta.musicNum = parseMusicNum(section.MUSICNUM ?? section.MUSIC ?? section.MUSICA);
    meta.magiaSinEfecto = toInt(section.MAGIASINEFECTO);
    meta.noEncriptarMp = toInt(section.NOENCRIPTARMP ?? section.NOENCRIPTARMP);
    meta.terreno = section.TERRENO ?? "";
    meta.zona = section.ZONA ?? "";
    meta.restringir = section.RESTRINGIR ?? "No";
    meta.minLevel = toInt(section.MINLEVEL);
    meta.maxLevel = toInt(section.MAXLEVEL);
    meta.backup = toInt(section.BACKUP);
    if (section.PK !== undefined) {
        meta.pk = toInt(section.PK);
    } else if (section.SEGURO !== undefined) {
        // Some .dat variants use Seguro=1 for safe cities; OpenAO stores that as pk=1.
        meta.pk = toInt(section.SEGURO);
        report.warnings.push("Mapped .dat Seguro field onto meta.pk (OpenAO safe-zone convention)");
    }

    for (const key of Object.keys(section)) {
        const known = new Set([
            "NAME",
            "NOMBRE",
            "MUSICNUM",
            "MUSIC",
            "MUSICA",
            "MAGIASINEFECTO",
            "NOENCRIPTARMP",
            "TERRENO",
            "ZONA",
            "RESTRINGIR",
            "MINLEVEL",
            "MAXLEVEL",
            "BACKUP",
            "PK",
            "SEGURO",
            "INVISINEFECTO",
            "RESUSINEFECTO",
            "OCULTARSINEFECTO",
            "INVIERNO",
        ]);
        if (!known.has(key)) {
            pushUnique(report.untranslated, `.dat key ${key} has no OpenAO meta.json field`);
        } else if (key === "INVISINEFECTO" || key === "RESUSINEFECTO" || key === "OCULTARSINEFECTO" || key === "INVIERNO") {
            pushUnique(report.untranslated, `.dat key ${key} not present on OpenAO meta.json`);
        }
    }

    return meta;
}

/**
 * Import classic WorldEditor files into OpenAO mapas_source structures.
 */
export function importClassicWorldEditorMap(
    files: ClassicMapFiles,
    mapId: number,
): { source: OpenAoMapSource; report: ConversionReport } {
    if (!Number.isInteger(mapId) || mapId <= 0) {
        throw new Error(`mapId must be a positive integer, got ${mapId}`);
    }

    const report = emptyReport(mapId);
    const tiles = decodeClassicMapBinary(files.map, report);
    const { terrain, blockedTiles } = buildPalette(tiles);
    terrain.id = mapId;
    report.blockedTiles = blockedTiles;

    const specials: EditableSpecials = {
        id: mapId,
        exits: {},
        objects: {},
        npcs: {},
        triggers: {},
    };

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const trigger = tiles[y][x].trigger;
            if (trigger === 0) {
                continue;
            }
            specials.triggers[coordKey(x + 1, y + 1)] = trigger;
            report.triggersTranslated += 1;
            if (trigger < KNOWN_TRIGGER_RANGE.min || trigger > KNOWN_TRIGGER_RANGE.max) {
                pushUnique(
                    report.untranslated,
                    `Trigger ${trigger} at (${x + 1},${y + 1}) outside common range ${KNOWN_TRIGGER_RANGE.min}-${KNOWN_TRIGGER_RANGE.max} (preserved in specials.triggers)`,
                );
            }
        }
    }

    applyInf(files.inf, specials, report);
    const meta = applyDat(files.dat, mapId, report);

    const npcs: NpcPlacement[] = Object.entries(specials.npcs)
        .map(([key, npcIndex]) => {
            const coords = parseCoordKey(key);
            if (!coords) {
                return null;
            }
            return { mapNum: mapId, x: coords.x, y: coords.y, npcIndex };
        })
        .filter((entry): entry is NpcPlacement => entry !== null)
        .sort((left, right) => left.y - right.y || left.x - right.x || left.npcIndex - right.npcIndex);

    report.warnings.push(
        "Graphic indices are preserved verbatim; verify they match this client's GRH tables if versions differ",
    );

    return {
        source: { meta, terrain, specials, npcs },
        report,
    };
}

function encodeClassicMapBinary(
    source: OpenAoMapSource,
    report: ConversionReport,
): Uint8Array {
    const maxBytes = 2 + MAP_WIDTH * MAP_HEIGHT * 11;
    const buffer = new ArrayBuffer(maxBytes);
    const view = new DataView(buffer);
    let offset = 0;

    writeInt16LE(view, offset, CLASSIC_MAP_VERSION);
    offset += 2;

    const { terrain, specials } = source;
    for (let y = 1; y <= MAP_HEIGHT; y++) {
        const row = terrain.rows[y - 1] ?? [];
        for (let x = 1; x <= MAP_WIDTH; x++) {
            const paletteId = row[x - 1] ?? 0;
            const paletteTile = paletteId > 0 ? terrain.palette[String(paletteId)] : undefined;
            const layers = graphicsToLayers(paletteTile?.graphics);
            layers[0] = clampGrh(layers[0], report, `(${x},${y}) L1`);
            layers[1] = clampGrh(layers[1], report, `(${x},${y}) L2`);
            layers[2] = clampGrh(layers[2], report, `(${x},${y}) L3`);
            layers[3] = clampGrh(layers[3], report, `(${x},${y}) L4`);

            const trigger = specials.triggers[coordKey(x, y)] ?? 0;
            const blocked = Boolean(paletteTile?.blocked);

            let flags = 0;
            if (blocked) {
                flags |= 0x01;
            }
            if (layers[1] > 0) {
                flags |= 0x02;
            }
            if (layers[2] > 0) {
                flags |= 0x04;
            }
            if (layers[3] > 0) {
                flags |= 0x08;
            }
            if (trigger > 0) {
                flags |= 0x10;
            }

            view.setUint8(offset, flags);
            offset += 1;
            writeInt16LE(view, offset, layers[0]);
            offset += 2;
            if (layers[1] > 0) {
                writeInt16LE(view, offset, layers[1]);
                offset += 2;
            }
            if (layers[2] > 0) {
                writeInt16LE(view, offset, layers[2]);
                offset += 2;
            }
            if (layers[3] > 0) {
                writeInt16LE(view, offset, layers[3]);
                offset += 2;
            }
            if (trigger > 0) {
                writeInt16LE(view, offset, trigger);
                offset += 2;
            }

            report.totalTiles += 1;
            if (blocked) {
                report.blockedTiles += 1;
            }
            if (layers[0] > 0) {
                report.layerCounts.layer1 += 1;
            }
            if (layers[1] > 0) {
                report.layerCounts.layer2 += 1;
            }
            if (layers[2] > 0) {
                report.layerCounts.layer3 += 1;
            }
            if (layers[3] > 0) {
                report.layerCounts.layer4 += 1;
            }
            if (trigger > 0) {
                report.triggersTranslated += 1;
            }
        }
    }

    return new Uint8Array(buffer, 0, offset);
}

function encodeInf(source: OpenAoMapSource, report: ConversionReport): string {
    const lines: string[] = [];
    const exits = Object.entries(source.specials.exits).sort(([left], [right]) => left.localeCompare(right));
    for (const [key, exit] of exits) {
        const coords = parseCoordKey(key);
        if (!coords) {
            report.warnings.push(`Skipped malformed exit key ${key}`);
            continue;
        }
        lines.push(`[${coords.x}-${coords.y}]`);
        lines.push(`Map=${exit.map}`);
        lines.push(`X=${exit.x}`);
        lines.push(`Y=${exit.y}`);
        lines.push("");
        report.exitsTranslated += 1;
    }

    let npcCounter = 1;
    const npcs = Object.entries(source.specials.npcs).sort(([left], [right]) => left.localeCompare(right));
    for (const [key, npcIndex] of npcs) {
        const coords = parseCoordKey(key);
        if (!coords) {
            continue;
        }
        lines.push(`[NPC${npcCounter++}]`);
        lines.push(`NPCIndex=${npcIndex}`);
        lines.push(`X=${coords.x}`);
        lines.push(`Y=${coords.y}`);
        lines.push("");
        report.npcsTranslated += 1;
    }

    let objCounter = 1;
    const objects = Object.entries(source.specials.objects).sort(([left], [right]) => left.localeCompare(right));
    for (const [key, objectInfo] of objects) {
        const coords = parseCoordKey(key);
        if (!coords) {
            continue;
        }
        lines.push(`[OBJ${objCounter++}]`);
        lines.push(`ObjIndex=${objectInfo.objIndex}`);
        lines.push(`Amount=${objectInfo.amount}`);
        lines.push(`X=${coords.x}`);
        lines.push(`Y=${coords.y}`);
        lines.push("");
        report.objectsTranslated += 1;
    }

    return lines.join("\r\n");
}

function encodeDat(source: OpenAoMapSource): string {
    const { meta } = source;
    return [
        `[MAPA${meta.id}]`,
        `Name=${meta.name}`,
        `MusicNum=${meta.musicNum}`,
        `MagiaSinEfecto=${meta.magiaSinEfecto}`,
        `NoEncriptarMP=${meta.noEncriptarMp}`,
        `Terreno=${meta.terreno}`,
        `Zona=${meta.zona}`,
        `Restringir=${meta.restringir}`,
        `MinLevel=${meta.minLevel ?? 0}`,
        `MaxLevel=${meta.maxLevel}`,
        `Backup=${meta.backup}`,
        `Pk=${meta.pk}`,
        "",
    ].join("\r\n");
}

/**
 * Export OpenAO mapas_source structures back to classic WorldEditor files.
 */
export function exportClassicWorldEditorMap(source: OpenAoMapSource): {
    files: ClassicMapFiles;
    report: ConversionReport;
} {
    const report = emptyReport(source.meta.id);
    const map = encodeClassicMapBinary(source, report);
    const inf = encodeInf(source, report);
    const dat = encodeDat(source);
    return { files: { map, inf, dat }, report };
}

function terrainAt(source: OpenAoMapSource, x: number, y: number): TerrainTile | null {
    const paletteId = source.terrain.rows[y - 1]?.[x - 1] ?? 0;
    if (paletteId <= 0) {
        return null;
    }
    return source.terrain.palette[String(paletteId)] ?? null;
}

function layersEqual(
    left: number | Array<number | null> | undefined,
    right: number | Array<number | null> | undefined,
): boolean {
    const leftLayers = graphicsToLayers(left);
    const rightLayers = graphicsToLayers(right);
    return leftLayers.every((value, index) => value === rightLayers[index]);
}

/**
 * Tile-by-tile / specials / meta diff between two OpenAO map sources.
 */
export function diffOpenAoMaps(left: OpenAoMapSource, right: OpenAoMapSource, limit = 200): MapDiffResult {
    const differences: MapDiffEntry[] = [];

    const metaKeys: Array<keyof MapMetadata> = [
        "id",
        "name",
        "musicNum",
        "magiaSinEfecto",
        "noEncriptarMp",
        "terreno",
        "zona",
        "restringir",
        "maxLevel",
        "backup",
        "pk",
    ];
    for (const key of metaKeys) {
        if (String(left.meta[key] ?? "") !== String(right.meta[key] ?? "")) {
            differences.push({ kind: "meta", key, left: left.meta[key], right: right.meta[key] });
        }
    }

    for (let y = 1; y <= MAP_HEIGHT && differences.length < limit; y++) {
        for (let x = 1; x <= MAP_WIDTH && differences.length < limit; x++) {
            const leftTile = terrainAt(left, x, y);
            const rightTile = terrainAt(right, x, y);
            const key = coordKey(x, y);
            if (!layersEqual(leftTile?.graphics, rightTile?.graphics)) {
                differences.push({
                    kind: "terrain",
                    key,
                    left: leftTile?.graphics ?? null,
                    right: rightTile?.graphics ?? null,
                });
            }
            if (Boolean(leftTile?.blocked) !== Boolean(rightTile?.blocked)) {
                differences.push({
                    kind: "blocked",
                    key,
                    left: Boolean(leftTile?.blocked),
                    right: Boolean(rightTile?.blocked),
                });
            }
        }
    }

    const compareRecords = (
        kind: MapDiffEntry["kind"],
        leftRecord: Record<string, unknown>,
        rightRecord: Record<string, unknown>,
    ) => {
        const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
        for (const key of keys) {
            if (differences.length >= limit) {
                return;
            }
            const leftValue = leftRecord[key];
            const rightValue = rightRecord[key];
            if (stableStringify((leftValue ?? null) as JsonValue) !== stableStringify((rightValue ?? null) as JsonValue)) {
                differences.push({ kind, key, left: leftValue ?? null, right: rightValue ?? null });
            }
        }
    };

    compareRecords("trigger", left.specials.triggers, right.specials.triggers);
    compareRecords("exit", left.specials.exits as Record<string, unknown>, right.specials.exits as Record<string, unknown>);
    compareRecords("npc", left.specials.npcs, right.specials.npcs);
    compareRecords(
        "object",
        left.specials.objects as Record<string, unknown>,
        right.specials.objects as Record<string, unknown>,
    );

    return { equivalent: differences.length === 0, differences };
}

/**
 * Export → import round-trip and diff against the original OpenAO source.
 */
export function validateRoundTrip(source: OpenAoMapSource): {
    equivalent: boolean;
    report: ConversionReport;
    diff: MapDiffResult;
} {
    const exported = exportClassicWorldEditorMap(source);
    const imported = importClassicWorldEditorMap(exported.files, source.meta.id);
    const diff = diffOpenAoMaps(source, imported.source);
    return {
        equivalent: diff.equivalent,
        report: imported.report,
        diff,
    };
}

export function openAoSourceFromMapasDir(files: {
    meta: MapMetadata;
    terrain: EditableTerrain;
    specials: EditableSpecials;
    npcs?: NpcPlacement[];
}): OpenAoMapSource {
    const specials: EditableSpecials = {
        id: files.specials.id,
        exits: {},
        objects: { ...files.specials.objects },
        npcs: { ...files.specials.npcs },
        triggers: { ...files.specials.triggers },
    };

    for (const [key, exit] of Object.entries(files.specials.exits ?? {})) {
        if (exit && typeof exit === "object" && "destinations" in (exit as object)) {
            const destinations = (exit as { destinations?: TileExit[] }).destinations;
            if (Array.isArray(destinations) && destinations[0]) {
                specials.exits[key] = destinations[0];
            }
            continue;
        }
        specials.exits[key] = exit as TileExit;
    }

    const npcs =
        files.npcs ??
        Object.entries(specials.npcs).map(([key, npcIndex]) => {
            const coords = parseCoordKey(key)!;
            return { mapNum: files.meta.id, x: coords.x, y: coords.y, npcIndex };
        });

    return {
        meta: files.meta,
        terrain: files.terrain,
        specials,
        npcs,
    };
}
