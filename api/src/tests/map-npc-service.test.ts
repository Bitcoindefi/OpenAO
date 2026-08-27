import { describe, it, expect } from "vitest";
import {
  placeNpcOnMap,
  moveNpcOnMap,
  removeNpcFromMap,
  MapNpcStore,
  MapTerrainMeta,
  NPC_CONSTANTS
} from "../services/map-npc-service";

describe("Map NPC Placement & Movement API (Issue #8)", () => {
  const initialStore: MapNpcStore = {
    mapNum: 1,
    placements: []
  };

  const sampleTerrain: MapTerrainMeta = {
    blockedTiles: new Set(["50,50", "10,10"])
  };

  it("Criterion 1: Places an NPC with valid parameters successfully", () => {
    const res = placeNpcOnMap(initialStore, 25, 30, 15, 1, sampleTerrain);
    expect(res.success).toBe(true);
    expect(res.store?.placements.length).toBe(1);
    expect(res.placement?.npcIndex).toBe(15);
    expect(res.placement?.x).toBe(25);
    expect(res.placement?.y).toBe(30);
  });

  it("Criterion 2: Rejects invalid npcIndex outside 1-340 catalog bounds", () => {
    const res = placeNpcOnMap(initialStore, 25, 30, 999, 1, sampleTerrain);
    expect(res.success).toBe(false);
    expect(res.error).toContain("npcIndex inválido");
  });

  it("Criterion 3: Rejects placement on blocked terrain tiles", () => {
    const res = placeNpcOnMap(initialStore, 50, 50, 10, 1, sampleTerrain);
    expect(res.success).toBe(false);
    expect(res.error).toContain("bloqueada por el terreno");
  });

  it("Criterion 4: Rejects stacking multiple NPCs on the same tile", () => {
    const res1 = placeNpcOnMap(initialStore, 20, 20, 5, 1, sampleTerrain);
    expect(res1.success).toBe(true);

    const res2 = placeNpcOnMap(res1.store!, 20, 20, 8, 1, sampleTerrain);
    expect(res2.success).toBe(false);
    expect(res2.error).toContain("Ya existe un NPC");
  });

  it("Criterion 5: Moves an existing NPC cleanly to a new free tile", () => {
    const res1 = placeNpcOnMap(initialStore, 20, 20, 5, 1, sampleTerrain);
    const npcId = res1.placement!.id;

    const moveRes = moveNpcOnMap(res1.store!, npcId, 21, 20, sampleTerrain);
    expect(moveRes.success).toBe(true);
    expect(moveRes.placement?.x).toBe(21);
    expect(moveRes.placement?.y).toBe(20);
  });

  it("Criterion 6: Removes an NPC from the map", () => {
    const res1 = placeNpcOnMap(initialStore, 20, 20, 5, 1, sampleTerrain);
    const npcId = res1.placement!.id;

    const removeRes = removeNpcFromMap(res1.store!, npcId);
    expect(removeRes.success).toBe(true);
    expect(removeRes.store?.placements.length).toBe(0);
  });

  it("Criterion 7: Enforces max NPC capacity per map", () => {
    let currentStore = initialStore;
    for (let i = 1; i <= NPC_CONSTANTS.MAX_NPCS_PER_MAP; i++) {
      const res = placeNpcOnMap(currentStore, i, 1, 1, 1);
      expect(res.success).toBe(true);
      currentStore = res.store!;
    }

    const overflowRes = placeNpcOnMap(currentStore, 1, 2, 1, 1);
    expect(overflowRes.success).toBe(false);
    expect(overflowRes.error).toContain("Límite de NPCs alcanzado");
  });
});
