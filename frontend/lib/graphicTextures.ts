import { Assets, Rectangle, Texture } from "pixi.js";
import type {
    BodiesDB,
    DirectionalGraphicData,
    GraphicData,
    GraphicsDB,
    HeadsDB,
} from "../types/game";
import {
    loadBodiesDB,
    loadGraphicsDB,
    loadHeadsDB,
    UPLOADED_GRAPHIC_INDEX_START,
} from "../utils/gameLoader";
import { getApiBaseUrl } from "./api-base-url";

/**
 * Resolucion de graficos compartida entre el juego y el editor visual.
 *
 * Los graficos subidos desde el modo construccion no estan horneados en
 * public/, se sirven desde la API. Se distinguen por el rango de indice.
 */
export function getGraphicImagePaths(
    imageFile: string | number,
): string[] {
    if (Number(imageFile) >= UPLOADED_GRAPHIC_INDEX_START) {
        return [`${getApiBaseUrl()}/game-data/graphics/${imageFile}.png`];
    }

    return [
        `/graphics/${imageFile}.png`,
        `/static/graphics/${imageFile}.png`,
        `/static/graficosbk/${imageFile}.png`,
    ];
}

/**
 * Cachea un catalogo del juego para todo el proceso.
 *
 * Los `load*DB` descargan y descomprimen en cada llamada, asi que una pantalla
 * con una miniatura por fila reconstruiria el catalogo cientos de veces. Un
 * fallo no queda cacheado: se vuelve a intentar en la siguiente llamada.
 */
function shareCatalog<T>(load: () => Promise<T>): {
    get: () => Promise<T>;
    invalidate: () => void;
} {
    let pending: Promise<T> | null = null;

    return {
        get: () => {
            if (!pending) {
                pending = load().catch((error: unknown) => {
                    pending = null;
                    throw error;
                });
            }

            return pending;
        },
        invalidate: () => {
            pending = null;
        },
    };
}

const graphicsCatalog = shareCatalog(loadGraphicsDB);
const bodiesCatalog = shareCatalog(loadBodiesDB);
const headsCatalog = shareCatalog(loadHeadsDB);

/** Catalogo de graficos compartido por todo el proceso. */
export function getSharedGraphicsDB(): Promise<GraphicsDB> {
    return graphicsCatalog.get();
}

/**
 * Descarta el catalogo compartido. Hay que llamarlo tras subir un grafico: los
 * indices subidos se mezclan al construir el catalogo y de otro modo el nuevo
 * no existiria hasta recargar la pagina.
 */
export function invalidateSharedGraphicsDB(): void {
    graphicsCatalog.invalidate();
}

/** Catalogo de cuerpos compartido, para resolver el grafico de un NPC. */
export function getSharedBodiesDB(): Promise<BodiesDB> {
    return bodiesCatalog.get();
}

/** Catalogo de cabezas compartido, para resolver el grafico de un NPC. */
export function getSharedHeadsDB(): Promise<HeadsDB> {
    return headsCatalog.get();
}

/** Los sprites mirando hacia el jugador. */
const FRONT_DIRECTION = "2";

/**
 * Grafico con el que se reconoce a un personaje en una lista.
 *
 * Un NPC no tiene grhIndex propio: se dibuja combinando cuerpo y cabeza. Para
 * una miniatura alcanza la cabeza de frente, y cuando no tiene (bestias,
 * criaturas) el cuerpo es justamente lo que lo identifica.
 */
export function resolveCharacterThumbnailGrh(
    bodiesDB: BodiesDB | null,
    headsDB: HeadsDB | null,
    idBody: number,
    idHead: number,
): number {
    const head = headsDB?.[String(idHead)]?.[FRONT_DIRECTION] ?? 0;

    if (head > 0) {
        return head;
    }

    return bodiesDB?.[String(idBody)]?.[FRONT_DIRECTION] ?? 0;
}

const imagePromiseCache = new Map<string, Promise<HTMLImageElement>>();

/**
 * Carga la imagen fuente de un grafico como `HTMLImageElement`, para recortarla
 * en un canvas 2D.
 *
 * Las miniaturas del editor no usan PixiJS a proposito: cada `Application` toma
 * un contexto WebGL, y el navegador solo mantiene una decena y media vivos. La
 * paleta de un mapa tiene cientos de entradas.
 */
export function loadGraphicImage(
    imageFile: string | number,
): Promise<HTMLImageElement> {
    const candidatePaths = getGraphicImagePaths(imageFile);
    const cacheKey = candidatePaths.join("|");
    const cached = imagePromiseCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const loadPromise = (async () => {
        let lastError: unknown;

        for (const candidatePath of candidatePaths) {
            try {
                return await loadImageElement(candidatePath);
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError ?? new Error(`No se pudo cargar ${imageFile}.png`);
    })();

    imagePromiseCache.set(cacheKey, loadPromise);

    return loadPromise;
}

function loadImageElement(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`No se pudo cargar ${source}`));
        image.src = source;
    });
}

const baseTexturePromiseCache = new Map<string, Promise<Texture>>();

export async function loadBaseTexture(
    imageFile: string | number,
): Promise<Texture> {
    const candidatePaths = getGraphicImagePaths(imageFile);
    const cacheKey = candidatePaths.join("|");
    const cachedPromise = baseTexturePromiseCache.get(cacheKey);

    if (cachedPromise) {
        return cachedPromise;
    }

    const loadPromise = (async () => {
        let lastError: unknown;

        for (const candidatePath of candidatePaths) {
            try {
                const texture = await Assets.load(candidatePath);
                texture.source.scaleMode = "nearest";
                return texture;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError ?? new Error("Failed to load base texture");
    })();

    baseTexturePromiseCache.set(cacheKey, loadPromise);
    return loadPromise;
}

export async function loadGraphicTexture(
    graphicData: GraphicData,
): Promise<Texture> {
    const baseTexture = await loadBaseTexture(graphicData.numFile);

    return new Texture({
        source: baseTexture.source,
        frame: new Rectangle(
            graphicData.sX,
            graphicData.sY,
            graphicData.width,
            graphicData.height,
        ),
    });
}

export function resolveGraphicFrame(
    graphicsDB: GraphicsDB,
    graphicId: number,
    direction: string,
): GraphicData | null {
    const graphic = graphicsDB[graphicId.toString()];

    if (!graphic) {
        return null;
    }

    if (graphic.numFile && graphic.numFrames <= 1) {
        return graphic;
    }

    const frameId =
        (graphic.numFrames > 1 ? graphic.frames?.["1"] : undefined) ??
        graphic.frames?.[direction] ??
        graphic.frames?.["1"] ??
        Object.values(graphic.frames ?? {})[0];

    if (!frameId) {
        return null;
    }

    return graphicsDB[frameId.toString()] ?? null;
}

export function resolveDirectionalGraphicFrame(
    graphicsDB: GraphicsDB,
    directionalData: DirectionalGraphicData | undefined,
    direction: string,
): GraphicData | null {
    if (!directionalData) {
        return null;
    }

    const graphicId = directionalData[direction as keyof DirectionalGraphicData];

    if (!graphicId) {
        return null;
    }

    return resolveGraphicFrame(graphicsDB, graphicId, direction);
}
