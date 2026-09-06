import assert from "node:assert/strict";
import test from "node:test";
import type { TilePaint } from "./editorApi";
import {
    PaintHistory,
    buildInverseTiles,
    tilesInRect,
} from "./paintHistory.ts";

function tile(
    x: number,
    y: number,
    layer: number,
    grhIndex: number | null,
    blocked: boolean | null = null,
): TilePaint {
    return { x, y, layer, grhIndex, blocked };
}

test("undo and redo restore strokes in reverse then forward order", () => {
    const history = new PaintHistory();
    const first = [tile(1, 1, 1, 10, true)];
    const firstInverse = [tile(1, 1, 1, 2, false)];
    const second = [tile(2, 2, 1, 20, false)];
    const secondInverse = [tile(2, 2, 1, 3, true)];

    history.push(first, firstInverse);
    history.push(second, secondInverse);

    assert.deepEqual(history.undo(), secondInverse);
    assert.deepEqual(history.undo(), firstInverse);
    assert.equal(history.undo(), null);
    assert.deepEqual(history.redo(), first);
    assert.deepEqual(history.redo(), second);
    assert.equal(history.redo(), null);
});

test("empty stroke is ignored and does not clear redo", () => {
    const history = new PaintHistory();
    history.push([tile(1, 1, 1, 8, false)], [tile(1, 1, 1, 1, true)]);
    history.undo();
    history.push([], []);

    assert.deepEqual(history.snapshot(), {
        canUndo: false,
        canRedo: true,
        undoCount: 0,
        redoCount: 1,
    });
    assert.deepEqual(history.redo(), [tile(1, 1, 1, 8, false)]);
});

test("buildInverseTiles uses the prior override or null", () => {
    const forward = [
        tile(4, 5, 1, 90, true),
        tile(4, 5, 2, 91, null),
        tile(6, 7, 1, 92, false),
    ];
    const overrides = [
        tile(4, 5, 1, 11, false),
        tile(4, 5, 2, 12, null),
    ];

    assert.deepEqual(buildInverseTiles(forward, overrides), [
        tile(4, 5, 1, 11, false),
        tile(4, 5, 2, 12, null),
        tile(6, 7, 1, null, null),
    ]);
});

test("tilesInRect is inclusive for a reverse drag", () => {
    assert.deepEqual(tilesInRect(4, 5, 2, 3), [
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 2, y: 4 },
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 2, y: 5 },
        { x: 3, y: 5 },
        { x: 4, y: 5 },
    ]);
    assert.deepEqual(tilesInRect(2, 3, 4, 5), tilesInRect(4, 5, 2, 3));
    assert.deepEqual(tilesInRect(1, 1, 1, 1), [{ x: 1, y: 1 }]);
});
