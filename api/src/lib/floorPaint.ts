/**
 * Pure floor-paint helpers for OpenAO #7 (Etapa 1: pintar el piso).
 * Kept DB-free so rectangle/selection/palette/isolation rules are unit-testable.
 */

export const MAP_SIZE = 100;
/** Same hard cap as worldBuilder.paintTiles — one request cannot repaint the map. */
export const MAX_PAINT_TILES = 500;
export const MAX_LAYERS = 4;

export type Point = { x: number; y: number };

export type PaletteEntry = {
    id: number;
    graphics: Array<number | null>;
    blocked: boolean;
};

export type TilePaintPlan = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked: boolean | null;
};

export type FloorPaintErrorCode =
    | "out_of_bounds"
    | "empty_selection"
    | "too_many_tiles"
    | "palette_missing"
    | "invalid_palette_id"
    | "invalid_rectangle";

export class FloorPaintValidationError extends Error {
    readonly code: FloorPaintErrorCode;

    constructor(code: FloorPaintErrorCode, message: string) {
        super(message);
        this.code = code;
        this.name = "FloorPaintValidationError";
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
        throw new FloorPaintValidationError(
            "out_of_bounds",
            `${label} (${x},${y}) fuera de la grilla 1..${MAP_SIZE}.`,
        );
    }
}

export function normalizeRectangle(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
): { minX: number; maxX: number; minY: number; maxY: number; tileCount: number } {
    assertInBounds(fromX, fromY, "from");
    assertInBounds(toX, toY, "to");

    const minX = Math.min(fromX, toX);
    const maxX = Math.max(fromX, toX);
    const minY = Math.min(fromY, toY);
    const maxY = Math.max(fromY, toY);
    const tileCount = (maxX - minX + 1) * (maxY - minY + 1);

    if (tileCount > MAX_PAINT_TILES) {
        throw new FloorPaintValidationError(
            "too_many_tiles",
            `El rectangulo (${tileCount} tiles) supera el limite de ${MAX_PAINT_TILES} por operacion.`,
        );
    }

    return { minX, maxX, minY, maxY, tileCount };
}

export function expandRectangle(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
): Point[] {
    const { minX, maxX, minY, maxY } = normalizeRectangle(
        fromX,
        fromY,
        toX,
        toY,
    );
    const points: Point[] = [];

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            points.push({ x, y });
        }
    }

    return points;
}

/**
 * Deduplicates a free-form selection (lasso / multi-pick) and enforces the
 * same per-request tile cap as rectangles.
 */
export function expandSelection(points: Point[]): Point[] {
    if (!Array.isArray(points) || points.length === 0) {
        throw new FloorPaintValidationError(
            "empty_selection",
            "La seleccion de tiles esta vacia.",
        );
    }

    const seen = new Set<string>();
    const unique: Point[] = [];

    for (const point of points) {
        assertInBounds(point.x, point.y, "selection");
        const key = `${point.x},${point.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push({ x: point.x, y: point.y });
    }

    if (unique.length > MAX_PAINT_TILES) {
        throw new FloorPaintValidationError(
            "too_many_tiles",
            `La seleccion (${unique.length} tiles) supera el limite de ${MAX_PAINT_TILES} por operacion.`,
        );
    }

    return unique;
}

/**
 * Expand a palette entry the same way the in-game editor does: one graphic per
 * layer, blocked flag only on layer 1 (tile-level collision).
 */
export function paletteEntryToTilePaints(
    point: Point,
    entry: PaletteEntry,
    blockedOverride?: boolean | null,
): TilePaintPlan[] {
    if (!Number.isInteger(entry.id) || entry.id <= 0) {
        throw new FloorPaintValidationError(
            "invalid_palette_id",
            `paletteId invalido: ${String(entry.id)}.`,
        );
    }

    const graphics = entry.graphics.slice(0, MAX_LAYERS);
    if (graphics.length === 0) {
        throw new FloorPaintValidationError(
            "palette_missing",
            `La entrada de paleta ${entry.id} no tiene graficos.`,
        );
    }

    const blocked =
        blockedOverride === undefined ? entry.blocked : blockedOverride;

    return graphics.map((grhIndex, index) => {
        const layer = index + 1;
        return {
            x: point.x,
            y: point.y,
            layer,
            grhIndex: grhIndex == null || grhIndex <= 0 ? null : grhIndex,
            blocked: layer === 1 ? Boolean(blocked) : null,
        };
    });
}

export function planPalettePaint(
    points: Point[],
    entry: PaletteEntry,
    blockedOverride?: boolean | null,
): TilePaintPlan[] {
    const plans: TilePaintPlan[] = [];
    for (const point of points) {
        plans.push(...paletteEntryToTilePaints(point, entry, blockedOverride));
    }
    return plans;
}

export type WalkabilityReport = {
    isolated: boolean;
    totalWalkable: number;
    reachableCount: number;
    unreachableCount: number;
    seed: Point | null;
};

/**
 * 4-directional BFS over a blocked grid (true = blocked).
 * Optional seed (1-based map coords); otherwise first walkable cell.
 */
export function analyzeWalkability(
    blockedGrid: boolean[][],
    seed?: Point | null,
): WalkabilityReport {
    const height = blockedGrid.length;
    const width = height > 0 ? (blockedGrid[0]?.length ?? 0) : 0;

    if (height === 0 || width === 0) {
        return {
            isolated: false,
            totalWalkable: 0,
            reachableCount: 0,
            unreachableCount: 0,
            seed: null,
        };
    }

    let totalWalkable = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!blockedGrid[y]![x]) totalWalkable += 1;
        }
    }

    if (totalWalkable === 0) {
        return {
            isolated: false,
            totalWalkable: 0,
            reachableCount: 0,
            unreachableCount: 0,
            seed: null,
        };
    }

    let seedX = -1;
    let seedY = -1;

    if (seed) {
        const sx = seed.x - 1;
        const sy = seed.y - 1;
        if (
            sx >= 0 &&
            sy >= 0 &&
            sx < width &&
            sy < height &&
            !blockedGrid[sy]![sx]
        ) {
            seedX = sx;
            seedY = sy;
        }
    }

    if (seedX < 0) {
        outer: for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!blockedGrid[y]![x]) {
                    seedX = x;
                    seedY = y;
                    break outer;
                }
            }
        }
    }

    const visited = Array.from({ length: height }, () =>
        new Array<boolean>(width).fill(false),
    );
    const queue: Array<[number, number]> = [[seedX, seedY]];
    visited[seedY]![seedX] = true;
    let reachableCount = 0;
    const dirs: Array<[number, number]> = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
    ];

    while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        reachableCount += 1;
        for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (
                nx < 0 ||
                ny < 0 ||
                nx >= width ||
                ny >= height ||
                visited[ny]![nx] ||
                blockedGrid[ny]![nx]
            ) {
                continue;
            }
            visited[ny]![nx] = true;
            queue.push([nx, ny]);
        }
    }

    const unreachableCount = totalWalkable - reachableCount;
    return {
        isolated: unreachableCount > 0,
        totalWalkable,
        reachableCount,
        unreachableCount,
        seed: { x: seedX + 1, y: seedY + 1 },
    };
}

/**
 * Build a 100x100 blocked grid from terrain rows/palette (0-based arrays).
 */
export function buildBlockedGridFromTerrain(
    rows: number[][],
    palette: Record<string, { blocked?: boolean }>,
    width = MAP_SIZE,
    height = MAP_SIZE,
): boolean[][] {
    const grid: boolean[][] = [];
    for (let y = 0; y < height; y++) {
        const row = Array.isArray(rows[y]) ? rows[y]! : [];
        const line: boolean[] = [];
        for (let x = 0; x < width; x++) {
            const paletteId = Number(row[x]) || 0;
            const entry =
                paletteId > 0 ? palette[String(paletteId)] : undefined;
            line.push(Boolean(entry?.blocked));
        }
        grid.push(line);
    }
    return grid;
}

export function applyBlockedOverrides(
    grid: boolean[][],
    overrides: Array<{ x: number; y: number; blocked: boolean | null }>,
): void {
    for (const override of overrides) {
        if (override.blocked === null || override.blocked === undefined) {
            continue;
        }
        const ox = override.x - 1;
        const oy = override.y - 1;
        if (oy < 0 || ox < 0 || oy >= grid.length || ox >= (grid[0]?.length ?? 0)) {
            continue;
        }
        grid[oy]![ox] = override.blocked;
    }
}
