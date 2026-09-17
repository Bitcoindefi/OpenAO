import assert from "node:assert/strict";
import test from "node:test";
import {
    FloorPaintValidationError,
    MAX_PAINT_TILES,
    analyzeWalkability,
    applyBlockedOverrides,
    buildBlockedGridFromTerrain,
    expandRectangle,
    expandSelection,
    paletteEntryToTilePaints,
    planPalettePaint,
} from "../lib/floorPaint";

test("expandRectangle fills inclusive bounds and rejects OOB / oversized", () => {
    const tiles = expandRectangle(1, 1, 2, 3);
    assert.equal(tiles.length, 6);
    assert.deepEqual(tiles[0], { x: 1, y: 1 });
    assert.deepEqual(tiles[5], { x: 2, y: 3 });

    // Swapped corners still work.
    assert.equal(expandRectangle(20, 20, 1, 1).length, 400);

    assert.throws(
        () => expandRectangle(0, 1, 1, 1),
        FloorPaintValidationError,
    );
    assert.throws(
        () => expandRectangle(1, 1, 100, 6), // 100*6=600 > 500
        (error: unknown) =>
            error instanceof FloorPaintValidationError &&
            error.code === "too_many_tiles",
    );
});

test("20x20 rectangle is accepted as a single atomic plan", () => {
    const points = expandRectangle(10, 10, 29, 29);
    assert.equal(points.length, 400);
    assert.ok(points.length <= MAX_PAINT_TILES);

    const entry = {
        id: 42,
        graphics: [5500, 581],
        blocked: true,
    };
    const plans = planPalettePaint(points, entry);
    // 400 tiles * 2 layers — still one logical operation for the repo TX.
    assert.equal(plans.length, 800);
    assert.equal(plans[0]?.blocked, true);
    assert.equal(plans[1]?.blocked, null); // blocked only on layer 1
});

test("expandSelection dedupes and caps", () => {
    const unique = expandSelection([
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
    ]);
    assert.equal(unique.length, 2);
    assert.throws(() => expandSelection([]), FloorPaintValidationError);
    assert.throws(
        () => expandSelection([{ x: 0, y: 1 }]),
        FloorPaintValidationError,
    );
});

test("paletteEntryToTilePaints mirrors editor layer+blocked contract", () => {
    const paints = paletteEntryToTilePaints(
        { x: 5, y: 7 },
        { id: 3, graphics: [10, null, 30], blocked: false },
        true,
    );
    assert.equal(paints.length, 3);
    assert.deepEqual(paints[0], {
        x: 5,
        y: 7,
        layer: 1,
        grhIndex: 10,
        blocked: true,
    });
    assert.equal(paints[1]?.grhIndex, null);
    assert.equal(paints[1]?.blocked, null);
    assert.equal(paints[2]?.grhIndex, 30);
});

test("analyzeWalkability flags an island after a blocking ring", () => {
    // 5x5 open grid with center (3,3) sealed by a ring — use 1-based seed later.
    const grid = Array.from({ length: 5 }, () =>
        new Array<boolean>(5).fill(false),
    );
    // Block a ring around (2,2) 0-based → map tile (3,3)
    for (const [x, y] of [
        [1, 1],
        [2, 1],
        [3, 1],
        [1, 2],
        [3, 2],
        [1, 3],
        [2, 3],
        [3, 3],
    ] as const) {
        grid[y]![x] = true;
    }
    // Center walkable but unreachable from corner seed.
    grid[2]![2] = false;

    const report = analyzeWalkability(grid, { x: 1, y: 1 });
    assert.equal(report.isolated, true);
    assert.ok(report.unreachableCount >= 1);
    assert.ok(report.reachableCount >= 1);
});

test("buildBlockedGridFromTerrain + overrides feed isolation correctly", () => {
    const rows = [
        [1, 1, 1],
        [1, 2, 1],
        [1, 1, 1],
    ];
    const palette = {
        "1": { blocked: false },
        "2": { blocked: true },
    };
    const grid = buildBlockedGridFromTerrain(rows, palette, 3, 3);
    assert.equal(grid[1]![1], true);
    assert.equal(grid[0]![0], false);

    applyBlockedOverrides(grid, [{ x: 2, y: 2, blocked: false }]);
    assert.equal(grid[1]![1], false);

    const open = analyzeWalkability(grid);
    assert.equal(open.isolated, false);
    assert.equal(open.totalWalkable, 9);
});
