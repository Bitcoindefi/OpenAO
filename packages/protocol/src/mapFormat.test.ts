import { describe, expect, it } from "vitest";
import {
    convertClassicTilesToOpenAo,
    convertLambdaClassMapToOpenAo,
    encodeClassicBinaryMap,
    parseClassicBinaryMap,
    type AoClassicTile,
} from "./mapFormat.js";

describe("Argentum Online Map Format Clean-Room Specs & Conversions", () => {
    it("encodes and parses binary .map format with full fidelity", () => {
        const header = { version: 1, name: "Mapa de Prueba" };
        const tiles: AoClassicTile[] = [
            { x: 1, y: 1, blocked: false, layer1: 5500 },
            { x: 2, y: 1, blocked: true, layer1: 5500, layer2: 581, trigger: 1 },
            { x: 3, y: 1, blocked: false, layer1: 5500, layer3: 4894, layer4: 6001, trigger: 4 },
        ];

        const encoded = encodeClassicBinaryMap(header, tiles);
        expect(encoded.length).toBeGreaterThan(265);

        const decoded = parseClassicBinaryMap(encoded);
        expect(decoded.header.version).toBe(1);
        expect(decoded.header.name).toBe("Mapa de Prueba");
        expect(decoded.tiles.length).toBe(3);

        expect(decoded.tiles[0]).toEqual({ x: 1, y: 1, blocked: false, layer1: 5500 });
        expect(decoded.tiles[1]).toEqual({ x: 2, y: 1, blocked: true, layer1: 5500, layer2: 581, trigger: 1 });
        expect(decoded.tiles[2]).toEqual({ x: 3, y: 1, blocked: false, layer1: 5500, layer3: 4894, layer4: 6001, trigger: 4 });
    });

    it("converts classic tiles into OpenAO palette terrain and specials", () => {
        const tiles: AoClassicTile[] = [
            { x: 1, y: 1, blocked: false, layer1: 5500 },
            { x: 2, y: 1, blocked: false, layer1: 5500 }, // same palette entry as 1,1
            { x: 3, y: 1, blocked: true, layer1: 5500, layer2: 581, trigger: 1 },
            { x: 4, y: 1, blocked: false, layer1: 5500, layer4: 7000, exit: { map: 5, x: 10, y: 20 } },
        ];

        const { terrain, specials } = convertClassicTilesToOpenAo(42, tiles);

        expect(terrain.id).toBe(42);
        expect(terrain.width).toBe(100);
        expect(terrain.height).toBe(100);

        // Tiles (1,1) and (2,1) should share palette ID 1
        const paletteId1 = terrain.rows[0][0];
        const paletteId2 = terrain.rows[0][1];
        expect(paletteId1).toBe(paletteId2);
        expect(terrain.palette[String(paletteId1)]).toEqual({
            graphics: [5500],
        });

        // Tile (3,1) should have blocked: true and trigger 1
        const paletteId3 = terrain.rows[0][2];
        expect(terrain.palette[String(paletteId3)]).toEqual({
            graphics: [5500, 581],
            blocked: true,
        });
        expect(specials.triggers["3,1"]).toBe(1);

        // Tile (4,1) should have layer 4 with null layers 2 & 3 and exit
        const paletteId4 = terrain.rows[0][3];
        expect(terrain.palette[String(paletteId4)]).toEqual({
            graphics: [5500, null, null, 7000],
        });
        expect(specials.exits["4,1"]).toEqual({ map: 5, x: 10, y: 20 });
    });

    it("converts LambdaClass JSON map format into OpenAO modular JSON format", () => {
        const lambdaMap = {
            id: 10,
            tiles: [
                { x: 1, y: 1, layers: [5500, 0, 0, 0], blocked: false, trigger: null },
                { x: 2, y: 1, layers: [5500, 581, 0, 0], blocked: true, trigger: 2 },
            ],
        };

        const { terrain, specials } = convertLambdaClassMapToOpenAo(lambdaMap);

        expect(terrain.id).toBe(10);
        expect(specials.triggers["2,1"]).toBe(2);
        const palId = terrain.rows[0][1];
        expect(terrain.palette[String(palId)]).toEqual({
            graphics: [5500, 581],
            blocked: true,
        });
    });
});
