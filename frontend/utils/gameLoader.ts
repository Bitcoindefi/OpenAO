import {
    GraphicsDB,
    MapData,
    GraphicData,
    ObjectsDB,
    NPCsDB,
    BodiesDB,
    HeadsDB,
    WeaponsDB,
    ShieldsDB,
    HelmetsDB,
    FXsDB,
    SpellsDB,
} from "../types/game";
import { getApiBaseUrl } from "../lib/api-base-url";

type CompactSimpleGraphic = [
    numFile: number,
    sX: number,
    sY: number,
    width: number,
    height: number,
];

type CompactExtendedGraphic = {
    f?: number;
    n?: number;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    r?: number[];
    s?: number;
    o?: [x: number, y: number];
};

type CompactGraphicsDB = Record<
    string,
    CompactSimpleGraphic | CompactExtendedGraphic
>;

const PREFER_LOCAL_GRAPHICS =
    process.env.NEXT_PUBLIC_LOAD_GRAPHICS_LOCAL === "true";
const PREFER_LOCAL_NPCS = process.env.NEXT_PUBLIC_LOAD_NPCS_LOCAL === "true";
const PREFER_LOCAL_BODIES =
    process.env.NEXT_PUBLIC_LOAD_BODIES_LOCAL === "true";
const PREFER_LOCAL_SPELLS_ASSETS =
    process.env.NEXT_PUBLIC_LOAD_SPELLS_LOCAL === "true";

const jsonRequestCache = new Map<string, Promise<unknown>>();
const jsonValueCache = new Map<string, unknown>();
const mapRequestCache = new Map<number, Promise<MapData>>();
const mapValueCache = new Map<number, MapData>();
const DYNAMIC_INSTANCE_MAP_START = 30_000;
const DYNAMIC_INSTANCE_MAP_STRIDE = 50;
const CHALLENGE_INSTANCE_MAP_START = 2_000;
const CHALLENGE_INSTANCE_BASE_MAP_ID = 506;
const MAP_ASSET_VERSIONS: Partial<Record<number, string>> = {
    166: "1.0",
    286: "1.2",
    287: "1.2",
    288: "1.2",
};

function cloneMapData(mapData: MapData): MapData {
    return structuredClone(mapData);
}

function getBaseMapIdFromDynamicInstance(mapNumber: number): number | null {
    if (mapNumber < DYNAMIC_INSTANCE_MAP_START) {
        return null;
    }

    return Math.floor(
        (mapNumber - DYNAMIC_INSTANCE_MAP_START) / DYNAMIC_INSTANCE_MAP_STRIDE,
    );
}

function withMapAssetVersion(path: string, mapNumber: number): string {
    const version = MAP_ASSET_VERSIONS[mapNumber];
    if (!version) {
        return path;
    }

    return `${path}?v=${encodeURIComponent(version)}`;
}

async function fetchJsonWithFallback<T>(
    fallbackPath: string,
    localPath: string,
    errorLabel: string,
    options?: {
        preferLocal?: boolean;
    },
): Promise<T> {
    const cacheKey = `${fallbackPath}|${localPath}`;
    const cachedValue = jsonValueCache.get(cacheKey);
    if (cachedValue !== undefined) {
        return cachedValue as T;
    }

    const pendingRequest = jsonRequestCache.get(cacheKey);
    if (pendingRequest) {
        return pendingRequest as Promise<T>;
    }

    const requestPromise = (async () => {
        void options;
        const candidatePaths = [localPath, fallbackPath].filter(
            (value, index, array) => array.indexOf(value) === index,
        );
        let lastError: string | null = null;

        for (const assetPath of candidatePaths) {
            const response = await fetch(assetPath);
            if (!response.ok) {
                lastError = `${assetPath}: ${response.status} ${response.statusText}`;
                continue;
            }

            const data = (await response.json()) as T;
            jsonValueCache.set(cacheKey, data);
            return data;
        }

        throw new Error(`Failed to load ${errorLabel}: ${lastError}`);
    })().finally(() => {
        jsonRequestCache.delete(cacheKey);
    });

    jsonRequestCache.set(cacheKey, requestPromise);
    return requestPromise;
}

function isCompactGraphicsEntry(
    value: CompactSimpleGraphic | CompactExtendedGraphic | GraphicData | null,
): value is CompactSimpleGraphic | CompactExtendedGraphic {
    if (!value || typeof value !== "object") {
        return false;
    }

    if (Array.isArray(value)) {
        return true;
    }

    return (
        !("frames" in value) &&
        !("numFile" in value) &&
        ("f" in value ||
            "n" in value ||
            "x" in value ||
            "y" in value ||
            "w" in value ||
            "h" in value ||
            "r" in value ||
            "s" in value ||
            "o" in value)
    );
}

function isCompactGraphicsDb(
    graphicsDb: unknown,
): graphicsDb is CompactGraphicsDB {
    if (!graphicsDb || typeof graphicsDb !== "object") {
        return false;
    }

    for (const value of Object.values(graphicsDb as Record<string, unknown>)) {
        if (value === null || value === undefined) {
            continue;
        }

        return isCompactGraphicsEntry(
            value as
                | CompactSimpleGraphic
                | CompactExtendedGraphic
                | GraphicData,
        );
    }

    return false;
}

function buildGraphicFrames(
    graphicId: string,
    frameIds: number[] | undefined,
    defaultToSelf: boolean,
): Record<string, string> {
    const frames: Record<string, string> = {};

    if (frameIds !== undefined) {
        for (let index = 0; index < frameIds.length; index++) {
            frames[(index + 1).toString()] = frameIds[index].toString();
        }

        return frames;
    }

    if (defaultToSelf) {
        frames["1"] = graphicId;
    }

    return frames;
}

function decompressGraphicsDb(
    graphicsDb: GraphicsDB | CompactGraphicsDB,
): GraphicsDB {
    if (!isCompactGraphicsDb(graphicsDb)) {
        return graphicsDb as GraphicsDB;
    }

    const decompressedGraphicsDb: GraphicsDB = {};

    for (const [graphicId, compactGraphic] of Object.entries(graphicsDb)) {
        if (Array.isArray(compactGraphic)) {
            decompressedGraphicsDb[graphicId] = {
                numFrames: 1,
                numFile: compactGraphic[0].toString(),
                sX: compactGraphic[1],
                sY: compactGraphic[2],
                width: compactGraphic[3],
                height: compactGraphic[4],
                frames: { "1": graphicId },
                offset: {
                    x: 0,
                    y: 0,
                },
            } as GraphicData;
            continue;
        }

        const hasStaticFrameData =
            compactGraphic.n !== undefined &&
            compactGraphic.x !== undefined &&
            compactGraphic.y !== undefined &&
            compactGraphic.w !== undefined &&
            compactGraphic.h !== undefined;
        const shouldDefaultToSelf =
            hasStaticFrameData &&
            compactGraphic.r === undefined &&
            (compactGraphic.f ?? 1) === 1;
        const graphicData: Partial<GraphicData> = {
            frames: buildGraphicFrames(
                graphicId,
                compactGraphic.r,
                shouldDefaultToSelf,
            ),
        };

        if (compactGraphic.f !== undefined) {
            graphicData.numFrames = compactGraphic.f;
        } else if (
            compactGraphic.r !== undefined &&
            compactGraphic.r.length > 0
        ) {
            graphicData.numFrames = compactGraphic.r.length;
        } else if (hasStaticFrameData) {
            graphicData.numFrames = 1;
        }

        if (compactGraphic.s !== undefined) {
            graphicData.speed = compactGraphic.s;
        }

        if (hasStaticFrameData) {
            graphicData.numFile = compactGraphic.n!.toString();
            graphicData.sX = compactGraphic.x!;
            graphicData.sY = compactGraphic.y!;
            graphicData.width = compactGraphic.w!;
            graphicData.height = compactGraphic.h!;
            graphicData.offset = {
                x: compactGraphic.o?.[0] ?? 0,
                y: compactGraphic.o?.[1] ?? 0,
            };
        } else if (compactGraphic.o) {
            graphicData.offset = {
                x: compactGraphic.o[0],
                y: compactGraphic.o[1],
            };
        }

        decompressedGraphicsDb[graphicId] = graphicData as GraphicData;
    }

    return decompressedGraphicsDb;
}

/**
 * Decompressor utility for optimized maps
 */
function decompressMap(optimizedMap: any) {
    if (!optimizedMap) return null;

    // Handle different optimized formats
    if (optimizedMap.patterns) {
        // Pattern-compressed format
        const result: any = {};
        const mapData: any = {};

        for (let x = 0; x < optimizedMap.w; x++) {
            mapData[x + 1] = {};
            const pattern = optimizedMap.patterns[optimizedMap.data[x]];

            for (let y = 0; y < pattern.length; y++) {
                const tile = pattern[y];
                if (tile) {
                    const decompressedTile: any = {};

                    if (tile.b) decompressedTile.blocked = tile.b;
                    if (tile.g !== undefined) {
                        if (typeof tile.g === "number") {
                            decompressedTile.graphics = { "1": tile.g };
                        } else if (Array.isArray(tile.g)) {
                            // Handle graphics array format [layer1, layer2, layer3, layer4]
                            const graphics: any = {};
                            for (let i = 0; i < tile.g.length; i++) {
                                if (tile.g[i] !== null) {
                                    graphics[(i + 1).toString()] = tile.g[i];
                                }
                            }
                            decompressedTile.graphics = graphics;
                        } else {
                            decompressedTile.graphics = tile.g;
                        }
                    }
                    if (tile.e) {
                        decompressedTile.tileExit = {
                            map: tile.e.m,
                            x: tile.e.x,
                            y: tile.e.y,
                        };
                    }
                    if (tile.t !== undefined) decompressedTile.trigger = tile.t;
                    // if (tile.n !== undefined)
                    //     decompressedTile.npcIndex = tile.n;
                    if (tile.o) {
                        decompressedTile.objInfo = {
                            objIndex: tile.o.i,
                            amount: tile.o.a,
                        };
                    }

                    mapData[x + 1][y + 1] = decompressedTile;
                }
            }
        }

        result[optimizedMap.id] = mapData;
        return result;
    }

    if (optimizedMap.d) {
        // Enhanced ultra-compact format
        const result: any = {};
        const mapData: any = {};
        let index = 0;

        for (let x = 1; x <= optimizedMap.w; x++) {
            mapData[x] = {};
            for (let y = 1; y <= optimizedMap.h; y++) {
                const value = optimizedMap.d[index++];
                if (value === 0) continue; // Empty tile

                const tile: any = {};

                if (value > 100000) {
                    // Simple blocked tile
                    tile.blocked = 1;
                    tile.graphics = { "1": value - 100000 };
                } else if (value > 0) {
                    // Simple walkable tile
                    tile.graphics = { "1": value };
                } else if (value < 0 && optimizedMap.cx) {
                    // Complex tile - get from complex array
                    const complexIndex = -value - 1;
                    const complexTile = optimizedMap.cx[complexIndex];

                    if (complexTile.b) tile.blocked = complexTile.b;

                    if (complexTile.g !== undefined) {
                        if (typeof complexTile.g === "number") {
                            tile.graphics = { "1": complexTile.g };
                        } else if (Array.isArray(complexTile.g)) {
                            // Handle graphics array format
                            const graphics: any = {};
                            for (let i = 0; i < complexTile.g.length; i++) {
                                if (complexTile.g[i] !== null) {
                                    graphics[(i + 1).toString()] =
                                        complexTile.g[i];
                                }
                            }
                            tile.graphics = graphics;
                        } else {
                            tile.graphics = complexTile.g;
                        }
                    }

                    if (complexTile.e) {
                        tile.tileExit = {
                            map: complexTile.e.m,
                            x: complexTile.e.x,
                            y: complexTile.e.y,
                        };
                    }

                    if (complexTile.t !== undefined)
                        tile.trigger = complexTile.t;
                    // if (complexTile.n !== undefined)
                    //     tile.npcIndex = complexTile.n;
                    if (complexTile.o) {
                        tile.objInfo = {
                            objIndex: complexTile.o.i,
                            amount: complexTile.o.a,
                        };
                    }
                }

                mapData[x][y] = tile;
            }
        }

        result[optimizedMap.id] = mapData;
        return result;
    }

    // Standard optimized format
    const result: any = {};
    const mapData: any = {};

    for (let x = 0; x < optimizedMap.tiles.length; x++) {
        mapData[x + 1] = {};
        const row = optimizedMap.tiles[x];

        for (let y = 0; y < row.length; y++) {
            const tile = row[y];
            if (tile) {
                const decompressedTile: any = {};

                if (tile.b) decompressedTile.blocked = tile.b;
                if (tile.g !== undefined) {
                    if (typeof tile.g === "number") {
                        decompressedTile.graphics = { "1": tile.g };
                    } else if (Array.isArray(tile.g)) {
                        // Handle graphics array format [layer1, layer2, layer3, layer4]
                        const graphics: any = {};
                        for (let i = 0; i < tile.g.length; i++) {
                            if (tile.g[i] !== null) {
                                graphics[(i + 1).toString()] = tile.g[i];
                            }
                        }
                        decompressedTile.graphics = graphics;
                    } else {
                        decompressedTile.graphics = tile.g;
                    }
                }
                if (tile.e) {
                    decompressedTile.tileExit = {
                        map: tile.e.m,
                        x: tile.e.x,
                        y: tile.e.y,
                    };
                }
                if (tile.t !== undefined) decompressedTile.trigger = tile.t;
                // if (tile.n !== undefined) decompressedTile.npcIndex = tile.n;
                if (tile.o) {
                    decompressedTile.objInfo = {
                        objIndex: tile.o.i,
                        amount: tile.o.a,
                    };
                }

                mapData[x + 1][y + 1] = decompressedTile;
            }
        }
    }

    result[optimizedMap.id] = mapData;
    return result;
}

function remapMapDataKey(
    mapData: MapData,
    sourceMapNumber: number,
    targetMapNumber: number,
): MapData {
    if (sourceMapNumber === targetMapNumber || mapData[targetMapNumber]) {
        return mapData;
    }

    return {
        ...mapData,
        [targetMapNumber]: mapData[sourceMapNumber],
    };
}

/**
 * Suma al catalogo de graficos los PNG subidos desde el modo construccion.
 *
 * Los graficos originales viven en graficos_optimized.json, que es un archivo
 * estatico horneado en el build. Los subidos no pueden estar ahi, asi que se
 * piden a la API y se agregan al mismo catalogo en memoria: a partir de ese
 * momento el renderer los resuelve igual que a cualquier otro.
 *
 * Cada PNG subido es una imagen completa, no un recorte de un atlas, asi que
 * numFile es el propio indice y el frame abarca toda la imagen.
 *
 * Si falla, el juego arranca igual sin los graficos subidos.
 */
async function mergeUploadedGraphics(graphicsDb: GraphicsDB): Promise<void> {
    try {
        const response = await fetch(`${getApiBaseUrl()}/game-data/graphics`, {
            cache: "no-store",
        });

        if (!response.ok) {
            return;
        }

        const payload = (await response.json()) as {
            graphics?: Array<{
                grhIndex: number;
                width: number;
                height: number;
            }>;
        };

        const uploaded = payload.graphics ?? [];

        for (const graphic of uploaded) {
            const key = String(graphic.grhIndex);
            graphicsDb[key] = {
                numFrames: 1,
                numFile: key,
                sX: 0,
                sY: 0,
                width: graphic.width,
                height: graphic.height,
                frames: { "1": key },
                offset: { x: 0, y: 0 },
            };
        }

        if (uploaded.length > 0) {
            console.log(
                `[GRAFICOS] ${uploaded.length} graficos subidos agregados al catalogo.`,
            );
        }
    } catch (error) {
        console.warn(
            "[GRAFICOS] No se pudieron cargar los graficos subidos:",
            error,
        );
    }
}

/**
 * Load graphics database from graficos.json
 */
export async function loadGraphicsDB(): Promise<GraphicsDB> {
    try {
        const optimizedGraphicsDb =
            await fetchJsonWithFallback<CompactGraphicsDB>(
                "/init/graficos_optimized.json?v=2.2",
                "/init/graficos_optimized.json?v=2.1",
                "optimized graphics database",
                { preferLocal: PREFER_LOCAL_GRAPHICS },
            );

        const graphicsDb = decompressGraphicsDb(optimizedGraphicsDb);
        await mergeUploadedGraphics(graphicsDb);
        return graphicsDb;
    } catch (optimizedError) {
        console.warn(
            "Failed to load optimized graphics database, falling back to legacy graficos.json.",
            optimizedError,
        );

        try {
            const legacyGraphicsDb = await fetchJsonWithFallback<GraphicsDB>(
                "/init/graficos.json",
                "/init/graficos.json",
                "graphics database",
                { preferLocal: PREFER_LOCAL_GRAPHICS },
            );

            return legacyGraphicsDb;
        } catch (error) {
            console.error("Error loading graphics database:", error);
            throw error;
        }
    }
}

/**
 * Load objects database from objs.json
 */
export async function loadObjectsDB(): Promise<ObjectsDB> {
    try {
        return await fetchJsonWithFallback<ObjectsDB>(
            "/init/objs.json?v=1.7",
            "/init/objs.json",
            "objects database",
        );
    } catch (error) {
        console.error("Error loading objects database:", error);
        throw error;
    }
}

/**
 * Load map data from a specific map file
 */
export async function loadMapData(mapNumber: number): Promise<MapData> {
    const cachedMap = mapValueCache.get(mapNumber);
    if (cachedMap) {
        return cloneMapData(cachedMap);
    }

    const pendingRequest = mapRequestCache.get(mapNumber);
    if (pendingRequest) {
        return pendingRequest.then((mapData) => cloneMapData(mapData));
    }

    const requestPromise = (async () => {
        try {
            const dynamicBaseMapNumber = getBaseMapIdFromDynamicInstance(mapNumber);
            if (
                dynamicBaseMapNumber &&
                dynamicBaseMapNumber >= 500 &&
                dynamicBaseMapNumber < 600
            ) {
                const data = await fetchJsonWithFallback<MapData>(
                    `/static/maps_local/mapa_${dynamicBaseMapNumber}.json`,
                    `/static/maps_local/mapa_${dynamicBaseMapNumber}.json`,
                    `local map ${dynamicBaseMapNumber}`,
                    { preferLocal: true },
                );
                const remappedData = remapMapDataKey(
                    data,
                    dynamicBaseMapNumber,
                    mapNumber,
                );
                mapValueCache.set(mapNumber, remappedData);
                return remappedData;
            }

            if (dynamicBaseMapNumber) {
                const data = await fetchJsonWithFallback<MapData>(
                    withMapAssetVersion(
                        `/maps/mapa_${dynamicBaseMapNumber}.json`,
                        dynamicBaseMapNumber,
                    ),
                    withMapAssetVersion(
                        `/maps_optimized/mapa_${dynamicBaseMapNumber}.json`,
                        dynamicBaseMapNumber,
                    ),
                    `map ${dynamicBaseMapNumber}`,
                    {
                        preferLocal: false,
                    },
                );
                const remappedData = remapMapDataKey(
                    decompressMap(data),
                    dynamicBaseMapNumber,
                    mapNumber,
                );
                mapValueCache.set(mapNumber, remappedData);
                return remappedData;
            }

            if (mapNumber >= 500 && mapNumber < 600) {
                const localMapData = await fetchJsonWithFallback<MapData>(
                    `/static/maps_local/mapa_${mapNumber}.json`,
                    `/static/maps_local/mapa_${mapNumber}.json`,
                    `local map ${mapNumber}`,
                    { preferLocal: true },
                );
                mapValueCache.set(mapNumber, localMapData);
                return localMapData;
            }

            if (
                mapNumber >= CHALLENGE_INSTANCE_MAP_START &&
                mapNumber < DYNAMIC_INSTANCE_MAP_START
            ) {
                const challengeMapData = await fetchJsonWithFallback<MapData>(
                    `/static/maps_local/mapa_${CHALLENGE_INSTANCE_BASE_MAP_ID}.json`,
                    `/static/maps_local/mapa_${CHALLENGE_INSTANCE_BASE_MAP_ID}.json`,
                    `challenge map ${CHALLENGE_INSTANCE_BASE_MAP_ID}`,
                    { preferLocal: true },
                );
                const remappedData = remapMapDataKey(
                    challengeMapData,
                    CHALLENGE_INSTANCE_BASE_MAP_ID,
                    mapNumber,
                );
                mapValueCache.set(mapNumber, remappedData);
                return remappedData;
            }

            const assetMapNumber = dynamicBaseMapNumber
                ? dynamicBaseMapNumber
                : mapNumber >= 1000
                  ? 272
                  : mapNumber;
            const data = await fetchJsonWithFallback<MapData>(
                withMapAssetVersion(
                    `/maps/mapa_${assetMapNumber}.json`,
                    assetMapNumber,
                ),
                withMapAssetVersion(
                    `/maps_optimized/mapa_${assetMapNumber}.json`,
                    assetMapNumber,
                ),
                `map ${assetMapNumber}`,
                {
                    preferLocal: false,
                },
            );
            const decompressedData = remapMapDataKey(
                decompressMap(data),
                assetMapNumber,
                mapNumber,
            );
            await applyMapOverrides(decompressedData, mapNumber);
            mapValueCache.set(mapNumber, decompressedData);
            return decompressedData;
        } catch (error) {
            console.error(`Error loading map ${mapNumber}:`, error);
            throw error;
        }
    })().finally(() => {
        mapRequestCache.delete(mapNumber);
    });

    mapRequestCache.set(mapNumber, requestPromise);
    return requestPromise.then((mapData) => cloneMapData(mapData));
}

/**
 * Indice a partir del cual los graficos son subidos por administradores.
 * Debe coincidir con UPLOADED_GRAPHIC_INDEX_START en la API.
 * Los graficos originales del juego llegan hasta 320151.
 */
export const UPLOADED_GRAPHIC_INDEX_START = 1_000_000;

export function isUploadedGraphic(grhIndex: number): boolean {
    return grhIndex >= UPLOADED_GRAPHIC_INDEX_START;
}

type MapTileOverride = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked: boolean | null;
};

type MapObjectOverride = {
    x: number;
    y: number;
    objIndex: number;
    amount: number;
};

type MapTileEntityOverride = {
    x: number;
    y: number;
    kind: "obj" | "npc";
    entityId: number;
};

type MapDoorOverride = {
    x: number;
    y: number;
    openGrhIndex: number;
    closedGrhIndex: number;
    isOpen: boolean;
    blocked: boolean;
};

/**
 * Aplica sobre el mapa recien cargado los tiles editados desde el modo
 * construccion.
 *
 * El mapa base se sigue sirviendo como archivo estatico y solo se piden las
 * diferencias, que normalmente son unas pocas. Asi editar un tile no obliga a
 * regenerar los 20 MB de mapas ni a invalidar el cache del mapa completo.
 *
 * Si la peticion falla el mapa se dibuja igual, sin los cambios: es preferible
 * mostrar el mundo original a no mostrar nada.
 */
async function applyMapOverrides(
    mapData: MapData,
    mapNumber: number,
): Promise<void> {
    try {
        const response = await fetch(
            `${getApiBaseUrl()}/maps/${mapNumber}/overrides`,
            { cache: "no-store" },
        );

        if (!response.ok) {
            return;
        }

        const payload = (await response.json()) as {
            overrides?: MapTileOverride[];
            entities?: MapTileEntityOverride[];
            objects?: MapObjectOverride[];
            doors?: MapDoorOverride[];
        };

        const overrides = payload.overrides ?? [];
        const entities = payload.entities ?? [];
        const objects = payload.objects ?? [];
        const doors = payload.doors ?? [];

        if (
            overrides.length === 0 &&
            entities.length === 0 &&
            objects.length === 0 &&
            doors.length === 0
        ) {
            return;
        }

        const mapEntry = mapData[String(mapNumber)];

        if (!mapEntry) {
            return;
        }

        for (const override of overrides) {
            const row = mapEntry[String(override.y)];
            const tile = row?.[String(override.x)];

            if (!tile) {
                continue;
            }

            const graphics = (tile.graphics ?? {}) as Record<string, number>;

            if (override.grhIndex == null) {
                // Un grafico nulo es "esta capa quedo vacia", no "sin cambios":
                // el editor lo usa para borrar, y si no se aplicara el jugador
                // seguiria viendo el arbol que el admin ya saco.
                delete graphics[String(override.layer)];
            } else {
                graphics[String(override.layer)] = override.grhIndex;
            }

            tile.graphics = graphics;

            if (override.blocked != null) {
                // El cliente representa el bloqueo como numero (1 / 0), no como
                // booleano, que es lo que devuelve la API.
                tile.blocked = override.blocked ? 1 : 0;
            }
        }

        for (const entity of entities) {
            const row = mapEntry[String(entity.y)];
            const tile = row?.[String(entity.x)];

            if (!tile) {
                continue;
            }

            if (entity.kind === "obj") {
                tile.objInfo = { objIndex: entity.entityId, amount: 1 };
            } else {
                tile.npcIndex = entity.entityId;
            }
        }

        // Los objetos con cantidad son más específicos que las entidades
        // genéricas y por eso se aplican después sobre el mismo tile.
        for (const object of objects) {
            const row = mapEntry[String(object.y)];
            const tile = row?.[String(object.x)];

            if (!tile) {
                continue;
            }

            tile.objInfo = {
                objIndex: object.objIndex,
                amount: object.amount,
            };
        }

        for (const door of doors) {
            const row = mapEntry[String(door.y)];
            const tile = row?.[String(door.x)];

            if (!tile) {
                continue;
            }

            const graphics = (tile.graphics ?? {}) as Record<string, number>;
            graphics["3"] = door.isOpen
                ? door.openGrhIndex
                : door.closedGrhIndex;
            tile.graphics = graphics;
            tile.blocked = door.blocked ? 1 : 0;
        }

        console.log(
            `[MAPA] ${overrides.length} tiles, ${entities.length} entidades, ${objects.length} objetos y ${doors.length} puertas editados aplicados al mapa ${mapNumber}.`,
        );
    } catch (error) {
        console.warn(
            `[MAPA] No se pudieron aplicar los tiles editados del mapa ${mapNumber}:`,
            error,
        );
    }
}

/**
 * Get the texture path for a graphic
 */
export function getTexturePath(graphicData: GraphicData): string {
    // if (LOCAL_GRAPHICS_FILE_NAMES.has(Number(graphicData.numFile))) {
    //     return `/graphics/${graphicData.numFile}.png`;
    // }

    return `/graphics/${graphicData.numFile}.png`;
}

/**
 * Parse map dimensions from map data
 */
export function getMapDimensions(
    mapData: MapData,
    mapNumber: number,
): {
    width: number;
    height: number;
} {
    const yKeys = Object.keys(mapData[mapNumber])
        .map(Number)
        .sort((a, b) => a - b);
    const xKeys = Object.keys(mapData[mapNumber][yKeys[0]] || {})
        .map(Number)
        .sort((a, b) => a - b);

    return {
        width: Math.max(...xKeys),
        height: Math.max(...yKeys),
    };
}

/**
 * Get tile data at specific coordinates
 */
export function getTileAt(
    mapData: MapData,
    mapNumber: number,
    x: number,
    y: number,
) {
    return mapData[mapNumber][y.toString()]?.[x.toString()];
}

/**
 * Load NPCs database from static data
 */
export async function loadNPCsDB(): Promise<NPCsDB> {
    try {
        return await fetchJsonWithFallback<NPCsDB>(
            "/init/npcs_optimized.json?v=2.1",
            "/init/npcs_optimized.json?v=2.0",
            "NPCs database",
            { preferLocal: PREFER_LOCAL_NPCS },
        );
    } catch (error) {
        console.error("Error loading NPCs database:", error);
        throw error;
    }
}

/**
 * Load Bodies database from static data
 */
export async function loadBodiesDB(): Promise<BodiesDB> {
    try {
        return await fetchJsonWithFallback<BodiesDB>(
            "/init/bodies.json?v=2.0",
            "/init/bodies.json?v=2.0",
            "Bodies database",
            { preferLocal: PREFER_LOCAL_BODIES },
        );
    } catch (error) {
        console.error("Error loading Bodies database:", error);
        throw error;
    }
}

/**
 * Load Heads database from static data
 */
export async function loadHeadsDB(): Promise<HeadsDB> {
    try {
        return await fetchJsonWithFallback<HeadsDB>(
            "/init/heads.json",
            "/init/heads.json",
            "Heads database",
        );
    } catch (error) {
        console.error("Error loading Heads database:", error);
        throw error;
    }
}

export async function loadWeaponsDB(): Promise<WeaponsDB> {
    return await fetchJsonWithFallback<WeaponsDB>(
        "/init/armas.json",
        "/init/armas.json",
        "Weapons database",
    );
}

export async function loadShieldsDB(): Promise<ShieldsDB> {
    return await fetchJsonWithFallback<ShieldsDB>(
        "/init/escudos.json",
        "/init/escudos.json",
        "Shields database",
    );
}

export async function loadHelmetsDB(): Promise<HelmetsDB> {
    return await fetchJsonWithFallback<HelmetsDB>(
        "/init/cascos.json",
        "/init/cascos.json",
        "Helmets database",
    );
}

export async function loadFXsDB(): Promise<FXsDB> {
    try {
        return await fetchJsonWithFallback<FXsDB>(
            "/init/fxs.json?v=1.1",
            "/init/fxs.json",
            "effects database",
        );
    } catch (error) {
        console.error("Error loading effects database:", error);
        throw error;
    }
}

export async function loadSpellsDB(): Promise<SpellsDB> {
    try {
        return await fetchJsonWithFallback<SpellsDB>(
            "/init/spells.json?v=1.0",
            "/init/spells.json",
            "spells database",
            { preferLocal: PREFER_LOCAL_SPELLS_ASSETS },
        );
    } catch (error) {
        console.error("Error loading spells database:", error);
        throw error;
    }
}
