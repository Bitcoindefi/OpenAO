/**
 * Pure helpers for Etapa 2 NPC place / move / remove (#8).
 * DB-free so acceptance rules are unit-testable without Postgres.
 */

export const MAP_SIZE = 100;

/** Soft cap so construction mode cannot flood a map with creatures. */
export const MAX_NPCS_PER_MAP = 50;

export type Point = { x: number; y: number };

export type NpcPlacementErrorCode =
    | "out_of_bounds"
    | "invalid_npc_index"
    | "invalid_movement"
    | "tile_blocked"
    | "tile_occupied"
    | "map_npc_limit"
    | "npc_not_found"
    | "same_tile_move";

export class NpcPlacementValidationError extends Error {
    readonly code: NpcPlacementErrorCode;

    constructor(code: NpcPlacementErrorCode, message: string) {
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
        throw new NpcPlacementValidationError(
            "out_of_bounds",
            `${label} (${x},${y}) fuera del mapa 1..${MAP_SIZE}.`,
        );
    }
}

export function assertValidNpcIndex(npcIndex: number): void {
    if (!Number.isInteger(npcIndex) || npcIndex <= 0) {
        throw new NpcPlacementValidationError(
            "invalid_npc_index",
            `npcIndex inexistente o invalido: ${String(npcIndex)}.`,
        );
    }
}

/** Movement is optional; when present it must be a non-negative integer. */
export function normalizeMovement(movement: number | undefined): number | undefined {
    if (movement === undefined) {
        return undefined;
    }
    if (!Number.isInteger(movement) || movement < 0) {
        throw new NpcPlacementValidationError(
            "invalid_movement",
            `movement invalido: ${String(movement)}.`,
        );
    }
    return movement;
}

export function assertUnderMapNpcLimit(currentCount: number, adding = 1): void {
    if (!Number.isInteger(currentCount) || currentCount < 0) {
        throw new NpcPlacementValidationError(
            "map_npc_limit",
            `Conteo de NPCs invalido: ${String(currentCount)}.`,
        );
    }
    if (currentCount + adding > MAX_NPCS_PER_MAP) {
        throw new NpcPlacementValidationError(
            "map_npc_limit",
            `El mapa ya tiene ${currentCount} NPCs; maximo ${MAX_NPCS_PER_MAP}.`,
        );
    }
}

/**
 * Self-move (from === to) is a no-op success — maintainer note on #8.
 * Distinct destination is returned for callers to run in one TX.
 */
export function planNpcMove(
    from: Point,
    to: Point,
): { from: Point; to: Point; noop: boolean } {
    assertInBounds(from.x, from.y, "origen");
    assertInBounds(to.x, to.y, "destino");
    if (from.x === to.x && from.y === to.y) {
        return { from, to, noop: true };
    }
    return { from, to, noop: false };
}

/**
 * Resolve whether (x,y) is blocked given baseline terrain + optional override.
 * Override `blocked === null/undefined` means "fall back to terrain".
 */
export function resolveTileBlocked(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    /** Palette id at rows[y-1][x-1]. */
    paletteId: number | null | undefined;
    /** palette[id].blocked */
    paletteBlocked: boolean | undefined;
    /** Draft/published override for collision (layer-1 style). */
    overrideBlocked?: boolean | null;
}): boolean {
    const { x, y, width, height } = options;
    if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 1 ||
        y < 1 ||
        x > width ||
        y > height
    ) {
        return true;
    }
    if (options.overrideBlocked === true) {
        return true;
    }
    if (options.overrideBlocked === false) {
        return false;
    }
    return Boolean(options.paletteBlocked);
}

export function assertTileNotBlocked(blocked: boolean, x: number, y: number): void {
    if (blocked) {
        throw new NpcPlacementValidationError(
            "tile_blocked",
            `Tile (${x},${y}) esta bloqueado; no se puede colocar un NPC ahi.`,
        );
    }
}

export function assertTileFree(occupied: boolean, x: number, y: number): void {
    if (occupied) {
        throw new NpcPlacementValidationError(
            "tile_occupied",
            `Ya hay un NPC en (${x},${y}).`,
        );
    }
}

export type TerrainSnapshot = {
    width: number;
    height: number;
    /** rows[row][col] = palette id (1-based coords → rows[y-1][x-1]) */
    rows: number[][];
    paletteBlocked: Map<number, boolean>;
};

export function isTerrainTileBlocked(
    terrain: TerrainSnapshot,
    x: number,
    y: number,
    overrideBlocked?: boolean | null,
): boolean {
    const row = terrain.rows[y - 1];
    const paletteId = row ? row[x - 1] : null;
    const paletteBlocked =
        paletteId == null ? true : terrain.paletteBlocked.get(paletteId);
    return resolveTileBlocked({
        x,
        y,
        width: terrain.width,
        height: terrain.height,
        paletteId,
        paletteBlocked,
        overrideBlocked,
    });
}
