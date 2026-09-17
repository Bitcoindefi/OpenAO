import assert from "node:assert/strict";
import test from "node:test";
import {
    MAX_OBJECT_AMOUNT,
    PlacementValidationError,
    doorBlocksWhen,
    normalizeObjectAmount,
    normalizeSignText,
    planObjectMove,
    structureBoundingBox,
    validateStructureTiles,
} from "../lib/mapObjectPlacement";

test("normalizeObjectAmount defaults to 1 and enforces caps", () => {
    assert.equal(normalizeObjectAmount(undefined), 1);
    assert.equal(normalizeObjectAmount(25), 25);
    assert.throws(() => normalizeObjectAmount(0), PlacementValidationError);
    assert.throws(() => normalizeObjectAmount(MAX_OBJECT_AMOUNT + 1), PlacementValidationError);
});

test("doorBlocksWhen only when closed", () => {
    assert.equal(doorBlocksWhen("closed"), true);
    assert.equal(doorBlocksWhen("open"), false);
});

test("validateStructureTiles is atomic-friendly and layer-3/4 only", () => {
    const tiles = validateStructureTiles([
        { x: 10, y: 10, layer: 3, grhIndex: 100 },
        { x: 11, y: 10, layer: 3, grhIndex: 101 },
        { x: 10, y: 10, layer: 3, grhIndex: 100 },
        { x: 10, y: 10, layer: 4, grhIndex: 200 },
    ]);
    assert.equal(tiles.length, 3);
    assert.throws(
        () => validateStructureTiles([{ x: 1, y: 1, layer: 2 as 3, grhIndex: 1 }]),
        PlacementValidationError,
    );
    assert.throws(() => validateStructureTiles([]), PlacementValidationError);
});

test("structureBoundingBox reports area for entity-with-area model", () => {
    const box = structureBoundingBox([
        { x: 5, y: 7, layer: 3, grhIndex: 1 },
        { x: 8, y: 9, layer: 4, grhIndex: 2 },
    ]);
    assert.deepEqual(box, { minX: 5, minY: 7, maxX: 8, maxY: 9, width: 4, height: 3 });
});

test("planObjectMove rejects same tile and out of bounds", () => {
    assert.deepEqual(planObjectMove({ x: 1, y: 1 }, { x: 2, y: 2 }), {
        from: { x: 1, y: 1 },
        to: { x: 2, y: 2 },
    });
    assert.throws(() => planObjectMove({ x: 1, y: 1 }, { x: 1, y: 1 }), PlacementValidationError);
    assert.throws(() => planObjectMove({ x: 0, y: 1 }, { x: 1, y: 1 }), PlacementValidationError);
});

test("normalizeSignText trims and rejects empty/too long", () => {
    assert.equal(normalizeSignText("  Hola  "), "Hola");
    assert.throws(() => normalizeSignText("   "), PlacementValidationError);
    assert.throws(() => normalizeSignText("x".repeat(121)), PlacementValidationError);
});
