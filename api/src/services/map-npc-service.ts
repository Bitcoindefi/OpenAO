/**
 * Map NPC Placement, Movement & Mutation Service (Modo Construcción - Etapa 2)
 * Resolves Issue #8: API de colocación y movimiento de NPCs en mapa ($50 USD)
 */

export interface MapNpcPlacement {
  id: string;
  mapNum: number;
  x: number;
  y: number;
  npcIndex: number;
  movement?: number;
}

export interface MapNpcStore {
  mapNum: number;
  placements: MapNpcPlacement[];
}

export interface MapTerrainMeta {
  blockedTiles?: Set<string>;
}

export const NPC_CONSTANTS = {
  MAX_NPC_INDEX: 340,
  MAX_NPCS_PER_MAP: 50,
  DEFAULT_MOVEMENT: 1
} as const;

/**
 * Places a new NPC on the map with boundary, catalog, collision and stacking validations.
 */
export function placeNpcOnMap(
  store: MapNpcStore,
  x: number,
  y: number,
  npcIndex: number,
  movement: number = NPC_CONSTANTS.DEFAULT_MOVEMENT,
  terrain?: MapTerrainMeta
): { success: boolean; error?: string; store?: MapNpcStore; placement?: MapNpcPlacement } {
  // 1. Coordinate check
  if (x < 1 || x > 100 || y < 1 || y > 100) {
    return { success: false, error: `Coordenadas (${x}, ${y}) fuera de los límites de la grilla (1-100).` };
  }

  // 2. Catalog check
  if (npcIndex < 1 || npcIndex > NPC_CONSTANTS.MAX_NPC_INDEX) {
    return {
      success: false,
      error: `npcIndex inválido #${npcIndex}. El catálogo de NPCs comprende los índices 1-${NPC_CONSTANTS.MAX_NPC_INDEX}.`
    };
  }

  // 3. Quota check
  if (store.placements.length >= NPC_CONSTANTS.MAX_NPCS_PER_MAP) {
    return {
      success: false,
      error: `Límite de NPCs alcanzado para este mapa (máximo ${NPC_CONSTANTS.MAX_NPCS_PER_MAP} permitidos).`
    };
  }

  // 4. Blocked tile check
  const tileKey = `${x},${y}`;
  if (terrain?.blockedTiles?.has(tileKey)) {
    return {
      success: false,
      error: `La coordenada (${x}, ${y}) está bloqueada por el terreno. No se puede colocar un NPC en una pared.`
    };
  }

  // 5. Stacking check
  const isOccupied = store.placements.some(p => p.x === x && p.y === y);
  if (isOccupied) {
    return {
      success: false,
      error: `Ya existe un NPC en la coordenada (${x}, ${y}). No se permite apilar NPCs en el mismo tile.`
    };
  }

  const newPlacement: MapNpcPlacement = {
    id: `npc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    mapNum: store.mapNum,
    x,
    y,
    npcIndex,
    movement
  };

  return {
    success: true,
    store: {
      ...store,
      placements: [...store.placements, newPlacement]
    },
    placement: newPlacement
  };
}

/**
 * Moves an existing NPC to another coordinate with collision checks.
 */
export function moveNpcOnMap(
  store: MapNpcStore,
  placementId: string,
  targetX: number,
  targetY: number,
  terrain?: MapTerrainMeta
): { success: boolean; error?: string; store?: MapNpcStore; placement?: MapNpcPlacement } {
  const existing = store.placements.find(p => p.id === placementId);
  if (!existing) {
    return { success: false, error: `NPC con ID ${placementId} no encontrado en el mapa.` };
  }

  if (targetX < 1 || targetX > 100 || targetY < 1 || targetY > 100) {
    return { success: false, error: `Coordenada destino (${targetX}, ${targetY}) fuera de límites.` };
  }

  const tileKey = `${targetX},${targetY}`;
  if (terrain?.blockedTiles?.has(tileKey)) {
    return { success: false, error: `El tile destino (${targetX}, ${targetY}) está bloqueado.` };
  }

  const isOccupied = store.placements.some(p => p.id !== placementId && p.x === targetX && p.y === targetY);
  if (isOccupied) {
    return { success: false, error: `El tile destino (${targetX}, ${targetY}) ya está ocupado por otro NPC.` };
  }

  const updated: MapNpcPlacement = { ...existing, x: targetX, y: targetY };
  const updatedList = store.placements.map(p => (p.id === placementId ? updated : p));

  return {
    success: true,
    store: { ...store, placements: updatedList },
    placement: updated
  };
}

/**
 * Removes an NPC from the map.
 */
export function removeNpcFromMap(
  store: MapNpcStore,
  placementId: string
): { success: boolean; error?: string; store?: MapNpcStore } {
  const filtered = store.placements.filter(p => p.id !== placementId);
  if (filtered.length === store.placements.length) {
    return { success: false, error: `NPC con ID ${placementId} no encontrado en el mapa.` };
  }

  return {
    success: true,
    store: { ...store, placements: filtered }
  };
}
