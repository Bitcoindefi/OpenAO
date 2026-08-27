import { describe, it, expect } from "vitest";
import {
  MapPersistenceService,
  MapStorageFallbackReader
} from "../services/map-persistence-layer";

describe("Map Persistence & Revision Control Engine (Issue #3)", () => {
  const mockFallback: MapStorageFallbackReader = {
    readFromFile: (mapNum: number) => {
      if (mapNum === 34) {
        return {
          name: "Ullathorpe",
          terrainData: '{"palette": { "1": { "graphics": [100] } } }',
          npcsData: "[]"
        };
      }
      return null;
    }
  };

  it("Criterion 1: Idempotently imports map data without duplicate revisions", () => {
    const service = new MapPersistenceService(mockFallback);

    const firstImport = service.importMap(1, "Ixal", '{"tiles": []}', "[]", false);
    expect(firstImport.created).toBe(true);
    expect(service.getRevisions().length).toBe(1);

    const duplicateImport = service.importMap(1, "Ixal", '{"tiles": []}', "[]", false);
    expect(duplicateImport.created).toBe(false);
    expect(service.getRevisions().length).toBe(1); // Revision count unchanged
  });

  it("Criterion 2: Precedence fallback serves DB if exists, FS if not", () => {
    const service = new MapPersistenceService(mockFallback);

    // Map 34 not yet in DB, should resolve from FS
    const fsRead = service.getMapWithFallback(34);
    expect(fsRead.source).toBe("fs");
    expect(fsRead.map?.name).toBe("Ullathorpe");

    // Persist mutation for Map 34 into DB
    service.saveMapMutation(34, '{"modified": true}', "[]", "builder-acc");

    // Map 34 should now resolve with precedence from DB
    const dbRead = service.getMapWithFallback(34);
    expect(dbRead.source).toBe("db");
    expect(dbRead.map?.version).toBe(1);
    expect(dbRead.map?.terrainData).toContain("modified");
  });

  it("Criterion 3: Tracks checksum and revision history on mutations", () => {
    const service = new MapPersistenceService(mockFallback);
    service.saveMapMutation(1, '{"layer": 1}', "[]", "admin-1");
    service.saveMapMutation(1, '{"layer": 2}', "[]", "admin-2");

    const revisions = service.getRevisions();
    expect(revisions.length).toBe(2);
    expect(revisions[0].checksum).toBeDefined();
    expect(revisions[1].checksum).not.toBe(revisions[0].checksum);
  });
});
