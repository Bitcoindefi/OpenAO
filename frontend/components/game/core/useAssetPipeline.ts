import { useCallback } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";
import type { CharacterSnapshot } from "../../../lib/aowProtocol";
import type { GraphicData } from "../../../types/game";
import { getMapDimensions, loadMapData } from "../../../utils/gameLoader";
import {
    collectAdjacentMapNumbers,
    collectCharacterGraphicIds,
    collectMapGraphicIds,
    collectSpecificBodyGraphicIds,
    collectSpellGraphicIds,
    getInitialVisibleBounds,
    NAKED_BODY_IDS,
} from "../assets/scenePreload";
import type { Engine } from "../engine/Engine";

type LoadingStage =
    | "Preparando cliente"
    | "Cargando escena inicial"
    | "Cargando personaje"
    | "Cargando hechizos"
    | "Renderizando mundo"
    | "Precargando alrededores";

type UseAssetPipelineOptions = {
    getGraphicImagePaths: (imageFile: string | number) => string[];
    updateLoadingProgress: (
        stage: LoadingStage,
        progress: number,
        detail: string,
    ) => void;
};

export function useAssetPipeline({
    getGraphicImagePaths,
    updateLoadingProgress,
}: UseAssetPipelineOptions) {
    const loadBaseTexture = useCallback(
        async (
            engine: Engine,
            imagePaths: string | string[],
        ): Promise<Texture> => {
            if (engine.isDestroyed) {
                return Texture.EMPTY;
            }

            const candidatePaths = Array.isArray(imagePaths)
                ? imagePaths
                : [imagePaths];
            const cacheKey = candidatePaths.join("|");

            const cachedTexture = engine.baseTextureCache.get(cacheKey);
            if (cachedTexture) {
                return cachedTexture;
            }

            const pendingLoad = engine.pendingAssetLoads.get(cacheKey);
            if (pendingLoad) {
                return pendingLoad;
            }

            for (const candidatePath of candidatePaths) {
                engine.loadedAssetPaths.add(candidatePath);
            }

            const loadPromise = (async () => {
                let lastError: unknown;

                for (const candidatePath of candidatePaths) {
                    try {
                        const baseTexture = await Assets.load(candidatePath);
                        baseTexture.source.scaleMode = "nearest";
                        if (!engine.isDestroyed) {
                            engine.baseTextureCache.set(cacheKey, baseTexture);
                        }

                        return baseTexture;
                    } catch (error) {
                        lastError = error;
                    }
                }

                throw lastError ?? new Error("Failed to load texture");
            })().finally(() => {
                engine.pendingAssetLoads.delete(cacheKey);
            });

            engine.pendingAssetLoads.set(cacheKey, loadPromise);
            return loadPromise;
        },
        [],
    );

    const loadTextures = useCallback(
        async (engine: Engine, graphicIds: string[]): Promise<void> => {
            if (!engine.graphicsDB || engine.isDestroyed) return;

            const imageGroups = new Map<string, string[]>();
            const animatedGraphics = new Map<string, GraphicData>();

            for (const graphicId of graphicIds) {
                if (
                    engine.textureCache.has(graphicId) ||
                    engine.animatedTextureCache.has(graphicId)
                ) {
                    continue;
                }

                const graphicData: GraphicData | undefined =
                    engine.graphicsDB[graphicId];
                if (graphicData && graphicData.numFile) {
                    const imageFile = graphicData.numFile;
                    if (!imageGroups.has(imageFile)) {
                        imageGroups.set(imageFile, []);
                    }
                    imageGroups.get(imageFile)!.push(graphicId);
                } else if (
                    graphicData &&
                    !graphicData.numFile &&
                    graphicData.numFrames > 1
                ) {
                    animatedGraphics.set(graphicId, graphicData);
                    for (
                        let frameIndex = 1;
                        frameIndex <= graphicData.numFrames;
                        frameIndex++
                    ) {
                        const frameGraphicId: string | number =
                            graphicData.frames[frameIndex.toString()];
                        const frameGraphicKey = frameGraphicId.toString();
                        const frameGraphicData =
                            engine.graphicsDB[frameGraphicKey];
                        if (
                            frameGraphicData &&
                            !engine.textureCache.has(frameGraphicKey)
                        ) {
                            const imageFile = frameGraphicData.numFile;
                            if (!imageGroups.has(imageFile)) {
                                imageGroups.set(imageFile, []);
                            }
                            imageGroups.get(imageFile)!.push(frameGraphicKey);
                        }
                    }
                }
            }

            const texturePromises: Promise<void>[] = [];

            for (const [imageFile, groupedGraphicIds] of imageGroups) {
                const promise = loadBaseTexture(
                    engine,
                    getGraphicImagePaths(imageFile),
                )
                    .then((baseTexture: Texture) => {
                        if (engine.isDestroyed || !engine.graphicsDB) {
                            return;
                        }

                        for (const graphicId of groupedGraphicIds) {
                            const graphicData: GraphicData | undefined =
                                engine.graphicsDB![graphicId];
                            if (!graphicData) {
                                continue;
                            }

                            if (graphicData.numFrames > 1) {
                                const frameTextures: Texture[] = [];
                                for (
                                    let frameIndex = 1;
                                    frameIndex <= graphicData.numFrames;
                                    frameIndex++
                                ) {
                                    const frameGraphicId: string | number =
                                        graphicData.frames[
                                            frameIndex.toString()
                                        ];
                                    const frameGraphicKey =
                                        frameGraphicId.toString();
                                    if (!frameGraphicId) {
                                        continue;
                                    }
                                    const frameGraphicData =
                                        engine.graphicsDB![frameGraphicKey];
                                    if (!frameGraphicData) {
                                        continue;
                                    }

                                    const frameTexture = new Texture({
                                        source: baseTexture.source,
                                        frame: new Rectangle(
                                            frameGraphicData.sX,
                                            frameGraphicData.sY,
                                            frameGraphicData.width,
                                            frameGraphicData.height,
                                        ),
                                    });
                                    frameTextures.push(frameTexture);
                                    engine.textureCache.set(
                                        frameGraphicKey,
                                        frameTexture,
                                    );
                                }
                                if (frameTextures.length > 0) {
                                    engine.animatedTextureCache.set(
                                        graphicId,
                                        frameTextures,
                                    );
                                }
                                continue;
                            }

                            const croppedTexture = new Texture({
                                source: baseTexture.source,
                                frame: new Rectangle(
                                    graphicData.sX,
                                    graphicData.sY,
                                    graphicData.width,
                                    graphicData.height,
                                ),
                            });
                            engine.textureCache.set(graphicId, croppedTexture);
                        }
                    })
                    .catch((error: unknown) => {
                        console.warn(
                            `Failed to load image ${imageFile}:`,
                            error,
                        );
                    });

                texturePromises.push(promise);
            }

            await Promise.all(texturePromises);

            if (engine.isDestroyed) {
                return;
            }

            for (const [
                parentGraphicId,
                graphicData,
            ] of animatedGraphics.entries()) {
                const frameTextures: Texture[] = [];
                for (
                    let frameIndex = 1;
                    frameIndex <= graphicData.numFrames;
                    frameIndex++
                ) {
                    const frameGraphicId: string | number =
                        graphicData.frames[frameIndex.toString()];
                    const frameGraphicKey = frameGraphicId.toString();
                    const frameTexture =
                        engine.textureCache.get(frameGraphicKey);
                    if (frameTexture) {
                        frameTextures.push(frameTexture);
                    } else {
                        console.warn(
                            `Frame texture not found for animated graphic ${parentGraphicId}, frame ${frameIndex}, frameGraphicId ${frameGraphicKey}`,
                        );
                    }
                }
                if (frameTextures.length > 0) {
                    engine.animatedTextureCache.set(
                        parentGraphicId,
                        frameTextures,
                    );
                }
            }
        },
        [getGraphicImagePaths, loadBaseTexture],
    );

    const loadCharacterTextures = useCallback(
        async (
            engine: Engine,
            graphicId: number,
            graphicData: GraphicData,
        ): Promise<Texture[] | null> => {
            if (!engine.graphicsDB || engine.isDestroyed) return null;

            if (graphicData.numFrames > 1) {
                const frameTextures: Texture[] = [];
                for (
                    let frameIndex = 1;
                    frameIndex <= graphicData.numFrames;
                    frameIndex++
                ) {
                    const frameGraphicId =
                        graphicData.frames[frameIndex.toString()];
                    if (!frameGraphicId) {
                        continue;
                    }

                    const frameGraphicData =
                        engine.graphicsDB[frameGraphicId.toString()];
                    if (!frameGraphicData) {
                        continue;
                    }

                    try {
                        const baseTexture = await loadBaseTexture(
                            engine,
                            getGraphicImagePaths(frameGraphicData.numFile),
                        );
                        if (engine.isDestroyed) {
                            return null;
                        }
                        const frameTexture = new Texture({
                            source: baseTexture.source,
                            frame: new Rectangle(
                                frameGraphicData.sX,
                                frameGraphicData.sY,
                                frameGraphicData.width,
                                frameGraphicData.height,
                            ),
                        });
                        frameTextures.push(frameTexture);
                    } catch (error) {
                        console.warn(
                            `Failed to load character frame ${frameGraphicId}:`,
                            error,
                        );
                    }
                }
                return frameTextures.length > 0 ? frameTextures : null;
            }

            try {
                const baseTexture = await loadBaseTexture(
                    engine,
                    getGraphicImagePaths(graphicData.numFile),
                );
                if (engine.isDestroyed) {
                    return null;
                }
                const singleTexture = new Texture({
                    source: baseTexture.source,
                    frame: new Rectangle(
                        graphicData.sX,
                        graphicData.sY,
                        graphicData.width,
                        graphicData.height,
                    ),
                });
                return [singleTexture];
            } catch (error) {
                console.warn(
                    `Failed to load character texture ${graphicId}:`,
                    error,
                );
                return null;
            }
        },
        [getGraphicImagePaths, loadBaseTexture],
    );

    const loadSingleTexture = useCallback(
        async (
            engine: Engine,
            graphicId: number,
            graphicData: GraphicData,
        ): Promise<Texture | null> => {
            try {
                if (engine.isDestroyed) {
                    return null;
                }

                const baseTexture = await loadBaseTexture(
                    engine,
                    getGraphicImagePaths(graphicData.numFile),
                );
                if (engine.isDestroyed) {
                    return null;
                }
                return new Texture({
                    source: baseTexture.source,
                    frame: new Rectangle(
                        graphicData.sX,
                        graphicData.sY,
                        graphicData.width,
                        graphicData.height,
                    ),
                });
            } catch (error) {
                console.warn(`Failed to load texture ${graphicId}:`, error);
                return null;
            }
        },
        [getGraphicImagePaths, loadBaseTexture],
    );

    const preloadGraphicIds = useCallback(
        async (engine: Engine, graphicIds: string[]): Promise<void> => {
            if (!graphicIds.length) {
                return;
            }

            await loadTextures(engine, Array.from(new Set(graphicIds)));
        },
        [loadTextures],
    );

    const preloadCurrentSceneAssets = useCallback(
        async (engine: Engine, snapshot?: CharacterSnapshot | null) => {
            if (!snapshot) {
                return;
            }

            updateLoadingProgress(
                "Cargando personaje",
                26,
                `Precargando apariencia de ${snapshot.nameCharacter}...`,
            );
            await preloadGraphicIds(
                engine,
                collectCharacterGraphicIds(engine, snapshot, {
                    includeBody: false,
                }),
            );

            const spellGraphicIds = collectSpellGraphicIds(
                engine,
                snapshot.spells ?? [],
            );
            if (spellGraphicIds.length > 0) {
                updateLoadingProgress(
                    "Cargando hechizos",
                    42,
                    `Precargando ${spellGraphicIds.length} efectos de hechizos...`,
                );
                await preloadGraphicIds(engine, spellGraphicIds);
            }
        },
        [preloadGraphicIds, updateLoadingProgress],
    );

    const preloadInitialVisibleMapAssets = useCallback(
        async (engine: Engine, snapshot?: CharacterSnapshot | null) => {
            if (!engine.mapData || !engine.objectsDB) {
                return null;
            }

            const initialVisibleBounds = getInitialVisibleBounds(
                engine.mapDimensions,
                snapshot,
            );

            if (!initialVisibleBounds) {
                return null;
            }

            updateLoadingProgress(
                "Cargando escena inicial",
                20,
                "Precargando ventana del mapa...",
            );

            await preloadGraphicIds(
                engine,
                collectMapGraphicIds(
                    engine.mapData,
                    engine.mapNumber,
                    engine.mapDimensions,
                    engine.objectsDB,
                    {
                        includeLayers: ["1", "2", "3", "4"],
                        includeObjects: true,
                        bounds: initialVisibleBounds,
                    },
                ),
            );

            return initialVisibleBounds;
        },
        [preloadGraphicIds, updateLoadingProgress],
    );

    const prefetchNearbyMaps = useCallback(
        async (engine: Engine) => {
            if (!engine.mapData || !engine.objectsDB || engine.isDestroyed) {
                return;
            }

            // Skip prefetching if user has data saver enabled or slow network
            const navConnection = typeof navigator !== "undefined" ? (navigator as any)?.connection : null;
            if (
                navConnection?.saveData ||
                navConnection?.effectiveType === "slow-2g" ||
                navConnection?.effectiveType === "2g"
            ) {
                return;
            }

            const nearbyMaps = collectAdjacentMapNumbers(
                engine.mapData,
                engine.mapNumber,
            );
            if (!nearbyMaps.length) {
                return;
            }

            // Cap prefetch to at most 2 adjacent maps to avoid RAM and bandwidth spikes
            const mapsToPrefetch = nearbyMaps.slice(0, 2);

            updateLoadingProgress(
                "Precargando alrededores",
                88,
                `Analizando ${mapsToPrefetch.length} mapas cercanos...`,
            );

            for (let index = 0; index < mapsToPrefetch.length; index++) {
                if (engine.isDestroyed) {
                    return;
                }

                const targetMap = mapsToPrefetch[index];
                try {
                    const nextMapData = await loadMapData(targetMap);
                    const nextMapDimensions = getMapDimensions(
                        nextMapData,
                        targetMap,
                    );
                    await preloadGraphicIds(
                        engine,
                        collectMapGraphicIds(
                            nextMapData,
                            targetMap,
                            nextMapDimensions,
                            engine.objectsDB,
                            {
                                includeLayers: ["1", "2"],
                                includeObjects: false,
                            },
                        ),
                    );
                    updateLoadingProgress(
                        "Precargando alrededores",
                        88 + Math.round(((index + 1) / nearbyMaps.length) * 12),
                        `Mapa ${targetMap} listo para transicion rapida.`,
                    );
                } catch (error) {
                    console.warn(
                        `Failed to prefetch nearby map ${targetMap}:`,
                        error,
                    );
                }
            }
        },
        [preloadGraphicIds, updateLoadingProgress],
    );

    const warmCommonCharacterAssets = useCallback(
        async (engine: Engine) => {
            if (engine.isDestroyed) {
                return;
            }

            await preloadGraphicIds(
                engine,
                collectSpecificBodyGraphicIds(engine, NAKED_BODY_IDS),
            );
        },
        [preloadGraphicIds],
    );

    return {
        loadBaseTexture,
        loadCharacterTextures,
        loadSingleTexture,
        loadTextures,
        preloadCurrentSceneAssets,
        preloadGraphicIds,
        preloadInitialVisibleMapAssets,
        prefetchNearbyMaps,
        warmCommonCharacterAssets,
    };
}
