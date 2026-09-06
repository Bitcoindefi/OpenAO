import assert from "node:assert/strict";
import test from "node:test";
import {
    MAX_NPCS_PER_MAP,
    NpcPlacementValidationError,
    assertInBounds,
    assertTileFree,
    assertTileNotBlocked,
    assertUnderMapNpcLimit,
    assertValidNpcIndex,
    isTerrainTileBlocked,
    normalizeMovement,
    planNpcMove,
    resolveTileBlocked,
    type TerrainSnapshot,
} from "../lib/mapNpcPlacement";

test("assertInBounds rejects non-integers and out of range", () => {
    assertInBounds(1, 100);
    assert.throws(() => assertInBounds(0, 1), NpcPlacementValidationError);
    assert.throws(() => assertInBounds(1, 101), NpcPlacementValidationError);
    assert.throws(() => assertInBounds(1.5, 1), NpcPlacementValidationError);
});

test("assertValidNpcIndex and normalizeMovement", () => {
    assertValidNpcIndex(42);
    assert.throws(() => assertValidNpcIndex(0), NpcPlacementValidationError);
    assert.equal(normalizeMovement(undefined), undefined);
    assert.equal(normalizeMovement(0), 0);
    assert.equal(normalizeMovement(3), 3);
    assert.throws(() => normalizeMovement(-1), NpcPlacementValidationError);
});

test("MAX_NPCS_PER_MAP is a single named constant and enforced", () => {
    assert.equal(MAX_NPCS_PER_MAP, 50);
    assertUnderMapNpcLimit(49, 1);
    assert.throws(() => assertUnderMapNpcLimit(50, 1), (err: unknown) => {
        assert.ok(err instanceof NpcPlacementValidationError);
        assert.equal(err.code, "map_npc_limit");
        return true;
    });
});

test("planNpcMove treats self-tile as noop success (maintainer #8 note)", () => {
    assert.deepEqual(planNpcMove({ x: 5, y: 5 }, { x: 5, y: 5 }), {
        from: { x: 5, y: 5 },
        to: { x: 5, y: 5 },
        noop: true,
    });
    assert.deepEqual(planNpcMove({ x: 5, y: 5 }, { x: 6, y: 5 }), {
        from: { x: 5, y: 5 },
        to: { x: 6, y: 5 },
        noop: false,
    });
    assert.throws(() => planNpcMove({ x: 0, y: 1 }, { x: 1, y: 1 }), NpcPlacementValidationError);
});

test("resolveTileBlocked: override wins, else palette, OOB blocked", () => {
    assert.equal(
        resolveTileBlocked({
            x: 1,
            y: 1,
            width: 100,
            height: 100,
            paletteId: 1,
            paletteBlocked: false,
            overrideBlocked: true,
        }),
        true,
    );
    assert.equal(
        resolveTileBlocked({
            x: 1,
            y: 1,
            width: 100,
            height: 100,
            paletteId: 1,
            paletteBlocked: true,
            overrideBlocked: false,
        }),
        false,
    );
    assert.equal(
        resolveTileBlocked({
            x: 1,
            y: 1,
            width: 100,
            height: 100,
            paletteId: 1,
            paletteBlocked: true,
            overrideBlocked: null,
        }),
        true,
    );
    assert.equal(
        resolveTileBlocked({
            x: 0,
            y: 1,
            width: 100,
            height: 100,
            paletteId: 1,
            paletteBlocked: false,
        }),
        true,
    );
});

test("isTerrainTileBlocked reads palette via rows", () => {
    const terrain: TerrainSnapshot = {
        width: 3,
        height: 3,
        rows: [
            [1, 2, 1],
            [2, 1, 2],
            [1, 1, 2],
        ],
        paletteBlocked: new Map([
            [1, false],
            [2, true],
        ]),
    };
    assert.equal(isTerrainTileBlocked(terrain, 1, 1), false);
    assert.equal(isTerrainTileBlocked(terrain, 2, 1), true);
    assert.equal(isTerrainTileBlocked(terrain, 2, 1, false), false);
    assert.throws(() => assertTileNotBlocked(true, 2, 1), (err: unknown) => {
        assert.ok(err instanceof NpcPlacementValidationError);
        assert.equal(err.code, "tile_blocked");
        return true;
    });
});

test("assertTileFree rejects stacking", () => {
    assertTileFree(false, 1, 1);
    assert.throws(() => assertTileFree(true, 1, 1), (err: unknown) => {
        assert.ok(err instanceof NpcPlacementValidationError);
        assert.equal(err.code, "tile_occupied");
        return true;
    });
});
