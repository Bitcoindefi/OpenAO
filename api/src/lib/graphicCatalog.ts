/**
 * Catalogo de graficos del motor (#6).
 *
 * Los PNG subidos viven en Postgres con indices >= UPLOADED_GRAPHIC_INDEX_START.
 * Los originales viven en graficos(_optimized).json. Validar contra el catalogo
 * real (no un techo hardcodeado) evita aceptar IDs "en rango" que el renderer
 * no puede resolver.
 */

import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

/** Debe coincidir con worldBuilder / frontend gameLoader / schema CHECK. */
export const UPLOADED_GRAPHIC_INDEX_START = 1_000_000;

export type EngineGraphicEntry = {
    numFrames: number;
    numFile: string;
    sX: number;
    sY: number;
    width: number;
    height: number;
    frames: Record<string, string>;
    offset: { x: number; y: number };
};

export type GraphicExistence =
    | { ok: true; source: "engine" | "uploaded" }
    | { ok: false; reason: string };

let cachedEngineIds: Set<number> | null = null;
let cachedEnginePath: string | null = null;

export function resolveGraficosPath(): string {
    const candidates = [
        path.resolve(
            __dirname,
            "../../../frontend/public/init/graficos_optimized.json",
        ),
        path.resolve(__dirname, "../../../frontend/public/init/graficos.json"),
        path.resolve(
            __dirname,
            "../../../../frontend/public/init/graficos_optimized.json",
        ),
        path.resolve(__dirname, "../../../../frontend/public/init/graficos.json"),
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return candidates[0];
}

export async function loadEngineGraphicIds(
    forceReload = false,
): Promise<Set<number>> {
    const graficosPath = resolveGraficosPath();

    if (
        !forceReload &&
        cachedEngineIds &&
        cachedEnginePath === graficosPath
    ) {
        return cachedEngineIds;
    }

    if (!existsSync(graficosPath)) {
        throw new Error(
            `No se encontro graficos.json en ${graficosPath}. El catalogo del motor es obligatorio para validar paletas.`,
        );
    }

    const raw = JSON.parse(await fs.readFile(graficosPath, "utf8")) as Record<
        string,
        unknown
    >;
    const ids = new Set<number>();

    for (const key of Object.keys(raw)) {
        const parsed = Number.parseInt(key, 10);
        if (Number.isInteger(parsed) && parsed > 0) {
            ids.add(parsed);
        }
    }

    cachedEngineIds = ids;
    cachedEnginePath = graficosPath;
    return ids;
}

/** Resetea el cache (tests). */
export function clearEngineGraphicIdCache(): void {
    cachedEngineIds = null;
    cachedEnginePath = null;
}

/**
 * Forma graficos.json para un PNG subido (tile estatico completo).
 * El cliente ya hace mergeUploadedGraphics; este helper documenta el contrato.
 */
export function uploadedGraphicToEngineEntry(graphic: {
    grhIndex: number;
    width: number;
    height: number;
}): EngineGraphicEntry {
    const key = String(graphic.grhIndex);
    return {
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

export function isReservedUploadedIndex(grhIndex: number): boolean {
    return Number.isInteger(grhIndex) && grhIndex >= UPLOADED_GRAPHIC_INDEX_START;
}

/**
 * Valida un unico grhIndex contra el catalogo del motor o el predicado de
 * subidos (inyectable para tests / transacciones).
 */
export async function checkGraphicExists(
    grhIndex: number,
    uploadedExists: (grhIndex: number) => Promise<boolean>,
): Promise<GraphicExistence> {
    if (!Number.isInteger(grhIndex) || grhIndex <= 0) {
        return {
            ok: false,
            reason: `Indice de grafico invalido: ${grhIndex}.`,
        };
    }

    if (isReservedUploadedIndex(grhIndex)) {
        const exists = await uploadedExists(grhIndex);
        if (!exists) {
            return {
                ok: false,
                reason: `El grafico subido ${grhIndex} no existe. Subilo antes de usarlo.`,
            };
        }
        return { ok: true, source: "uploaded" };
    }

    const engineIds = await loadEngineGraphicIds();
    if (!engineIds.has(grhIndex)) {
        return {
            ok: false,
            reason: `El grafico ${grhIndex} no existe en el catalogo del motor (graficos.json).`,
        };
    }

    return { ok: true, source: "engine" };
}

/**
 * Valida una lista de capas de paleta. Null = capa vacia (como terrain.json).
 * Al menos una capa debe referenciar un grafico real.
 */
export async function validatePaletteGraphics(
    graphics: Array<number | null>,
    uploadedExists: (grhIndex: number) => Promise<boolean>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!Array.isArray(graphics) || graphics.length < 1 || graphics.length > 4) {
        return {
            ok: false,
            reason: "La paleta admite entre 1 y 4 capas de graficos.",
        };
    }

    let nonNull = 0;

    for (const grh of graphics) {
        if (grh == null) {
            continue;
        }
        nonNull += 1;
        const result = await checkGraphicExists(grh, uploadedExists);
        if (!result.ok) {
            return result;
        }
    }

    if (nonNull === 0) {
        return {
            ok: false,
            reason: "La entrada de paleta necesita al menos un grafico no nulo.",
        };
    }

    return { ok: true };
}
