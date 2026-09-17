import assert from "node:assert/strict";
import test from "node:test";
import { applyPublishedMapOverrides, mergeNpcPlacements } from "../src/mapOverrideSync";

test("applies published tile overrides, clears layers, and replaces entities", () => {
    const vars = {
        mapa: {
            1: {
                3: {
                    4: { blocked: 1, graphics: { "1": 11, "2": 22, "3": 33 } },
                    5: { objInfo: { objIndex: 9, amount: 3 }, npcIndex: 9001 },
                },
            },
        },
    };

    const result = applyPublishedMapOverrides(
        vars,
        {
            mapNum: 1,
            overrides: [
                { x: 4, y: 3, layer: 1, grhIndex: 101, blocked: true },
                { x: 4, y: 3, layer: 3, grhIndex: null, blocked: null },
            ],
            entities: [
                { x: 5, y: 3, kind: "obj", entityId: 42 },
                { x: 5, y: 3, kind: "npc", entityId: 9042 },
            ],
        },
        1,
    );

    assert.deepEqual(vars.mapa[1][3][4].graphics, { "1": 101, "2": 22 });
    assert.equal(vars.mapa[1][3][4].blocked, 1);
    assert.equal(vars.mapa[1][3][4].blockedOverride, 1);
    assert.equal(vars.mapa[1][3][5].objInfo.objIndex, 42);
    assert.equal(vars.mapa[1][3][5].npcIndex, 9042);
    assert.deepEqual(result.npcPlacements, [{ mapNum: 1, x: 5, y: 3, npcIndex: 9042 }]);
});

test("published NPC placements replace base placements at the same tile", () => {
    assert.deepEqual(
        mergeNpcPlacements(
            [
                { mapNum: 1, x: 10, y: 20, npcIndex: 1 },
                { mapNum: 1, x: 11, y: 20, npcIndex: 2 },
            ],
            [{ mapNum: 1, x: 10, y: 20, npcIndex: 7 }],
        ),
        [
            { mapNum: 1, x: 10, y: 20, npcIndex: 7 },
            { mapNum: 1, x: 11, y: 20, npcIndex: 2 },
        ],
    );
});
