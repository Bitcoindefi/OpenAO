import assert from "node:assert/strict";
import { test } from "vitest";

import {
    countWalkableComponents,
    findReachableFromSpawn,
    runAutomatedMapPreChecks,
} from "../lib/mapModerationPrecheck";
import { isPubliclyVisibleStatus } from "../repositories/mapModeration";

test("proposed maps are not publicly visible until published", () => {
    assert.equal(isPubliclyVisibleStatus("draft"), false);
    assert.equal(isPubliclyVisibleStatus("proposed"), false);
    assert.equal(isPubliclyVisibleStatus("in_review"), false);
    assert.equal(isPubliclyVisibleStatus("rejected"), false);
    assert.equal(isPubliclyVisibleStatus("published"), true);
});

test("pre-checks catch prohibited words and blocked spawn", () => {
    const result = runAutomatedMapPreChecks({
        name: "Free Gold Cheat Map",
        texts: ["hack here"],
        tiles: [{ x: 50, y: 50, blocked: true }],
        spawnPoint: { x: 50, y: 50 },
    });
    assert.equal(result.passed, false);
    assert.ok(result.flags.some((flag) => /prohibido|cheat|hack/i.test(flag)));
    assert.ok(result.flags.some((flag) => /bloqueado/i.test(flag)));
});

test("BFS flags unreachable walkable tiles and isolated regions", () => {
    // Two islands: spawn island at 10,10 and an isolated tile at 30,30.
    const tiles = [
        { x: 10, y: 10, blocked: false },
        { x: 11, y: 10, blocked: false },
        { x: 30, y: 30, blocked: false },
        { x: 12, y: 10, blocked: true },
    ];
    const reachable = findReachableFromSpawn(tiles, { x: 10, y: 10 });
    assert.ok(reachable.has("10,10"));
    assert.ok(reachable.has("11,10"));
    assert.equal(reachable.has("30,30"), false);
    assert.ok(countWalkableComponents(tiles) >= 2);

    const result = runAutomatedMapPreChecks({
        name: "Islas",
        tiles,
        spawnPoint: { x: 10, y: 10 },
    });
    assert.equal(result.passed, false);
    assert.ok(result.flags.some((flag) => /inalcanzables|aisladas/i.test(flag)));
});

test("clean connected map passes automated checks", () => {
    const tiles = [
        { x: 50, y: 50, blocked: false },
        { x: 51, y: 50, blocked: false },
        { x: 52, y: 50, blocked: false },
        { x: 50, y: 51, blocked: false },
    ];
    const result = runAutomatedMapPreChecks({
        name: "Bosque del Este",
        texts: ["Bienvenidos"],
        npcNames: ["Guardia"],
        tiles,
        spawnPoint: { x: 50, y: 50 },
        npcCount: 2,
        objectCount: 4,
        maxNpcsPerMap: 50,
        maxObjectsPerMap: 200,
    });
    assert.equal(result.passed, true);
    assert.deepEqual(result.flags, []);
});
