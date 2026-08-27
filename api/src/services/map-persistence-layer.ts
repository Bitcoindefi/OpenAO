import * as crypto from "crypto";

/**
 * Map Persistence & Revision Control Engine (Modo Construcción - Etapa 0)
 * Resolves Issue #3: Capa de persistencia de ediciones de mapa ($100 USD)
 */

export interface GameMapRecord {
  mapNum: number;
  name: string;
  isPk: boolean;
  musicNumber: number;
  zone: string;
  version: number;
  terrainData: string; // JSON encoded terrain / palette
  npcsData: string;    // JSON encoded NPC placements
  checksum: string;
  updatedAt: Date;
}

export interface GameDataRevision {
  id: string;
  kind: "map" | "object" | "npc" | "spell";
  entityId: string;
  action: "create" | "update" | "delete" | "import";
  checksum: string;
  revisionNumber: number;
  authorAccountId?: string;
  timestamp: Date;
}

export interface MapStorageFallbackReader {
  readFromFile: (mapNum: number) => { name: string; terrainData: string; npcsData: string } | null;
}

export class MapPersistenceService {
  private dbMaps = new Map<number, GameMapRecord>();
  private revisions: GameDataRevision[] = [];
  private fallbackReader?: MapStorageFallbackReader;

  constructor(fallbackReader?: MapStorageFallbackReader) {
    this.fallbackReader = fallbackReader;
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Idempotently imports or seeds a map into the persistence store.
   */
  importMap(
    mapNum: number,
    name: string,
    terrainData: string,
    npcsData: string,
    isPk: boolean = false,
    musicNumber: number = 1,
    zone: string = "general"
  ): { created: boolean; record: GameMapRecord } {
    const combinedContent = `${mapNum}:${name}:${terrainData}:${npcsData}`;
    const checksum = this.calculateChecksum(combinedContent);
    const existing = this.dbMaps.get(mapNum);

    if (existing && existing.checksum === checksum) {
      return { created: false, record: existing };
    }

    const version = existing ? existing.version + 1 : 1;
    const record: GameMapRecord = {
      mapNum,
      name,
      isPk,
      musicNumber,
      zone,
      version,
      terrainData,
      npcsData,
      checksum,
      updatedAt: new Date()
    };

    this.dbMaps.set(mapNum, record);

    this.revisions.push({
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      kind: "map",
      entityId: `map-${mapNum}`,
      action: existing ? "update" : "import",
      checksum,
      revisionNumber: this.revisions.length + 1,
      timestamp: new Date()
    });

    return { created: true, record };
  }

  /**
   * Reads a map with DB-first precedence, falling back to disk if not yet edited/persisted in DB.
   */
  getMapWithFallback(mapNum: number): { source: "db" | "fs" | "not_found"; map?: Partial<GameMapRecord> } {
    if (this.dbMaps.has(mapNum)) {
      return { source: "db", map: this.dbMaps.get(mapNum) };
    }

    if (this.fallbackReader) {
      const fileData = this.fallbackReader.readFromFile(mapNum);
      if (fileData) {
        return {
          source: "fs",
          map: {
            mapNum,
            name: fileData.name,
            terrainData: fileData.terrainData,
            npcsData: fileData.npcsData,
            version: 0
          }
        };
      }
    }

    return { source: "not_found" };
  }

  /**
   * Persists an in-game editor mutation, incrementing version and generating a revision log.
   */
  saveMapMutation(
    mapNum: number,
    terrainData: string,
    npcsData: string,
    authorAccountId: string
  ): GameMapRecord {
    const existing = this.dbMaps.get(mapNum);
    const combinedContent = `${mapNum}:${existing?.name || "Mapa " + mapNum}:${terrainData}:${npcsData}`;
    const checksum = this.calculateChecksum(combinedContent);

    const updatedRecord: GameMapRecord = {
      mapNum,
      name: existing?.name || `Mapa ${mapNum}`,
      isPk: existing?.isPk ?? false,
      musicNumber: existing?.musicNumber ?? 1,
      zone: existing?.zone ?? "general",
      version: (existing?.version ?? 0) + 1,
      terrainData,
      npcsData,
      checksum,
      updatedAt: new Date()
    };

    this.dbMaps.set(mapNum, updatedRecord);

    this.revisions.push({
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      kind: "map",
      entityId: `map-${mapNum}`,
      action: "update",
      checksum,
      revisionNumber: this.revisions.length + 1,
      authorAccountId,
      timestamp: new Date()
    });

    return updatedRecord;
  }

  getRevisions(): GameDataRevision[] {
    return this.revisions;
  }
}
