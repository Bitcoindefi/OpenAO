import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    convertSourceMapToVb6,
    convertVb6ToSourceMap,
    encodeVb6BinaryMap,
    decodeVb6BinaryMap,
    type LegacyTile,
    type SourceMeta,
    type SourceTerrain,
    type SourceSpecials,
} from "../scripts/legacyMapConverter";

describe("Legacy VB6 Argentum Online Map Converter (OpenAO #23)", () => {
    it("should encode and decode binary VB6 .map accurately", () => {
        const sampleTiles: LegacyTile[][] = [];
        for (let y = 1; y <= 100; y++) {
            sampleTiles[y] = [];
            for (let x = 1; x <= 100; x++) {
                sampleTiles[y][x] = {
                    blocked: x === y,
                    layer1: x * 10,
                    layer2: y === 50 ? 500 : 0,
                    layer3: 0,
                    layer4: 0,
                    trigger: x === 10 && y === 10 ? 6 : 0,
                };
            }
        }

        const encoded = encodeVb6BinaryMap(sampleTiles, "Ullathorpe Test");
        expectMapHeaderValid(encoded);

        const decoded = decodeVb6BinaryMap(encoded);
        assert.equal(decoded.header, "Ullathorpe Test");
        assert.equal(decoded.tiles[10][10].blocked, true);
        assert.equal(decoded.tiles[10][10].layer1, 100);
        assert.equal(decoded.tiles[10][10].trigger, 6);
        assert.equal(decoded.tiles[50][1].layer2, 500);
    });

    it("should perform full round-trip conversion from JSON to VB6 and back to JSON", () => {
        const meta: SourceMeta = {
            id: 1,
            name: "Ullathorpe",
            musicNum: 1,
            magiaSinEfecto: 0,
            noEncriptarMp: 0,
            terreno: "BOSQUE",
            zona: "CIUDAD",
            restringir: "No",
            minLevel: 1,
            maxLevel: 50,
            backup: 0,
            pk: 0,
        };

        const terrain: SourceTerrain = {
            id: 1,
            width: 100,
            height: 100,
            palette: {
                "1": { graphics: 100, blocked: true },
                "2": { graphics: [200, 300, null, null] },
            },
            rows: Array.from({ length: 100 }, () => Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 1 : 2))),
        };

        const specials: SourceSpecials = {
            id: 1,
            exits: {},
            objects: {},
            npcs: {},
            triggers: { "15,25": 5 },
        };

        const vb6 = convertSourceMapToVb6(meta, terrain, specials);
        assert.ok(vb6.mapBuffer.length > 100000);
        assert.ok(vb6.datText.includes("Name=Ullathorpe"));
        assert.ok(vb6.datText.includes("Terreno=BOSQUE"));

        const restored = convertVb6ToSourceMap(1, vb6.mapBuffer, vb6.datText);
        assert.equal(restored.meta.name, "Ullathorpe");
        assert.equal(restored.meta.terreno, "BOSQUE");
        assert.equal(restored.specials.triggers["15,25"], 5);
        assert.equal(restored.terrain.width, 100);
        assert.equal(restored.terrain.height, 100);
    });

    it("should safely encode large graphic indices (> 32767) without throwing RangeError", () => {
        const sampleTiles: LegacyTile[][] = [];
        for (let y = 1; y <= 100; y++) {
            sampleTiles[y] = [];
            for (let x = 1; x <= 100; x++) {
                sampleTiles[y][x] = {
                    blocked: false,
                    layer1: 320151, // high OpenAO asset index
                    layer2: 1000500, // custom uploaded graphic index
                    layer3: 0,
                    layer4: 0,
                    trigger: 0,
                };
            }
        }

        // Must not throw RangeError: The value of "value" is out of range
        const encoded = encodeVb6BinaryMap(sampleTiles, "Large Index Map");
        assert.equal(encoded.length, 261 + 100 * 100 * 11);
        expectMapHeaderValid(encoded);

        const decoded = decodeVb6BinaryMap(encoded);
        assert.equal(decoded.tiles[1][1].layer1, 32767);
        assert.equal(decoded.tiles[1][1].layer2, 32767);
    });
});

function expectMapHeaderValid(buf: Buffer) {
    assert.equal(buf.readInt16LE(0), 1);
}
