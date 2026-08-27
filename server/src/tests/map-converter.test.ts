import { describe, it, expect } from "vitest";
import { importClassicMap, exportClassicMap, OpenAOMapData } from "../tools/map-converter";

describe("Classic WorldEditor Map Importer & Exporter (Issue #23)", () => {
  it("Imports a classic map correctly and preserves tile attributes", () => {
    // Generate synthetic 100x100 classic map binary
    const sampleMap: OpenAOMapData = {
      mapNumber: 1,
      width: 100,
      height: 100,
      tiles: []
    };

    for (let x = 0; x < 100; x++) {
      sampleMap.tiles[x] = [];
      for (let y = 0; y < 100; y++) {
        sampleMap.tiles[x][y] = {
          blocked: (x === 50 && y === 50),
          layer1: 1000,
          layer2: (x === 10 && y === 10) ? 200 : 0,
          layer3: 0,
          layer4: 0,
          trigger: (x === 5 && y === 5) ? 1 : 0
        };
      }
    }

    const exportedBuffer = exportClassicMap(sampleMap);
    expect(exportedBuffer.length).toBeGreaterThan(1000);

    const { mapData, report } = importClassicMap(exportedBuffer, 1);
    expect(report.success).toBe(true);
    expect(report.translatedTiles).toBe(10000);

    // Verify specific tiles
    expect(mapData.tiles[50][50].blocked).toBe(true);
    expect(mapData.tiles[50][50].layer1).toBe(1000);
    expect(mapData.tiles[10][10].layer2).toBe(200);
    expect(mapData.tiles[5][5].trigger).toBe(1);
  });

  it("Roundtrip export and re-import produces identical map data", () => {
    const original: OpenAOMapData = {
      mapNumber: 50,
      width: 100,
      height: 100,
      tiles: []
    };

    for (let x = 0; x < 100; x++) {
      original.tiles[x] = [];
      for (let y = 0; y < 100; y++) {
        original.tiles[x][y] = {
          blocked: x % 2 === 0,
          layer1: 1500 + x,
          layer2: y % 3 === 0 ? 300 : 0,
          layer3: 0,
          layer4: 0,
          trigger: 0
        };
      }
    }

    const binary = exportClassicMap(original);
    const reimported = importClassicMap(binary, 50);

    expect(reimported.mapData.tiles[0][0]).toEqual(original.tiles[0][0]);
    expect(reimported.mapData.tiles[10][9]).toEqual(original.tiles[10][9]);
    expect(reimported.mapData.tiles[99][99]).toEqual(original.tiles[99][99]);
  });
});
