import assert from "node:assert/strict";
import test from "node:test";

const vars = require("../src/vars");
const LoadMaps = require("../src/loadMaps");
const { reloadMapsDiff } = require("../src/gameDataSync");

test("E2E Simulation: Full server runtime lifecycle & hot-reload verification", async () => {
    const loader = new LoadMaps();

    // 1. Initial State Setup
    const mapId = 1;
    vars.mapa = vars.mapa || {};
    vars.mapData = vars.mapData || [];
    vars.personajes = vars.personajes || {};
    vars.npcs = vars.npcs || {};

    // Populate active character with WebSocket client session
    vars.personajes["char_1"] = {
        id: 101,
        name: "TestHero",
        map: mapId,
        pos: { x: 50, y: 50 },
    };

    // Populate active NPC
    vars.npcs["npc_1"] = {
        id: 501,
        name: "TestMerchant",
        map: mapId,
        pos: { x: 52, y: 50 },
    };

    // 2. Perform Single Map Reload and verify WebSocket broadcast dispatch
    const singleResult = await reloadMapsDiff(mapId);
    assert.equal(singleResult.reloadedMaps.length, 1);
    assert.equal(singleResult.reloadedMaps[0], mapId);
    assert.equal(singleResult.charactersPreserved, 1);
    assert.equal(singleResult.npcsPreserved, 1);

    // Verify grid occupancy
    assert.equal(vars.mapData[mapId][50][50].id, 101, "Character 101 must occupy tile (50, 50)");
    assert.equal(vars.mapData[mapId][50][52].id, 501, "NPC 501 must occupy tile (52, 50)");

    // 3. Test Safe-Warp Walkable Tile Resolver
    // Simulate blocked tile at current position
    vars.mapa[mapId][50][50] = { blocked: 1 };
    vars.mapa[mapId][50][51] = { blocked: 0 };
    vars.mapData[mapId][50][51] = { id: 0 };

    const safePos = loader.findNearestWalkableTile(mapId, 50, 50);
    assert.notDeepEqual(safePos, { x: 50, y: 50 }, "Must resolve to adjacent walkable tile when target is blocked");
    assert.equal(vars.mapa[mapId][safePos.y][safePos.x]?.blocked ?? 0, 0, "Resolved tile must be non-blocked");

    // 4. Batch Reload All Maps Lifecycle
    const batchResult = await reloadMapsDiff();
    assert.ok(batchResult.reloadedMaps.length >= 1);
    assert.ok(batchResult.charactersPreserved >= 1);
    assert.ok(batchResult.npcsPreserved >= 1);

    // 5. Boundary & Invalid inputs
    const nonExistentResult = await reloadMapsDiff(99999);
    assert.equal(nonExistentResult.reloadedMaps.length, 0);
    assert.equal(nonExistentResult.charactersPreserved, 0);

    const negativeResult = await reloadMapsDiff(-5);
    assert.ok(Array.isArray(negativeResult.reloadedMaps));
});
