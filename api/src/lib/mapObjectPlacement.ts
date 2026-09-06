/**
 * Pure helpers for Etapa 2 object / structure / door / sign placement (#9).
 * Kept DB-free so acceptance rules are unit-testable without Postgres.
 */

export const MAP_SIZE = 100;
/** Soft cap so construction mode cannot inject unbounded gold piles. */
export const MAX_OBJECT_AMOUNT = 10_000;
export const MAX_SIGN_TEXT_LENGTH = 120;
export const MAX_STRUCTURE_TILES = 500;

export type Point = { x: number; y: number };

export type StructureTile = Point & {
    layer: 3 | 4;
    grhIndex: number;
    blocked?: boolean;
};

export type DoorState = "open" | "closed";

export type PlacementErrorCode =
    | "out_of_bounds"
    | "invalid_amount"
    | "invalid_obj_index"
    | "empty_structure"
    | "structure_too_large"
    | "structure_out_of_bounds"
    | "invalid_layer"
    | "invalid_door_state"
    | "invalid_sign_text"
    | "same_tile_move";

export class PlacementValidationError extends Error {
    readonly code: PlacementErrorCode;

    constructor(code: PlacementErrorCode, message: string) {
        super(message);
        this.code = code;
    }
}

export function assertInBounds(x: number, y: number, label = "tile"): void {
    if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 1 ||
        y < 1 ||
        x > MAP_SIZE ||
        y > MAP_SIZE
    ) {
        throw new PlacementValidationError(
            "out_of_bounds",
            `${label} (${x},${y}) fuera del mapa 1..${MAP_SIZE}.`,
        );
    }
}

export function normalizeObjectAmount(amount: number | undefined): number {
    const value = amount === undefined ? 1 : amount;
    if (!Number.isInteger(value) || value < 1) {
        throw new PlacementValidationError(
            "invalid_amount",
            `Cantidad invalida: ${String(amount)}.`,
        );
    }
    if (value > MAX_OBJECT_AMOUNT) {
        throw new PlacementValidationError(
            "invalid_amount",
            `Cantidad ${value} supera el maximo ${MAX_OBJECT_AMOUNT}.`,
        );
    }
    return value;
}

export function assertValidObjIndex(objIndex: number): void {
    if (!Number.isInteger(objIndex) || objIndex <= 0) {
        throw new PlacementValidationError(
            "invalid_obj_index",
            `objIndex inexistente o invalido: ${String(objIndex)}.`,
        );
    }
}

export function doorBlocksWhen(state: DoorState): boolean {
    if (state !== "open" && state !== "closed") {
        throw new PlacementValidationError(
            "invalid_door_state",
            `Estado de puerta invalido: ${String(state)}.`,
        );
    }
    return state === "closed";
}

export function normalizeSignText(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new PlacementValidationError(
            "invalid_sign_text",
            "El cartel necesita texto no vacio.",
        );
    }
    if (trimmed.length > MAX_SIGN_TEXT_LENGTH) {
        throw new PlacementValidationError(
            "invalid_sign_text",
            `Texto del cartel supera ${MAX_SIGN_TEXT_LENGTH} caracteres.`,
        );
    }
    return trimmed;
}

export function validateStructureTiles(tiles: StructureTile[]): StructureTile[] {
    if (!Array.isArray(tiles) || tiles.length === 0) {
        throw new PlacementValidationError(
            "empty_structure",
            "La estructura necesita al menos un tile.",
        );
    }
    if (tiles.length > MAX_STRUCTURE_TILES) {
        throw new PlacementValidationError(
            "structure_too_large",
            `La estructura tiene ${tiles.length} tiles; maximo ${MAX_STRUCTURE_TILES}.`,
        );
    }

    const seen = new Set<string>();
    const normalized: StructureTile[] = [];

    for (const tile of tiles) {
        assertInBounds(tile.x, tile.y, "estructura");
        if (tile.layer !== 3 && tile.layer !== 4) {
            throw new PlacementValidationError(
                "invalid_layer",
                `Las estructuras solo usan capas 3/4 (recibido ${tile.layer}).`,
            );
        }
        if (!Number.isInteger(tile.grhIndex) || tile.grhIndex <= 0) {
            throw new PlacementValidationError(
                "invalid_obj_index",
                `grhIndex invalido en estructura: ${String(tile.grhIndex)}.`,
            );
        }
        const key = `${tile.x},${tile.y},${tile.layer}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        normalized.push({
            x: tile.x,
            y: tile.y,
            layer: tile.layer,
            grhIndex: tile.grhIndex,
            blocked: tile.blocked,
        });
    }

    return normalized;
}

/**
 * Plan a move as delete-at-from + upsert-at-to so callers can run it in one TX.
 */
export function planObjectMove(from: Point, to: Point): { from: Point; to: Point } {
    assertInBounds(from.x, from.y, "origen");
    assertInBounds(to.x, to.y, "destino");
    if (from.x === to.x && from.y === to.y) {
        throw new PlacementValidationError(
            "same_tile_move",
            "Origen y destino del movimiento son el mismo tile.",
        );
    }
    return { from, to };
}

export function structureBoundingBox(tiles: StructureTile[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
} {
    const normalized = validateStructureTiles(tiles);
    const xs = normalized.map((tile) => tile.x);
    const ys = normalized.map((tile) => tile.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
    };
}
