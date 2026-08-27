/**
 * Map Terrain Painting & Collision Mutation API (Modo Construcción - Etapa 1)
 * Resolves Issue #7: API para pintar el piso del mapa ($50 USD)
 */

export interface TerrainTile {
  x: number;
  y: number;
  layer1: number;
  blocked: boolean;
}

export interface TerrainMapData {
  mapId: number;
  palette: number[];
  tiles: Map<string, TerrainTile>;
}

export const PAINT_LIMITS = {
  MAX_RECTANGLE_WIDTH: 30,
  MAX_RECTANGLE_HEIGHT: 30,
  GRID_MIN: 1,
  GRID_MAX: 100
} as const;

function isWithinGrid(x: number, y: number): boolean {
  return x >= PAINT_LIMITS.GRID_MIN && x <= PAINT_LIMITS.GRID_MAX &&
         y >= PAINT_LIMITS.GRID_MIN && y <= PAINT_LIMITS.GRID_MAX;
}

/**
 * Paints a single tile on the terrain layer.
 */
export function paintSingleTile(
  map: TerrainMapData,
  x: number,
  y: number,
  paletteIndex: number,
  blocked?: boolean
): { success: boolean; error?: string; updatedMap?: TerrainMapData } {
  if (!isWithinGrid(x, y)) {
    return { success: false, error: `Coordenadas (${x}, ${y}) fuera de límites (1-100).` };
  }

  if (paletteIndex < 0 || paletteIndex >= map.palette.length) {
    return { success: false, error: `Índice de paleta #${paletteIndex} no existe en este mapa.` };
  }

  const key = `${x},${y}`;
  const existing = map.tiles.get(key) || { x, y, layer1: map.palette[0] || 1, blocked: false };
  const updatedTile: TerrainTile = {
    x,
    y,
    layer1: map.palette[paletteIndex],
    blocked: blocked !== undefined ? blocked : existing.blocked
  };

  const nextTiles = new Map(map.tiles);
  nextTiles.set(key, updatedTile);

  return {
    success: true,
    updatedMap: {
      ...map,
      tiles: nextTiles
    }
  };
}

/**
 * Atomically paints a rectangular region of tiles.
 */
export function paintRectangle(
  map: TerrainMapData,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  paletteIndex: number,
  blocked?: boolean
): { success: boolean; error?: string; updatedMap?: TerrainMapData; tilesAffected?: number } {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (!isWithinGrid(minX, minY) || !isWithinGrid(maxX, maxY)) {
    return { success: false, error: "Las coordenadas del rectángulo exceden la grilla de 100x100." };
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  if (width > PAINT_LIMITS.MAX_RECTANGLE_WIDTH || height > PAINT_LIMITS.MAX_RECTANGLE_HEIGHT) {
    return {
      success: false,
      error: `El rectángulo (${width}x${height}) supera el límite de ${PAINT_LIMITS.MAX_RECTANGLE_WIDTH}x${PAINT_LIMITS.MAX_RECTANGLE_HEIGHT} por operación.`
    };
  }

  if (paletteIndex < 0 || paletteIndex >= map.palette.length) {
    return { success: false, error: `Índice de paleta #${paletteIndex} no existe en este mapa.` };
  }

  const grhValue = map.palette[paletteIndex];
  const nextTiles = new Map(map.tiles);
  let count = 0;

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const key = `${x},${y}`;
      const existing = nextTiles.get(key) || { x, y, layer1: grhValue, blocked: false };
      nextTiles.set(key, {
        x,
        y,
        layer1: grhValue,
        blocked: blocked !== undefined ? blocked : existing.blocked
      });
      count++;
    }
  }

  return {
    success: true,
    updatedMap: {
      ...map,
      tiles: nextTiles
    },
    tilesAffected: count
  };
}

/**
 * Sets blocked collision flag for a rectangular region.
 */
export function setRectangleBlocked(
  map: TerrainMapData,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  blocked: boolean
): { success: boolean; error?: string; updatedMap?: TerrainMapData } {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (!isWithinGrid(minX, minY) || !isWithinGrid(maxX, maxY)) {
    return { success: false, error: "Coordenadas fuera de límites." };
  }

  const nextTiles = new Map(map.tiles);
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const key = `${x},${y}`;
      const existing = nextTiles.get(key) || { x, y, layer1: map.palette[0] || 1, blocked: false };
      nextTiles.set(key, {
        ...existing,
        blocked
      });
    }
  }

  return {
    success: true,
    updatedMap: {
      ...map,
      tiles: nextTiles
    }
  };
}

/**
 * Queries terrain tiles in a rectangular bounding box.
 */
export function getRegionTiles(
  map: TerrainMapData,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): TerrainTile[] {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  const result: TerrainTile[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const key = `${x},${y}`;
      result.push(map.tiles.get(key) || { x, y, layer1: map.palette[0] || 1, blocked: false });
    }
  }
  return result;
}
