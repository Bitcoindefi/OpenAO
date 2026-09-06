import assert from "node:assert/strict";
import { test } from "vitest";

import {
    computeGameMapChecksum,
    normalizeGameMapData,
    paletteEntriesFromTerrain,
    terrainFromParts,
} from "../lib/mapData";

test("normalizeGameMapData fills defaults and sorts npc placements", () => {
    const normalized = normalizeGameMapData(
        {
            metadata: { name: "Arena", terreno: "BOSQUE", zona: "CAMPO", pk: 1 },
            terrain: {
                width: 2,
                height: 2,
                palette: {
                    "2": { graphics: [10, 11], blocked: true },
                    "1": { graphics: 9 },
                },
                rows: [
                    [1, 2],
                    [2, 1],
                ],
            },
            npcs: [
                { mapNum: 7, x: 2, y: 1, npcIndex: 3 },
                { mapNum: 7, x: 1, y: 1, npcIndex: 2 },
            ],
            specials: { exits: { "2,2": { map: 1, x: 50, y: 50 } } },
        },
        7,
    );

    assert.equal(normalized.metadata.id, 7);
    assert.equal(normalized.metadata.restringir, "No");
    assert.deepEqual(
        normalized.npcs.map((n) => n.npcIndex),
        [2, 3],
    );
    assert.ok(normalized.specials.exits["2,2"]);
});

test("palette/grid round-trip keeps checksum stable", () => {
    const original = normalizeGameMapData(
        {
            metadata: { id: 3, name: "Roundtrip" },
            terrain: {
                id: 3,
                width: 2,
                height: 2,
                palette: { "1": { graphics: 5 }, "2": { blocked: true } },
                rows: [
                    [1, 2],
                    [2, 1],
                ],
            },
            npcs: [],
            specials: {},
        },
        3,
    );

    const rebuilt = normalizeGameMapData(
        {
            metadata: original.metadata,
            terrain: terrainFromParts(
                3,
                original.terrain.width,
                original.terrain.height,
                paletteEntriesFromTerrain(original.terrain.palette),
                original.terrain.rows,
            ),
            npcs: original.npcs,
            specials: original.specials,
        },
        3,
    );

    assert.equal(computeGameMapChecksum(original), computeGameMapChecksum(rebuilt));
    assert.equal(paletteEntriesFromTerrain(original.terrain.palette).length, 2);
});
