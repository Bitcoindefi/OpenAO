import assert from "node:assert/strict";
import test from "node:test";
import {
    buildNpcEntries,
    buildObjectEntries,
    buildTerrainEntries,
    filterCatalogEntries,
    getGraphicPreviewUrl,
    updateRecentIds,
} from "./content-browser";

test("objects are searchable by normalized name and filterable by type", () => {
    const entries = buildObjectEntries({
        "2": { name: "Espada Élfica", grhIndex: 504, objType: 2 },
        "1": { name: "Manzana", grhIndex: 506, objType: 1 },
    });
    assert.deepEqual(
        filterCatalogEntries(entries, "elfica", "2").map((entry) => entry.id),
        ["2"],
    );
});

test("NPC entries resolve a real body graphic for previews", () => {
    const entries = buildNpcEntries(
        { "7": { name: "Herrero", idHead: 505, idBody: 199, npcType: 10 } },
        { "199": { "1": 42, "2": 43, "3": 44, "4": 45, headOffsetX: 0, headOffsetY: 0 } },
        { "505": { "1": 99, "2": 98, "3": 97, "4": 96 } },
    );
    assert.equal(entries[0]?.graphicId, 45);
    assert.equal(entries[0]?.headGraphicId, 96);
});

test("terrain palette is unique and includes uploaded graphics", () => {
    const entries = buildTerrainEntries(
        { "1": { "1": { "1": { graphics: { "1": 100, "2": 200 } }, "2": { graphics: { "1": 100 } } } } },
        1,
        { "1000001": { numFrames: 1, numFile: "1000001", sX: 0, sY: 0, width: 32, height: 32, frames: { "1": "1000001" }, offset: { x: 0, y: 0 } } },
    );
    assert.deepEqual(entries.map((entry) => entry.id), ["100", "200", "1000001"]);
    assert.equal(entries[2]?.uploaded, true);
});

test("recent ids stay deduplicated, newest first, and bounded", () => {
    assert.deepEqual(updateRecentIds(["2", "1", "3"], "1", 3), ["1", "2", "3"]);
    assert.deepEqual(updateRecentIds(["3", "2", "1"], "4", 3), ["4", "3", "2"]);
});

test("uploaded previews use the game-data API while atlas graphics stay local", () => {
    assert.equal(getGraphicPreviewUrl(1_000_000, "1000000"), "/api/game-data/graphics/1000000.png");
    assert.equal(getGraphicPreviewUrl(999_999, "atlas-12"), "/graphics/atlas-12.png");
});

test("object entry ids remain numeric strings", () => {
    const entries = buildObjectEntries({
        "2": { name: "Espada", grhIndex: 504, objType: 2 },
        "1": { name: "Manzana", grhIndex: 506, objType: 1 },
    });
    assert.deepEqual(entries.map((entry) => entry.id), ["1", "2"]);
});
