import { describe, it, expect } from "vitest";
import {
  paintSingleTile,
  paintRectangle,
  setRectangleBlocked,
  getRegionTiles,
  TerrainMapData
} from "../services/map-terrain-paint";

describe("Map Terrain Floor Painting & Collision Mutation API (Issue #7)", () => {
  const initialMap: TerrainMapData = {
    mapId: 1,
    palette: [100, 200, 300, 400],
    tiles: new Map()
  };

  it("Criterion 1: Paints a single tile using a valid palette index", () => {
    const res = paintSingleTile(initialMap, 50, 50, 2, false);
    expect(res.success).toBe(true);
    const tile = res.updatedMap?.tiles.get("50,50");
    expect(tile?.layer1).toBe(300); // palette[2]
    expect(tile?.blocked).toBe(false);
  });

  it("Criterion 2: Rejects invalid palette index and coordinates", () => {
    const invCoord = paintSingleTile(initialMap, 150, 50, 0);
    expect(invCoord.success).toBe(false);
    expect(invCoord.error).toContain("fuera de límites");

    const invPal = paintSingleTile(initialMap, 50, 50, 99);
    expect(invPal.success).toBe(false);
    expect(invPal.error).toContain("no existe");
  });

  it("Criterion 3: Paints a 20x20 rectangle atomically in a single operation", () => {
    const res = paintRectangle(initialMap, 10, 10, 29, 29, 1, false);
    expect(res.success).toBe(true);
    expect(res.tilesAffected).toBe(400); // 20x20 = 400 tiles

    // Query region to verify
    const region = getRegionTiles(res.updatedMap!, 10, 10, 29, 29);
    expect(region.length).toBe(400);
    expect(region.every(t => t.layer1 === 200)).toBe(true);
  });

  it("Criterion 4: Enforces atomic bounds limit per operation (max 30x30)", () => {
    const overflow = paintRectangle(initialMap, 1, 1, 50, 50, 0);
    expect(overflow.success).toBe(false);
    expect(overflow.error).toContain("supera el límite");
  });

  it("Criterion 5: Sets collision blockage flag across region", () => {
    const res = setRectangleBlocked(initialMap, 40, 40, 42, 42, true);
    expect(res.success).toBe(true);
    const region = getRegionTiles(res.updatedMap!, 40, 40, 42, 42);
    expect(region.every(t => t.blocked === true)).toBe(true);
  });
});
