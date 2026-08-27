/**
 * Map Exits & World Graph Connection Service (Modo Construcción - Etapa 2)
 * Resolves Issue #10: Etapa 2: edición de salidas entre mapas ($50 USD)
 */

export interface MapExitDestination {
  map: number;
  x: number;
  y: number;
}

export interface MapSpecials {
  id: number;
  exits: Record<string, MapExitDestination>;
}

export interface MapTileCheck {
  blocked: boolean;
}

export interface MapMetadata {
  id: number;
  name: string;
  tiles?: Record<string, MapTileCheck>;
}

export interface ExitOperationResult {
  success: boolean;
  error?: string;
  exits?: Record<string, MapExitDestination>;
}

/**
 * Validates coordinate limits (1-100).
 */
function isValidCoordinate(x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 1 && x <= 100 && y >= 1 && y <= 100;
}

/**
 * Adds or updates an exit from source map to target destination.
 */
export function addOrUpdateExit(
  sourceMap: MapSpecials,
  sourceX: number,
  sourceY: number,
  targetMapId: number,
  targetX: number,
  targetY: number,
  availableMaps: Map<number, MapMetadata>
): ExitOperationResult {
  if (!isValidCoordinate(sourceX, sourceY)) {
    return { success: false, error: `Coordenada origen inválida (${sourceX}, ${sourceY})` };
  }
  if (!isValidCoordinate(targetX, targetY)) {
    return { success: false, error: `Coordenada destino inválida (${targetX}, ${targetY})` };
  }

  const targetMapMeta = availableMaps.get(targetMapId);
  if (!targetMapMeta) {
    return { success: false, error: `El mapa destino #${targetMapId} no existe.` };
  }

  // Check if target tile is blocked
  const targetKey = `${targetX},${targetY}`;
  if (targetMapMeta.tiles && targetMapMeta.tiles[targetKey]?.blocked) {
    return {
      success: false,
      error: `La coordenada de llegada (${targetX}, ${targetY}) en el mapa #${targetMapId} está bloqueada.`
    };
  }

  const updatedExits = { ...sourceMap.exits };
  updatedExits[`${sourceX},${sourceY}`] = {
    map: targetMapId,
    x: targetX,
    y: targetY
  };

  return {
    success: true,
    exits: updatedExits
  };
}

/**
 * Creates paired bidirectional exits between two maps atomically.
 */
export function addBidirectionalExit(
  mapA: MapSpecials,
  xA: number,
  yA: number,
  mapB: MapSpecials,
  xB: number,
  yB: number,
  availableMaps: Map<number, MapMetadata>
): {
  success: boolean;
  error?: string;
  mapAExits?: Record<string, MapExitDestination>;
  mapBExits?: Record<string, MapExitDestination>;
} {
  const resA = addOrUpdateExit(mapA, xA, yA, mapB.id, xB, yB, availableMaps);
  if (!resA.success) return { success: false, error: resA.error };

  const resB = addOrUpdateExit(mapB, xB, yB, mapA.id, xA, yA, availableMaps);
  if (!resB.success) return { success: false, error: resB.error };

  return {
    success: true,
    mapAExits: resA.exits,
    mapBExits: resB.exits
  };
}

/**
 * Removes an exit from a map.
 */
export function removeExit(
  sourceMap: MapSpecials,
  sourceX: number,
  sourceY: number
): { success: boolean; exits: Record<string, MapExitDestination> } {
  const updatedExits = { ...sourceMap.exits };
  delete updatedExits[`${sourceX},${sourceY}`];
  return {
    success: true,
    exits: updatedExits
  };
}

/**
 * Analyzes world graph and returns IDs of maps that have no inbound exits.
 */
export function findUnreachableMaps(
  allMaps: MapSpecials[],
  entryMapId: number = 1
): { unreachableMapIds: number[]; totalMaps: number } {
  const inboundCount = new Map<number, number>();
  for (const m of allMaps) {
    inboundCount.set(m.id, 0);
  }

  for (const m of allMaps) {
    for (const exit of Object.values(m.exits)) {
      if (inboundCount.has(exit.map)) {
        inboundCount.set(exit.map, (inboundCount.get(exit.map) || 0) + 1);
      }
    }
  }

  const unreachable: number[] = [];
  for (const [id, count] of inboundCount.entries()) {
    if (id !== entryMapId && count === 0) {
      unreachable.push(id);
    }
  }

  return {
    unreachableMapIds: unreachable,
    totalMaps: allMaps.length
  };
}
