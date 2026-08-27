/**
 * Clean-Room Classic WorldEditor Map (.map / .inf) Importer and Exporter
 * Resolves Issue #23: Etapa 2: importar y exportar mapas del editor oficial de escritorio ($100 USD)
 * 
 * Clean-room specification: Binary format derived purely from public file structure specifications.
 * No AGPL-3.0 source code from legacy VB6 world editor is reproduced here.
 */

export interface OpenAOMapTile {
  blocked: boolean;
  layer1: number;
  layer2: number;
  layer3: number;
  layer4: number;
  trigger: number;
  objIndex?: number;
  objAmount?: number;
  npcIndex?: number;
}

export interface OpenAOMapData {
  mapNumber: number;
  width: number;
  height: number;
  name?: string;
  tiles: OpenAOMapTile[][];
}

export interface ConversionReport {
  success: boolean;
  warnings: string[];
  translatedTiles: number;
  unmappedTriggers: number;
}

/**
 * Imports a classic binary .map file into OpenAO structured map format.
 * Format specification:
 * - Header: 263 bytes (version, map name)
 * - Grid: 100x100 tiles (1-indexed, total 10,000 tiles)
 * - Per tile: flags (1 byte), layer1 (2 bytes), layer2 (2 bytes), layer3 (2 bytes), layer4 (2 bytes), trigger (2 bytes)
 */
export function importClassicMap(
  mapBuffer: Buffer,
  mapNumber: number = 1
): { mapData: OpenAOMapData; report: ConversionReport } {
  const warnings: string[] = [];
  const width = 100;
  const height = 100;
  let offset = 0;

  // Header parsing
  const mapVersion = mapBuffer.length >= 2 ? mapBuffer.readInt16LE(0) : 0;
  offset = 263; // Standard header size in legacy maps, fallback to 0 if buffer is raw tiles
  if (mapBuffer.length < offset + width * height * 2) {
    offset = 0;
  }

  const tiles: OpenAOMapTile[][] = [];
  let unmappedTriggers = 0;
  let translatedTiles = 0;

  for (let x = 0; x < width; x++) {
    tiles[x] = [];
    for (let y = 0; y < height; y++) {
      if (offset + 10 <= mapBuffer.length) {
        const flags = mapBuffer.readUInt8(offset);
        const blocked = (flags & 0x01) !== 0;
        offset += 1;

        const layer1 = mapBuffer.readUInt16LE(offset);
        offset += 2;

        const layer2 = (flags & 0x02) ? mapBuffer.readUInt16LE(offset) : 0;
        if (flags & 0x02) offset += 2;

        const layer3 = (flags & 0x04) ? mapBuffer.readUInt16LE(offset) : 0;
        if (flags & 0x04) offset += 2;

        const layer4 = (flags & 0x08) ? mapBuffer.readUInt16LE(offset) : 0;
        if (flags & 0x08) offset += 2;

        const trigger = (flags & 0x10) ? mapBuffer.readUInt16LE(offset) : 0;
        if (flags & 0x10) offset += 2;

        if (trigger > 6) {
          unmappedTriggers++;
        }

        tiles[x][y] = {
          blocked,
          layer1,
          layer2,
          layer3,
          layer4,
          trigger
        };
        translatedTiles++;
      } else {
        tiles[x][y] = {
          blocked: false,
          layer1: 1,
          layer2: 0,
          layer3: 0,
          layer4: 0,
          trigger: 0
        };
      }
    }
  }

  if (unmappedTriggers > 0) {
    warnings.push(`Se detectaron ${unmappedTriggers} triggers especiales legacy que no tienen equivalente directo.`);
  }

  return {
    mapData: {
      mapNumber,
      width,
      height,
      tiles
    },
    report: {
      success: true,
      warnings,
      translatedTiles,
      unmappedTriggers
    }
  };
}

/**
 * Exports an OpenAO structured map back to classic binary .map format.
 */
export function exportClassicMap(mapData: OpenAOMapData): Buffer {
  const headerSize = 263;
  const width = mapData.width || 100;
  const height = mapData.height || 100;

  // Calculate buffer size
  let estimatedSize = headerSize;
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      estimatedSize += 1 + 2 + 2 + 2 + 2 + 2; // max possible per tile
    }
  }

  const buffer = Buffer.alloc(estimatedSize);
  buffer.writeInt16LE(1, 0); // Version 1

  let offset = headerSize;
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const tile = mapData.tiles[x]?.[y] || {
        blocked: false,
        layer1: 1,
        layer2: 0,
        layer3: 0,
        layer4: 0,
        trigger: 0
      };

      let flags = 0;
      if (tile.blocked) flags |= 0x01;
      if (tile.layer2 > 0) flags |= 0x02;
      if (tile.layer3 > 0) flags |= 0x04;
      if (tile.layer4 > 0) flags |= 0x08;
      if (tile.trigger > 0) flags |= 0x10;

      buffer.writeUInt8(flags, offset);
      offset += 1;

      buffer.writeUInt16LE(tile.layer1 || 1, offset);
      offset += 2;

      if (flags & 0x02) {
        buffer.writeUInt16LE(tile.layer2, offset);
        offset += 2;
      }
      if (flags & 0x04) {
        buffer.writeUInt16LE(tile.layer3, offset);
        offset += 2;
      }
      if (flags & 0x08) {
        buffer.writeUInt16LE(tile.layer4, offset);
        offset += 2;
      }
      if (flags & 0x10) {
        buffer.writeUInt16LE(tile.trigger, offset);
        offset += 2;
      }
    }
  }

  return buffer.subarray(0, offset);
}
