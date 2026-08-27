import { describe, it, expect } from "vitest";
import {
  isUserMap,
  validateAccountMapQuota,
  validateMapDensity,
  canEditUserMap,
  canViewUserMap,
  UserMapRecord
} from "../services/user-map-space";

describe("Isolated User Map Space & Quota Controls (Issue #24)", () => {
  const aliceMap: UserMapRecord = {
    mapId: 1050,
    ownerAccountId: "acc-alice",
    name: "La Cabaña de Alice",
    state: "DRAFT",
    npcCount: 10,
    objectCount: 50,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it("Criterion 1: Maps within 1000-1999 are properly identified as user maps", () => {
    expect(isUserMap(1050)).toBe(true);
    expect(isUserMap(1)).toBe(false);   // Official map
    expect(isUserMap(550)).toBe(false); // Static local map
    expect(isUserMap(2500)).toBe(false);// Challenge map
  });

  it("Criterion 2: Only the owner account can edit their map", () => {
    // Alice can edit her own map
    const aliceRes = canEditUserMap("acc-alice", aliceMap);
    expect(aliceRes.allowed).toBe(true);
    expect(aliceRes.statusCode).toBe(200);

    // Bob cannot edit Alice's map
    const bobRes = canEditUserMap("acc-bob", aliceMap);
    expect(bobRes.allowed).toBe(false);
    expect(bobRes.statusCode).toBe(403);
    expect(bobRes.reason).toContain("pertenece a otro usuario");
  });

  it("Criterion 3: Account map quota limits prevent spam (max 5 maps)", () => {
    expect(validateAccountMapQuota(3).allowed).toBe(true);
    expect(validateAccountMapQuota(5).allowed).toBe(false);
    expect(validateAccountMapQuota(5).reason).toContain("cuota máxima");
  });

  it("Criterion 4: Density quotas protect server performance (NPCs and objects)", () => {
    expect(validateMapDensity(10, 50).allowed).toBe(true);
    expect(validateMapDensity(55, 50).allowed).toBe(false); // > 50 NPCs
    expect(validateMapDensity(10, 250).allowed).toBe(false); // > 200 Objects
  });

  it("Criterion 5: Draft maps are invisible to other players until published", () => {
    // Alice sees her draft
    expect(canViewUserMap("acc-alice", aliceMap)).toBe(true);
    // Bob does not see Alice's draft
    expect(canViewUserMap("acc-bob", aliceMap)).toBe(false);

    // Published map is visible to everyone
    const publishedMap: UserMapRecord = { ...aliceMap, state: "PUBLISHED" };
    expect(canViewUserMap("acc-bob", publishedMap)).toBe(true);
  });
});
