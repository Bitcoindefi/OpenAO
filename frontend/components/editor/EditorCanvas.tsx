"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import type {
    BodiesDB,
    GraphicsDB,
    MapData,
    ObjectsDB,
} from "../../types/game";
import {
    getMapDimensions,
    getTileAt,
    loadMapData,
    loadObjectsDB,
} from "../../utils/gameLoader";
import {
    getSharedBodiesDB,
    getSharedGraphicsDB,
    loadGraphicTexture,
    resolveGraphicFrame,
} from "../../lib/graphicTextures";
import { getBottomAnchoredGraphicPosition } from "../game/rendering/characterLayout";
import type { MapTileEntity, TilePaint } from "../../lib/editor/editorApi";
import {
    clearTileOverride,
    paintTiles,
    placeTileEntity,
    removeTileEntity,
} from "../../lib/editor/editorApi";
import { useEditorStore } from "../../lib/editor/editorStore";

const TILE_SIZE = 32;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const Z_LAYER_FLOOR = 0;
const Z_LAYER_BELOW = 2;
const Z_LAYER_OBJECT = 3;
const Z_LAYER_ENTITY = 4;
/** La capa 4 son techos y copas: va por encima de lo que se coloca abajo. */
const Z_LAYER_ROOF = 5;
/** La grilla y el bloqueo van sobre cualquier tile (su zIndex es y * 10). */
const Z_OVERLAY = 100_000;

const LAYER_ORDER = [1, 2, 3, 4] as const;
const LAYER_Z_INDEX: Record<number, number> = {
    1: Z_LAYER_FLOOR,
    2: Z_LAYER_BELOW,
    3: Z_LAYER_OBJECT,
    4: Z_LAYER_ROOF,
};
const ENTITY_KINDS = ["obj", "npc"] as const;
/** El server acepta como maximo 500 tiles por lote. */
const PAINT_BATCH_SIZE = 500;
/** Cuanto se espera antes de mandar el trazo, para no pedir por cada tile. */
const PAINT_DEBOUNCE_MS = 400;

/**
 * Texturas por indice de grafico, compartidas entre renders y entre mapas.
 *
 * Sin este cache cada cambio de un tile volveria a resolver y recortar las
 * texturas de todo el mapa. Esta a nivel de modulo porque los graficos del
 * juego se repiten entre mapas y no cambian nunca.
 */
const textureCache = new Map<number, Texture | null>();
const texturePromiseCache = new Map<number, Promise<void>>();

function tileKey(x: number, y: number): string {
    return `${x},${y}`;
}

/**
 * Si los tiles cargados son de este mapa.
 *
 * Cambiar de mapa deja un render con el numero nuevo y los tiles viejos
 * todavia en memoria, y ahi `getTileAt` accede a un mapa que no existe.
 */
function hasMapTiles(
    mapData: MapData | null,
    mapNum: number,
): mapData is MapData {
    return Boolean(mapData && mapData[mapNum]);
}

async function resolveTexture(
    graphicsDB: GraphicsDB,
    grhIndex: number,
): Promise<Texture | null> {
    const graphic = resolveGraphicFrame(graphicsDB, grhIndex, "2");

    if (!graphic) {
        return null;
    }

    try {
        return await loadGraphicTexture(graphic);
    } catch {
        return null;
    }
}

/** Deja la textura de un grafico en el cache. Un indice se resuelve una vez. */
function ensureTexture(
    graphicsDB: GraphicsDB,
    grhIndex: number,
): Promise<void> {
    if (textureCache.has(grhIndex)) {
        return Promise.resolve();
    }

    const inFlight = texturePromiseCache.get(grhIndex);

    if (inFlight) {
        return inFlight;
    }

    const pending = resolveTexture(graphicsDB, grhIndex).then((texture) => {
        textureCache.set(grhIndex, texture);
        texturePromiseCache.delete(grhIndex);
    });

    texturePromiseCache.set(grhIndex, pending);

    return pending;
}

/** Un sprite del tile, ya resuelto a indice de grafico y orden de dibujo. */
type TileSprite = {
    grhIndex: number;
    zIndex: number;
    /** Los graficos altos se anclan al borde inferior del tile. */
    isAnchored: boolean;
    tint?: number;
};

type TileSpec = {
    x: number;
    y: number;
    sprites: TileSprite[];
    /** Como se ve el tile. Si no cambio, no hace falta redibujarlo. */
    signature: string;
};

type EditorCanvasProps = {
    width?: number;
    height?: number;
};

/**
 * Lienzo del editor visual: mapa base, tiles editados y objetos/NPCs
 * colocados, con camara (zoom + paneo), grilla, overlay de bloqueo y
 * resaltado del tile bajo el cursor. El click pinta o coloca; arrastrando
 * se pinta de a varios tiles en un solo lote.
 */
export default function EditorCanvas({
    width = 960,
    height = 640,
}: EditorCanvasProps) {
    const {
        mapNum,
        tool,
        overrides,
        entities,
        npcs,
        refreshMapData,
        refreshStatus,
    } = useEditorStore();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<Application | null>(null);
    const worldRef = useRef<Container | null>(null);
    const tileContainersRef = useRef<Map<string, Container>>(new Map());
    const renderedSignaturesRef = useRef<Map<string, string>>(new Map());
    const renderedMapRef = useRef<number | null>(null);
    const [isPixiReady, setIsPixiReady] = useState(false);
    const [graphicsDB, setGraphicsDB] = useState<GraphicsDB | null>(null);
    const [bodiesDB, setBodiesDB] = useState<BodiesDB | null>(null);
    const [objectsDB, setObjectsDB] = useState<ObjectsDB | null>(null);
    const [mapData, setMapData] = useState<MapData | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [cursorTile, setCursorTile] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [zoom, setZoom] = useState(1);
    const [showGrid, setShowGrid] = useState(true);
    const [showBlocked, setShowBlocked] = useState(true);
    const [isPanning, setIsPanning] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [applyError, setApplyError] = useState<string | null>(null);
    const hoverHighlightRef = useRef<Graphics | null>(null);
    const gridLayerRef = useRef<Graphics | null>(null);
    const blockedLayerRef = useRef<Graphics | null>(null);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
    const pointerTileRef = useRef<{ x: number; y: number } | null>(null);
    const panStartRef = useRef<{ x: number; y: number } | null>(null);
    const isDrawingRef = useRef(false);
    const lastAppliedTileRef = useRef<string | null>(null);
    const pendingRef = useRef<{
        timer: number | null;
        tiles: Map<string, TilePaint>;
        needsRefresh: boolean;
        /** Colocaciones y borrados ya pedidos, que el refresco tiene que esperar. */
        inFlight: Array<Promise<unknown>>;
    }>({ timer: null, tiles: new Map(), needsRefresh: false, inFlight: [] });
    const applyingRef = useRef(false);
    const flushRef = useRef<(() => Promise<void>) | null>(null);

    // Que borradores tiene cada tile, para que el borrador pida solo los
    // borrados que existen en vez de seis peticiones por tile.
    const draftLayersByTile = useMemo(() => {
        const byTile = new Map<string, number[]>();

        for (const entry of overrides) {
            if (entry.status !== "draft") {
                continue;
            }

            const key = tileKey(entry.x, entry.y);
            byTile.set(key, [...(byTile.get(key) ?? []), entry.layer]);
        }

        return byTile;
    }, [overrides]);

    const draftEntitiesByTile = useMemo(() => {
        const byTile = new Map<string, MapTileEntity["kind"][]>();

        for (const entry of entities) {
            if (entry.status !== "draft") {
                continue;
            }

            const key = tileKey(entry.x, entry.y);
            byTile.set(key, [...(byTile.get(key) ?? []), entry.kind]);
        }

        return byTile;
    }, [entities]);

    // Carga de recursos base.
    useEffect(() => {
        let cancelled = false;

        Promise.all([
            getSharedGraphicsDB(),
            loadObjectsDB(),
            getSharedBodiesDB(),
        ])
            .then(([graphics, objects, bodies]) => {
                if (!cancelled) {
                    setGraphicsDB(graphics);
                    setObjectsDB(objects);
                    setBodiesDB(bodies);
                }
            })
            .catch((error) => {
                console.error("Error cargando recursos del editor:", error);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Carga del mapa base.
    useEffect(() => {
        let cancelled = false;

        setMapData(null);
        setDimensions({ width: 0, height: 0 });

        loadMapData(mapNum)
            .then((data) => {
                if (cancelled) {
                    return;
                }

                setMapData(data);
                setDimensions(getMapDimensions(data, mapNum));
            })
            .catch((error) => {
                console.error(`Error cargando mapa ${mapNum}:`, error);
            });

        return () => {
            cancelled = true;
        };
    }, [mapNum]);

    // Inicializacion de PixiJS.
    useEffect(() => {
        let disposed = false;
        const host = hostRef.current;
        const tileContainers = tileContainersRef.current;
        const renderedSignatures = renderedSignaturesRef.current;

        if (!host) {
            return;
        }

        void (async () => {
            const app = new Application();
            await app.init({
                width,
                height,
                antialias: false,
                backgroundColor: 0x0c0a09,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                autoDensity: true,
            });

            if (disposed) {
                app.destroy(undefined, { children: true });
                return;
            }

            host.innerHTML = "";
            host.appendChild(app.canvas);
            app.canvas.style.width = `${width}px`;
            app.canvas.style.height = `${height}px`;

            const world = new Container();
            // Los tiles se redibujan de a uno cuando cambian, asi que el orden
            // de insercion no alcanza: sin esto un tile reconstruido taparia a
            // los de abajo con su copa de arbol.
            world.sortableChildren = true;
            app.stage.addChild(world);

            const gridLayer = new Graphics();
            const blockedLayer = new Graphics();
            const hoverHighlight = new Graphics();
            hoverHighlight.visible = false;
            gridLayer.zIndex = Z_OVERLAY;
            blockedLayer.zIndex = Z_OVERLAY + 1;
            hoverHighlight.zIndex = Z_OVERLAY + 2;
            world.addChild(gridLayer);
            world.addChild(blockedLayer);
            world.addChild(hoverHighlight);

            appRef.current = app;
            worldRef.current = world;
            gridLayerRef.current = gridLayer;
            blockedLayerRef.current = blockedLayer;
            hoverHighlightRef.current = hoverHighlight;
            cameraRef.current = { x: 0, y: 0, zoom: 1 };
            // Un estado y no solo el ref: el render depende de que Pixi este
            // listo y los refs no vuelven a disparar el efecto.
            setIsPixiReady(true);
        })();

        return () => {
            disposed = true;
            setIsPixiReady(false);

            if (appRef.current) {
                appRef.current.destroy(undefined, { children: true });
                appRef.current = null;
            }

            if (host) {
                host.innerHTML = "";
            }

            worldRef.current = null;
            tileContainers.clear();
            renderedSignatures.clear();
        };
    }, [width, height]);

    const applyCamera = useCallback(() => {
        const world = worldRef.current;

        if (!world) {
            return;
        }

        const { x, y, zoom: nextZoom } = cameraRef.current;
        world.position.set(x, y);
        world.scale.set(nextZoom);
    }, []);

    // Camara inicial: centra el mapa.
    useEffect(() => {
        if (!dimensions.width || !dimensions.height) {
            return;
        }

        const mapPixels = {
            width: dimensions.width * TILE_SIZE,
            height: dimensions.height * TILE_SIZE,
        };
        const initialZoom = Math.min(
            1,
            Math.max(
                MIN_ZOOM,
                Math.min(width / mapPixels.width, height / mapPixels.height),
            ),
        );
        cameraRef.current = {
            x: (width - mapPixels.width * initialZoom) / 2,
            y: (height - mapPixels.height * initialZoom) / 2,
            zoom: initialZoom,
        };
        setZoom(initialZoom);
        applyCamera();
    }, [dimensions, width, height, applyCamera]);

    const clearTileContainers = useCallback(() => {
        for (const container of tileContainersRef.current.values()) {
            container.destroy({ children: true });
        }

        tileContainersRef.current.clear();
        renderedSignaturesRef.current.clear();
    }, []);

    const drawGrid = useCallback(() => {
        const gridLayer = gridLayerRef.current;

        if (!gridLayer || !dimensions.width) {
            return;
        }

        gridLayer.clear();

        if (!showGrid) {
            return;
        }

        gridLayer
            .rect(0, 0, dimensions.width * TILE_SIZE, dimensions.height * TILE_SIZE)
            .stroke({ color: 0x57534e, alpha: 0.35, width: 1 });

        for (let x = 1; x < dimensions.width; x += 1) {
            gridLayer.moveTo(x * TILE_SIZE, 0);
            gridLayer.lineTo(x * TILE_SIZE, dimensions.height * TILE_SIZE);
        }

        for (let y = 1; y < dimensions.height; y += 1) {
            gridLayer.moveTo(0, y * TILE_SIZE);
            gridLayer.lineTo(dimensions.width * TILE_SIZE, y * TILE_SIZE);
        }

        gridLayer.stroke({ color: 0x57534e, alpha: 0.35, width: 1 });
    }, [dimensions, showGrid]);

    const drawBlocked = useCallback(() => {
        const blockedLayer = blockedLayerRef.current;

        if (!blockedLayer || !hasMapTiles(mapData, mapNum) || !dimensions.width) {
            return;
        }

        blockedLayer.clear();

        if (!showBlocked) {
            return;
        }

        const overrideByTile = new Map<string, boolean | null>();

        for (const entry of overrides) {
            if (entry.blocked !== null) {
                overrideByTile.set(tileKey(entry.x, entry.y), entry.blocked);
            }
        }

        for (let y = 1; y <= dimensions.height; y += 1) {
            for (let x = 1; x <= dimensions.width; x += 1) {
                const baseTile = getTileAt(mapData, mapNum, x, y);
                const overridden = overrideByTile.has(tileKey(x, y));
                const blocked =
                    (overridden
                        ? overrideByTile.get(tileKey(x, y))
                        : Boolean(baseTile?.blocked)) ?? false;

                if (!blocked) {
                    continue;
                }

                blockedLayer
                    .rect((x - 1) * TILE_SIZE, (y - 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                    .fill({ color: 0xef4444, alpha: overridden ? 0.28 : 0.14 });
            }
        }
    }, [dimensions, mapData, mapNum, overrides, showBlocked]);

    /**
     * Que hay que dibujar en cada tile: mapa base, mas los overrides del
     * editor, mas los objetos y NPCs colocados.
     */
    const buildTileSpecs = useCallback((): TileSpec[] => {
        if (!mapData || !objectsDB || !bodiesDB || !hasMapTiles(mapData, mapNum)) {
            return [];
        }

        const overrideByKey = new Map(
            overrides.map((entry) => [
                `${entry.x},${entry.y},${entry.layer}`,
                entry,
            ]),
        );
        const entityByKey = new Map(
            entities.map((entry) => [
                `${entry.x},${entry.y},${entry.kind}`,
                entry,
            ]),
        );
        const npcById = new Map(npcs.map((entry) => [entry.id, entry]));
        const specs: TileSpec[] = [];

        for (let y = 1; y <= dimensions.height; y += 1) {
            for (let x = 1; x <= dimensions.width; x += 1) {
                const baseTile = getTileAt(mapData, mapNum, x, y);
                const graphics: Record<string, number> = {
                    ...(baseTile?.graphics ?? {}),
                };

                for (const layer of LAYER_ORDER) {
                    const override = overrideByKey.get(`${x},${y},${layer}`);

                    if (!override) {
                        continue;
                    }

                    if (override.grhIndex == null) {
                        delete graphics[String(layer)];
                    } else {
                        graphics[String(layer)] = override.grhIndex;
                    }
                }

                const sprites: TileSprite[] = [];

                for (const layer of LAYER_ORDER) {
                    const grhIndex = Number(graphics[String(layer)] ?? 0);

                    if (!grhIndex) {
                        continue;
                    }

                    sprites.push({
                        grhIndex,
                        zIndex: LAYER_Z_INDEX[layer],
                        isAnchored: layer >= 3,
                    });
                }

                // Objetos del mapa base (objInfo).
                const baseObjIndex = baseTile?.objInfo?.objIndex ?? 0;

                if (baseObjIndex > 0) {
                    const grhIndex = Number(
                        objectsDB[baseObjIndex.toString()]?.grhIndex ?? 0,
                    );

                    if (grhIndex) {
                        sprites.push({
                            grhIndex,
                            zIndex: Z_LAYER_OBJECT,
                            isAnchored: true,
                        });
                    }
                }

                // Entidades colocadas desde el editor.
                for (const kind of ENTITY_KINDS) {
                    const entity = entityByKey.get(`${x},${y},${kind}`);

                    if (!entity) {
                        continue;
                    }

                    let grhIndex = 0;

                    if (kind === "obj") {
                        grhIndex = Number(
                            objectsDB[entity.entityId.toString()]?.grhIndex ?? 0,
                        );
                    } else {
                        const npcEntry = npcById.get(entity.entityId);
                        const bodyData = npcEntry
                            ? bodiesDB[npcEntry.idBody.toString()]
                            : undefined;
                        grhIndex = Number(bodyData?.["2"] ?? 0);
                    }

                    if (!grhIndex) {
                        continue;
                    }

                    sprites.push({
                        grhIndex,
                        zIndex: Z_LAYER_ENTITY,
                        isAnchored: true,
                        // Los NPCs colocados van tenidos: en el editor hay que
                        // poder distinguirlos del decorado del mapa base.
                        tint: kind === "obj" ? undefined : 0xd8b4fe,
                    });
                }

                specs.push({
                    x,
                    y,
                    sprites,
                    signature: sprites
                        .map(
                            (sprite) =>
                                `${sprite.grhIndex}:${sprite.zIndex}:${sprite.tint ?? ""}`,
                        )
                        .join(","),
                });
            }
        }

        return specs;
    }, [
        bodiesDB,
        dimensions,
        entities,
        mapData,
        mapNum,
        npcs,
        objectsDB,
        overrides,
    ]);

    // Render del mapa base + overrides + entidades.
    //
    // Solo se reconstruyen los tiles cuya firma cambio: pintar un tile no puede
    // costar volver a resolver las texturas de los diez mil del mapa.
    useEffect(() => {
        if (
            !isPixiReady ||
            !hasMapTiles(mapData, mapNum) ||
            !graphicsDB ||
            !objectsDB ||
            !bodiesDB ||
            !dimensions.width
        ) {
            return;
        }

        const world = worldRef.current;

        if (!world) {
            return;
        }

        if (renderedMapRef.current !== mapNum) {
            clearTileContainers();
            renderedMapRef.current = mapNum;
        }

        const specs = buildTileSpecs();
        const changed = specs.filter(
            (spec) =>
                renderedSignaturesRef.current.get(tileKey(spec.x, spec.y)) !==
                spec.signature,
        );

        if (changed.length === 0) {
            return;
        }

        let cancelled = false;

        void (async () => {
            const missing = new Set<number>();

            for (const spec of changed) {
                for (const sprite of spec.sprites) {
                    if (!textureCache.has(sprite.grhIndex)) {
                        missing.add(sprite.grhIndex);
                    }
                }
            }

            if (missing.size > 0) {
                // En paralelo y una sola vez por indice: en serie, la primera
                // carga del mapa son decenas de miles de esperas encadenadas.
                await Promise.all(
                    Array.from(missing, (grhIndex) =>
                        ensureTexture(graphicsDB, grhIndex),
                    ),
                );
            }

            if (cancelled || worldRef.current !== world) {
                return;
            }

            for (const spec of changed) {
                const key = tileKey(spec.x, spec.y);
                const previous = tileContainersRef.current.get(key);

                if (previous) {
                    previous.destroy({ children: true });
                    tileContainersRef.current.delete(key);
                }

                if (spec.sprites.length > 0) {
                    const container = buildTileContainer(spec);
                    world.addChild(container);
                    tileContainersRef.current.set(key, container);
                }

                renderedSignaturesRef.current.set(key, spec.signature);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        bodiesDB,
        buildTileSpecs,
        clearTileContainers,
        dimensions,
        graphicsDB,
        isPixiReady,
        mapData,
        mapNum,
        objectsDB,
    ]);

    const flushPending = useCallback(async () => {
        const pending = pendingRef.current;

        if (pending.timer !== null) {
            window.clearTimeout(pending.timer);
            pending.timer = null;
        }

        const tiles = Array.from(pending.tiles.values());

        if (
            tiles.length === 0 &&
            !pending.needsRefresh &&
            pending.inFlight.length === 0
        ) {
            return;
        }

        // Si hay un apply en curso, reprogramar en vez de descartar los tiles.
        if (applyingRef.current) {
            pending.timer = window.setTimeout(() => {
                pending.timer = null;
                void flushRef.current?.();
            }, 200);
            return;
        }

        const inFlight = pending.inFlight;
        pending.inFlight = [];
        pending.tiles.clear();
        pending.needsRefresh = false;
        applyingRef.current = true;
        setIsApplying(true);

        try {
            // Los errores de cada pedido ya se reportan donde se lanzo: aca solo
            // interesa no refrescar antes de que terminen, porque el mapa
            // volveria sin la entidad y el tile se veria vacio.
            if (inFlight.length > 0) {
                await Promise.allSettled(inFlight);
            }

            for (let i = 0; i < tiles.length; i += PAINT_BATCH_SIZE) {
                await paintTiles(mapNum, tiles.slice(i, i + PAINT_BATCH_SIZE));
            }

            await refreshMapData();
            await refreshStatus();
            setApplyError(null);
        } catch (error) {
            setApplyError(
                error instanceof Error
                    ? error.message
                    : "No se pudieron guardar los cambios.",
            );
        } finally {
            applyingRef.current = false;
            setIsApplying(false);
        }
    }, [mapNum, refreshMapData, refreshStatus]);

    useEffect(() => {
        flushRef.current = flushPending;
    }, [flushPending]);

    const scheduleFlush = useCallback(() => {
        const pending = pendingRef.current;

        if (pending.timer !== null) {
            window.clearTimeout(pending.timer);
        }

        pending.timer = window.setTimeout(() => {
            pending.timer = null;
            void flushRef.current?.();
        }, PAINT_DEBOUNCE_MS);
    }, []);

    /**
     * Borra las ediciones sin publicar del tile.
     *
     * La API borra el borrador, no lo publicado: el borrador deshace lo que
     * todavia no vio nadie. Para deshacer algo ya publicado hay que revertir el
     * mapa desde la barra de herramientas.
     */
    const eraseTile = useCallback(
        async (x: number, y: number) => {
            const key = tileKey(x, y);
            const layers = draftLayersByTile.get(key) ?? [];
            const kinds = draftEntitiesByTile.get(key) ?? [];

            if (layers.length === 0 && kinds.length === 0) {
                return;
            }

            // Se registra antes de esperarlo: soltar el boton dispara el flush,
            // y el refresco tiene que esperar este borrado para no traer el mapa
            // sin aplicar.
            const request = Promise.all([
                ...layers.map((layer) =>
                    clearTileOverride(mapNum, x, y, layer),
                ),
                ...kinds.map((kind) => removeTileEntity(mapNum, x, y, kind)),
            ]);

            pendingRef.current.inFlight.push(request);
            pendingRef.current.needsRefresh = true;
            scheduleFlush();

            await request;
        },
        [draftEntitiesByTile, draftLayersByTile, mapNum, scheduleFlush],
    );

    const applyToolToTile = useCallback(
        async (x: number, y: number) => {
            if (!tool) {
                return;
            }

            const key = tileKey(x, y);

            // Arrastrar dentro del mismo tile no repite el trabajo: antes cada
            // pointermove volvia a pedirle lo mismo al servidor.
            if (lastAppliedTileRef.current === key) {
                return;
            }

            lastAppliedTileRef.current = key;

            try {
                if (tool.kind === "erase") {
                    await eraseTile(x, y);
                    return;
                }

                if (tool.kind === "object" || tool.kind === "npc") {
                    // Igual que el borrado: registrado antes de esperarlo, para
                    // que el refresco no se adelante a la colocacion.
                    const request = placeTileEntity(mapNum, {
                        x,
                        y,
                        kind: tool.kind === "object" ? "obj" : "npc",
                        entityId:
                            tool.kind === "object"
                                ? tool.object.id
                                : tool.npc.id,
                    });

                    pendingRef.current.inFlight.push(request);
                    pendingRef.current.needsRefresh = true;
                    scheduleFlush();

                    await request;
                    return;
                }

                // Terreno: una entrada de la paleta es el tile completo, con un
                // grafico por capa. Se acumula y se envia en lote.
                //
                // Las capas que la entrada no menciona quedan como estaban: una
                // entrada de una sola capa es un piso, no un tile vacio.
                const pending = pendingRef.current;

                tool.graphics.slice(0, LAYER_ORDER.length).forEach(
                    (grhIndex, index) => {
                        const layer = index + 1;

                        pending.tiles.set(`${x},${y},${layer}`, {
                            x,
                            y,
                            layer,
                            grhIndex,
                            // El bloqueo es del tile, no de la capa: va con el piso.
                            blocked: layer === 1 ? tool.blocked : null,
                        });
                    },
                );

                scheduleFlush();
            } catch (error) {
                setApplyError(
                    error instanceof Error
                        ? error.message
                        : "No se pudo aplicar la herramienta.",
                );
            }
        },
        [eraseTile, mapNum, scheduleFlush, tool],
    );

    // Interacciones de camara y pintado.
    useEffect(() => {
        const host = hostRef.current;

        if (!host) {
            return;
        }

        const stopDrawing = () => {
            panStartRef.current = null;
            setIsPanning(false);

            if (isDrawingRef.current) {
                isDrawingRef.current = false;
                lastAppliedTileRef.current = null;
                void flushRef.current?.();
            }
        };

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();

            const camera = cameraRef.current;
            const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
            const nextZoom = Math.min(
                MAX_ZOOM,
                Math.max(MIN_ZOOM, camera.zoom * factor),
            );
            const rect = host.getBoundingClientRect();
            const pointerX = event.clientX - rect.left;
            const pointerY = event.clientY - rect.top;
            const worldX = (pointerX - camera.x) / camera.zoom;
            const worldY = (pointerY - camera.y) / camera.zoom;

            camera.x = pointerX - worldX * nextZoom;
            camera.y = pointerY - worldY * nextZoom;
            camera.zoom = nextZoom;
            setZoom(nextZoom);
            applyCamera();
        };

        const handlePointerDown = (event: PointerEvent) => {
            const isMiddleButton = event.button === 1;
            const isShiftPan = event.button === 0 && event.shiftKey;

            if (isMiddleButton || isShiftPan) {
                event.preventDefault();
                panStartRef.current = { x: event.clientX, y: event.clientY };
                setIsPanning(true);
                return;
            }

            if (event.button === 0 && pointerTileRef.current && tool) {
                isDrawingRef.current = true;
                // Un click nuevo sobre el mismo tile si tiene que aplicar.
                lastAppliedTileRef.current = null;
                void applyToolToTile(
                    pointerTileRef.current.x,
                    pointerTileRef.current.y,
                );
            }
        };

        const handlePointerMove = (event: PointerEvent) => {
            const rect = host.getBoundingClientRect();
            const camera = cameraRef.current;
            const worldX = (event.clientX - rect.left - camera.x) / camera.zoom;
            const worldY = (event.clientY - rect.top - camera.y) / camera.zoom;
            const tileX = Math.floor(worldX / TILE_SIZE) + 1;
            const tileY = Math.floor(worldY / TILE_SIZE) + 1;
            const inBounds =
                tileX >= 1 &&
                tileX <= dimensions.width &&
                tileY >= 1 &&
                tileY <= dimensions.height;
            const previous = pointerTileRef.current;
            const hasChangedTile =
                previous?.x !== (inBounds ? tileX : undefined) ||
                previous?.y !== (inBounds ? tileY : undefined);

            pointerTileRef.current = inBounds ? { x: tileX, y: tileY } : null;

            // Solo al cruzar de tile: un setState por pixel de movimiento
            // vuelve a renderizar el editor entero sesenta veces por segundo.
            if (hasChangedTile) {
                setCursorTile(pointerTileRef.current);
            }

            const hover = hoverHighlightRef.current;

            if (hover && hasChangedTile) {
                if (pointerTileRef.current) {
                    hover.visible = true;
                    hover.clear();
                    hover
                        .rect(
                            (tileX - 1) * TILE_SIZE,
                            (tileY - 1) * TILE_SIZE,
                            TILE_SIZE,
                            TILE_SIZE,
                        )
                        .fill({ color: 0xfbbf24, alpha: 0.25 })
                        .stroke({ color: 0xfbbf24, alpha: 0.8, width: 1 });
                } else {
                    hover.visible = false;
                }
            }

            if (panStartRef.current) {
                camera.x += event.clientX - panStartRef.current.x;
                camera.y += event.clientY - panStartRef.current.y;
                panStartRef.current = { x: event.clientX, y: event.clientY };
                applyCamera();
                return;
            }

            if (isDrawingRef.current && pointerTileRef.current) {
                void applyToolToTile(
                    pointerTileRef.current.x,
                    pointerTileRef.current.y,
                );
            }
        };

        const handlePointerLeave = () => {
            pointerTileRef.current = null;
            setCursorTile(null);

            const hover = hoverHighlightRef.current;

            if (hover) {
                hover.visible = false;
            }

            stopDrawing();
        };

        host.addEventListener("wheel", handleWheel, { passive: false });
        host.addEventListener("pointerdown", handlePointerDown);
        host.addEventListener("pointermove", handlePointerMove);
        host.addEventListener("pointerleave", handlePointerLeave);
        // En la ventana y no en el lienzo: soltar el boton afuera tambien
        // termina el trazo, si no queda pintando al volver a entrar.
        window.addEventListener("pointerup", stopDrawing);
        window.addEventListener("pointercancel", stopDrawing);

        return () => {
            host.removeEventListener("wheel", handleWheel);
            host.removeEventListener("pointerdown", handlePointerDown);
            host.removeEventListener("pointermove", handlePointerMove);
            host.removeEventListener("pointerleave", handlePointerLeave);
            window.removeEventListener("pointerup", stopDrawing);
            window.removeEventListener("pointercancel", stopDrawing);
        };
    }, [applyCamera, applyToolToTile, dimensions, tool]);

    // Limpieza del timer de pintado al desmontar.
    useEffect(() => {
        const pending = pendingRef.current;

        return () => {
            if (pending.timer !== null) {
                window.clearTimeout(pending.timer);
            }
        };
    }, []);

    useEffect(() => {
        drawGrid();
    }, [drawGrid]);

    useEffect(() => {
        drawBlocked();
    }, [drawBlocked]);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-stone-950 shadow-2xl">
            <div
                ref={hostRef}
                className="cursor-crosshair touch-none select-none"
                style={{ width, height }}
            />

            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-stone-950/80 px-3 py-1 text-[11px] text-stone-300 backdrop-blur-md">
                Mapa {mapNum}
                {cursorTile ? ` - Tile ${cursorTile.x}, ${cursorTile.y}` : ""}
                <span className="text-stone-500">
                    Zoom {Math.round(zoom * 100)}%
                </span>
            </div>

            <div className="pointer-events-none absolute right-3 top-3 flex gap-2">
                <label className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-stone-950/80 px-2.5 py-1 text-[10px] text-stone-300 backdrop-blur-md">
                    <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(event) => setShowGrid(event.target.checked)}
                        className="accent-amber-400"
                    />
                    Grilla
                </label>
                <label className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-stone-950/80 px-2.5 py-1 text-[10px] text-stone-300 backdrop-blur-md">
                    <input
                        type="checkbox"
                        checked={showBlocked}
                        onChange={(event) => setShowBlocked(event.target.checked)}
                        className="accent-red-400"
                    />
                    Bloqueo
                </label>
            </div>

            {applyError ? (
                <div className="absolute bottom-3 left-3 right-3 flex items-start gap-2 rounded-xl border border-red-500/40 bg-stone-950/90 px-3 py-2 text-[11px] text-red-300 backdrop-blur-md">
                    <span className="flex-1">{applyError}</span>
                    <button
                        type="button"
                        onClick={() => setApplyError(null)}
                        className="shrink-0 text-red-400/70 transition hover:text-red-200"
                    >
                        Cerrar
                    </button>
                </div>
            ) : isApplying ? (
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-amber-400/30 bg-stone-950/80 px-3 py-1 text-[11px] text-amber-200 backdrop-blur-md">
                    Aplicando cambios...
                </div>
            ) : isPanning ? (
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/10 bg-stone-950/80 px-3 py-1 text-[11px] text-stone-400 backdrop-blur-md">
                    Arrastrando mapa (Shift+click o boton central)
                </div>
            ) : null}
        </div>
    );
}

function buildTileContainer(spec: TileSpec): Container {
    const container = new Container();
    container.sortableChildren = true;
    container.zIndex = spec.y * 10;

    for (const item of spec.sprites) {
        const texture = textureCache.get(item.grhIndex);

        if (!texture) {
            continue;
        }

        const sprite = new Sprite(texture);
        sprite.x = (spec.x - 1) * TILE_SIZE;
        sprite.y = (spec.y - 1) * TILE_SIZE;

        if (item.isAnchored) {
            const position = getBottomAnchoredGraphicPosition(
                texture.width,
                texture.height,
            );
            sprite.x += position.x;
            sprite.y += position.y;
        }

        sprite.zIndex = item.zIndex;

        if (item.tint !== undefined) {
            sprite.tint = item.tint;
        }

        container.addChild(sprite);
    }

    return container;
}
