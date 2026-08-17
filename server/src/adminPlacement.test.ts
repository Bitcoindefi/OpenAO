import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminNpcPlacementArgs, parseAdminObjectPlacementArgs } from "./adminPlacement";

test("NPC placement keeps legacy syntax and accepts optional clicked coordinates", () => {
    assert.deepEqual(parseAdminNpcPlacementArgs("7 guardar mover"), {
        idNpc: 7,
        persist: true,
        persistMovement: true,
        position: null,
    });
    assert.deepEqual(parseAdminNpcPlacementArgs("7 guardar 42 51"), {
        idNpc: 7,
        persist: true,
        persistMovement: false,
        position: { x: 42, y: 51 },
    });
});

test("NPC placement rejects incomplete and out-of-map coordinates", () => {
    assert.equal(parseAdminNpcPlacementArgs("7 guardar 42"), null);
    assert.equal(parseAdminNpcPlacementArgs("7 guardar 0 51"), null);
});

test("object placement parses a positive object id and map coordinates", () => {
    assert.deepEqual(parseAdminObjectPlacementArgs("123 42 51"), {
        objIndex: 123,
        position: { x: 42, y: 51 },
    });
    assert.equal(parseAdminObjectPlacementArgs("0 42 51"), null);
    assert.equal(parseAdminObjectPlacementArgs("123 101 51"), null);
});