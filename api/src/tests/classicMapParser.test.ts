import { describe, expect, it } from "vitest";
import {
    ClassicMapData,
    ClassicTile,
    convertClassicToOpenAO,
    convertOpenAOToClassic,
    encodeClassicMapBuffer,
    parseClassicDatText,
    parseClassicInfText,
    parseClassicMapBuffer,
    validateRoundTrip,
} from "../lib/classicMapParser";

describe("Classic Map Importer / Exporter (Issue #23)", () => {
    it("should correctly parse and encode binary .map format", () => {
        const dummyTiles: ClassicTile[][] = [];
        for (let y = 1; y <= 100; y++) {
            const row: ClassicTile[] = [];
            for (let x = 1; x <= 100; x++) {
                row.push({
                    x,
                    y,
                    blocked: (x + y) % 2 === 0,
                    layer1: x * 10,
                    layer2: y * 5,
                    layer3: 0,
                    layer4: 0,
                    trigger: (x === 10 && y === 10) ? 1 : 0,
                });
            }
            dummyTiles.push(row);
        }

        const header = { version: 1, mapNum: 42, name: "Test World" };
        const buffer = encodeClassicMapBuffer(header, dummyTiles);

        const parsed = parseClassicMapBuffer(buffer);

        expect(parsed.header.version).toBe(1);
        expect(parsed.header.mapNum).toBe(42);
        expect(parsed.header.name).toBe("Test World");
        expect(parsed.tiles.length).toBe(100);
        expect(parsed.tiles[0].length).toBe(100);
        expect(parsed.tiles[9][9].trigger).toBe(1);
        expect(parsed.tiles[0][0].layer1).toBe(10);
    });

    it("should parse classic .inf INI format for exits, objects, and NPCs", () => {
        const infText = `
[10-15]
OBJ=148,2
NPC=536
EXIT=5-12-90
`;
        const parsed = parseClassicInfText(infText);

        expect(parsed.objects["10,15"]).toEqual({ objIndex: 148, amount: 2 });
        expect(parsed.npcs["10,15"]).toEqual({ npcIndex: 536 });
        expect(parsed.exits["10,15"]).toEqual({ map: 5, x: 12, y: 90 });
    });

    it("should parse classic .dat header metadata INI format", () => {
        const datText = `
[MAPA1]
Name=Ciudad de Ullathorpe
MusicNum=4
Terreno=BOSQUE
Pk=1
`;
        const metadata = parseClassicDatText(datText);

        expect(metadata.Name).toBe("Ciudad de Ullathorpe");
        expect(metadata.MusicNum).toBe(4);
        expect(metadata.Terreno).toBe("BOSQUE");
        expect(metadata.Pk).toBe(1);
    });

    it("should convert classic map format into OpenAO schema and generate an audit report", () => {
        const tiles: ClassicTile[][] = [];
        for (let y = 1; y <= 100; y++) {
            const row: ClassicTile[] = [];
            for (let x = 1; x <= 100; x++) {
                row.push({
                    x,
                    y,
                    blocked: false,
                    layer1: 100,
                    layer2: 0,
                    layer3: 0,
                    layer4: 0,
                    trigger: 0,
                });
            }
            tiles.push(row);
        }

        const classicData: ClassicMapData = {
            header: { version: 1, mapNum: 1, name: "Ullathorpe" },
            tiles,
            exits: { "50,50": { map: 2, x: 10, y: 20 } },
            objects: { "30,30": { objIndex: 148, amount: 1 } },
            npcs: { "15,15": { npcIndex: 536 } },
            metadata: { Name: "Ullathorpe", MusicNum: 4, Terreno: "BOSQUE" },
        };

        const { bundle, report } = convertClassicToOpenAO(classicData);

        expect(bundle.meta.id).toBe(1);
        expect(bundle.meta.name).toBe("Ullathorpe");
        expect(bundle.npcs[0]).toEqual({ mapNum: 1, x: 15, y: 15, npcIndex: 536 });
        expect(bundle.specials.exits?.["50,50"]).toEqual({ map: 2, x: 10, y: 20 });
        expect(bundle.specials.objects?.["30,30"]).toEqual({ objIndex: 148, amount: 1 });
        expect(report.success).toBe(true);
        expect(report.translatedTiles).toBe(10000);
    });

    it("should support graphics index remapping and track shifted graphics in audit report", () => {
        const tiles: ClassicTile[][] = [];
        for (let y = 1; y <= 100; y++) {
            const row: ClassicTile[] = [];
            for (let x = 1; x <= 100; x++) {
                row.push({
                    x,
                    y,
                    blocked: false,
                    layer1: (x === 1 && y === 1) ? 999 : 100,
                    layer2: 0,
                    layer3: 0,
                    layer4: 0,
                    trigger: 0,
                });
            }
            tiles.push(row);
        }

        const classicData: ClassicMapData = {
            header: { version: 1, mapNum: 1, name: "Shift Test" },
            tiles,
            exits: {},
            objects: {},
            npcs: {},
            metadata: {},
        };

        const graphicsMapping = { 999: 1200 }; // Remap old graphic 999 to 1200
        const { bundle, report } = convertClassicToOpenAO(classicData, graphicsMapping);

        expect(bundle.terrain[0][0][0]).toBe(1200);
        expect(report.skippedOrShiftedGraphics.length).toBe(1);
        expect(report.skippedOrShiftedGraphics[0]).toEqual({
            tile: "1,1",
            layer: 1,
            originalId: 999,
            mappedId: 1200,
        });
    });

    it("should pass round-trip validation (Classic -> OpenAO -> Classic)", () => {
        const tiles: ClassicTile[][] = [];
        for (let y = 1; y <= 100; y++) {
            const row: ClassicTile[] = [];
            for (let x = 1; x <= 100; x++) {
                row.push({
                    x,
                    y,
                    blocked: false,
                    layer1: 50,
                    layer2: 0,
                    layer3: 0,
                    layer4: 0,
                    trigger: (x === 5 && y === 5) ? 2 : 0,
                });
            }
            tiles.push(row);
        }

        const originalData: ClassicMapData = {
            header: { version: 1, mapNum: 1, name: "Round Trip Test" },
            tiles,
            exits: { "12,12": { map: 3, x: 4, y: 5 } },
            objects: { "20,20": { objIndex: 50, amount: 5 } },
            npcs: { "10,10": { npcIndex: 24 } },
            metadata: { Name: "Round Trip Test" },
        };

        const { valid, differences } = validateRoundTrip(originalData);
        expect(valid).toBe(true);
        expect(differences).toEqual([]);

        const bundle = convertClassicToOpenAO(originalData).bundle;
        const reexported = convertOpenAOToClassic(bundle);

        expect(reexported.exits["12,12"]).toEqual({ map: 3, x: 4, y: 5 });
        expect(reexported.objects["20,20"]).toEqual({ objIndex: 50, amount: 5 });
        expect(reexported.npcs["10,10"]).toEqual({ npcIndex: 24 });
    });
});
