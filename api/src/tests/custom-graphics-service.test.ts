import { describe, it, expect } from "vitest";
import {
  CustomGraphicsRegistry,
  GRAPHIC_ID_RANGES,
  MapTerrainPaletteStore
} from "../services/custom-graphics-service";

describe("Custom Graphics Registration & Palette Extension (Issue #6)", () => {
  it("Criterion 1: Assigns graphic IDs strictly within the reserved custom range (50000-99999)", () => {
    const registry = new CustomGraphicsRegistry();
    const entry1 = registry.registerGraphic("custom_stone_floor.png", 32, 32, "acc-1");
    expect(entry1.grhId).toBe(GRAPHIC_ID_RANGES.CUSTOM_MIN);
    expect(entry1.grhId).toBe(50000);

    const entry2 = registry.registerGraphic("custom_wooden_door.png", 32, 32, "acc-1");
    expect(entry2.grhId).toBe(50001);
  });

  it("Criterion 2: Validates graphic IDs against official and custom ranges", () => {
    const registry = new CustomGraphicsRegistry();
    const customEntry = registry.registerGraphic("lava_tile.png", 32, 32);

    expect(registry.isValidGraphicId(500)).toBe(true); // Official graphic
    expect(registry.isValidGraphicId(customEntry.grhId)).toBe(true); // Custom graphic
    expect(registry.isValidGraphicId(999999)).toBe(false); // Non-existent graphic
  });

  it("Criterion 3: Adds new valid palette entry to terrain palette", () => {
    const registry = new CustomGraphicsRegistry();
    const customGrass = registry.registerGraphic("alien_grass.png", 32, 32);

    const store: MapTerrainPaletteStore = {
      mapId: 1,
      palette: {
        "1": { graphics: [1000], blocked: false }
      }
    };

    const res = registry.addPaletteEntry(store, "2", [customGrass.grhId, 500], true);
    expect(res.success).toBe(true);
    expect(res.store?.palette["2"]).toEqual({
      graphics: [customGrass.grhId, 500],
      blocked: true
    });
  });

  it("Criterion 4: Rejects palette entry referencing non-existent graphic ID", () => {
    const registry = new CustomGraphicsRegistry();
    const store: MapTerrainPaletteStore = {
      mapId: 1,
      palette: {}
    };

    const res = registry.addPaletteEntry(store, "5", [88888], false);
    expect(res.success).toBe(false);
    expect(res.error).toContain("no existe en el catálogo");
  });
});
