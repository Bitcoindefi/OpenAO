import { describe, it, expect } from "vitest";
import {
  addOrUpdateExit,
  addBidirectionalExit,
  removeExit,
  findUnreachableMaps,
  MapSpecials,
  MapMetadata
} from "../services/map-exits";

describe("Map Exits & World Graph Connection Service (Issue #10)", () => {
  const map1Specials: MapSpecials = {
    id: 1,
    exits: {
      "9,7": { map: 5, x: 9, y: 93 }
    }
  };

  const map5Specials: MapSpecials = {
    id: 5,
    exits: {}
  };

  const availableMaps = new Map<number, MapMetadata>([
    [1, { id: 1, name: "Ullathorpe" }],
    [
      5,
      {
        id: 5,
        name: "Bosque Norte",
        tiles: {
          "9,93": { blocked: false },
          "50,50": { blocked: true } // Blocked wall tile
        }
      }
    ]
  ]);

  it("Criterion 1: Successfully adds a valid exit between existing maps", () => {
    const res = addOrUpdateExit(map1Specials, 10, 7, 5, 9, 93, availableMaps);
    expect(res.success).toBe(true);
    expect(res.exits?.["10,7"]).toEqual({ map: 5, x: 9, y: 93 });
  });

  it("Criterion 2: Rejects an exit to a non-existent map", () => {
    const res = addOrUpdateExit(map1Specials, 10, 7, 999, 9, 93, availableMaps);
    expect(res.success).toBe(false);
    expect(res.error).toContain("no existe");
  });

  it("Criterion 3: Rejects an exit pointing to a blocked tile", () => {
    const res = addOrUpdateExit(map1Specials, 10, 7, 5, 50, 50, availableMaps);
    expect(res.success).toBe(false);
    expect(res.error).toContain("está bloqueada");
  });

  it("Criterion 4: Creates paired bidirectional exits in a single operation", () => {
    const res = addBidirectionalExit(
      map1Specials,
      50,
      1,
      map5Specials,
      50,
      100,
      availableMaps
    );

    expect(res.success).toBe(true);
    expect(res.mapAExits?.["50,1"]).toEqual({ map: 5, x: 50, y: 100 });
    expect(res.mapBExits?.["50,100"]).toEqual({ map: 1, x: 50, y: 1 });
  });

  it("Criterion 5: Removes an exit properly", () => {
    const res = removeExit(map1Specials, 9, 7);
    expect(res.success).toBe(true);
    expect(res.exits["9,7"]).toBeUndefined();
  });

  it("Criterion 6: Graph check identifies unreachable disconnected maps", () => {
    const map99Specials: MapSpecials = { id: 99, exits: {} };
    const all = [map1Specials, map5Specials, map99Specials];

    const audit = findUnreachableMaps(all, 1);
    expect(audit.unreachableMapIds).toContain(99);
    expect(audit.unreachableMapIds).not.toContain(5); // Map 5 has inbound exit from Map 1
  });
});
