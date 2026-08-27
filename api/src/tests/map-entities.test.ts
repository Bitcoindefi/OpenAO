import { describe, it, expect } from "vitest";
import {
  placeGroundItem,
  placeDoor,
  toggleDoor,
  placeStructure,
  MapEntityStore
} from "../services/map-entities";

describe("Map Objects, Structures & Doors Management (Issue #9)", () => {
  const initialStore: MapEntityStore = {
    mapId: 1,
    items: [],
    doors: [],
    signs: [],
    structures: []
  };

  it("Criterion 1: Places a valid ground item from catalog", () => {
    const res = placeGroundItem(initialStore, 50, 50, 100, 5);
    expect(res.success).toBe(true);
    expect(res.store?.items.length).toBe(1);
    expect(res.item?.objIndex).toBe(100);
    expect(res.item?.amount).toBe(5);
  });

  it("Criterion 2: Rejects invalid objIndex outside catalog bounds", () => {
    const res = placeGroundItem(initialStore, 50, 50, 9999, 1);
    expect(res.success).toBe(false);
    expect(res.error).toContain("objIndex inválido");
  });

  it("Criterion 3: Doors manage tile blockage dynamically based on open/closed state", () => {
    // Place closed door
    const doorRes = placeDoor(initialStore, 20, 20, false);
    expect(doorRes.success).toBe(true);
    expect(doorRes.isTileBlocked).toBe(true);

    // Toggle door open
    const toggleRes = toggleDoor(doorRes.store, 20, 20);
    expect(toggleRes.success).toBe(true);
    expect(toggleRes.isOpen).toBe(true);
    expect(toggleRes.isTileBlocked).toBe(false); // Unblocked when open

    // Toggle back closed
    const toggleClosed = toggleDoor(toggleRes.store!, 20, 20);
    expect(toggleClosed.isOpen).toBe(false);
    expect(toggleClosed.isTileBlocked).toBe(true);
  });

  it("Criterion 4: Places multi-tile structure atomically across grid", () => {
    const res = placeStructure(initialStore, 30, 30, 3, 2, 1500, 0, true);
    expect(res.success).toBe(true);
    expect(res.tiles?.length).toBe(6); // 3x2 = 6 tiles
    expect(res.store?.structures.length).toBe(6);

    // Check bounds violation
    const overflowRes = placeStructure(initialStore, 99, 99, 4, 4, 1500, 0);
    expect(overflowRes.success).toBe(false);
    expect(overflowRes.error).toContain("límites");
  });
});
