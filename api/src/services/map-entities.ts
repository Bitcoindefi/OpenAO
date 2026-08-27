/**
 * Map Entities, Ground Items, Doors & Multi-Tile Structures Service (Modo Construcción - Etapa 2)
 * Resolves Issue #9: Colocación de objetos, estructuras y puertas ($50 USD)
 */

export interface GroundItem {
  id: string;
  objIndex: number;
  amount: number;
  x: number;
  y: number;
}

export interface MapDoor {
  id: string;
  x: number;
  y: number;
  isOpen: boolean;
  keyId?: number;
}

export interface MapSign {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface StructureTile {
  x: number;
  y: number;
  layer3: number;
  layer4: number;
  blocked: boolean;
}

export interface MapEntityStore {
  mapId: number;
  items: GroundItem[];
  doors: MapDoor[];
  signs: MapSign[];
  structures: StructureTile[];
}

/**
 * Places a ground item with catalog validation.
 */
export function placeGroundItem(
  store: MapEntityStore,
  x: number,
  y: number,
  objIndex: number,
  amount: number = 1,
  catalogSize: number = 1062
): { success: boolean; error?: string; store?: MapEntityStore; item?: GroundItem } {
  if (objIndex < 1 || objIndex > catalogSize) {
    return { success: false, error: `objIndex inválido #${objIndex}. El catálogo contiene 1-${catalogSize}.` };
  }
  if (amount < 1 || amount > 10000) {
    return { success: false, error: `Cantidad de objeto inválida (${amount}).` };
  }

  const newItem: GroundItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    objIndex,
    amount,
    x,
    y
  };

  const updatedItems = [...store.items.filter(i => !(i.x === x && i.y === y)), newItem];
  return {
    success: true,
    store: { ...store, items: updatedItems },
    item: newItem
  };
}

/**
 * Places a door and configures tile blockage based on door state.
 */
export function placeDoor(
  store: MapEntityStore,
  x: number,
  y: number,
  isOpen: boolean = false,
  keyId?: number
): { success: boolean; store: MapEntityStore; door: MapDoor; isTileBlocked: boolean } {
  const newDoor: MapDoor = {
    id: `door-${x}-${y}`,
    x,
    y,
    isOpen,
    keyId
  };

  const updatedDoors = [...store.doors.filter(d => !(d.x === x && d.y === y)), newDoor];
  return {
    success: true,
    store: { ...store, doors: updatedDoors },
    door: newDoor,
    isTileBlocked: !isOpen // Closed doors block movement
  };
}

/**
 * Toggles an existing door and returns updated collision.
 */
export function toggleDoor(
  store: MapEntityStore,
  x: number,
  y: number
): { success: boolean; error?: string; store?: MapEntityStore; isOpen?: boolean; isTileBlocked?: boolean } {
  const door = store.doors.find(d => d.x === x && d.y === y);
  if (!door) {
    return { success: false, error: `No hay ninguna puerta en (${x}, ${y})` };
  }

  const updatedDoor: MapDoor = { ...door, isOpen: !door.isOpen };
  const updatedDoors = store.doors.map(d => (d.x === x && d.y === y ? updatedDoor : d));

  return {
    success: true,
    store: { ...store, doors: updatedDoors },
    isOpen: updatedDoor.isOpen,
    isTileBlocked: !updatedDoor.isOpen
  };
}

/**
 * Places an atomic multi-tile structure.
 */
export function placeStructure(
  store: MapEntityStore,
  originX: number,
  originY: number,
  width: number,
  height: number,
  layer3Grh: number,
  layer4Grh: number,
  blocked: boolean = true
): { success: boolean; error?: string; store?: MapEntityStore; tiles?: StructureTile[] } {
  if (originX + width > 101 || originY + height > 101) {
    return { success: false, error: "La estructura sobrepasa los límites del mapa." };
  }

  const newTiles: StructureTile[] = [];
  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < height; dy++) {
      newTiles.push({
        x: originX + dx,
        y: originY + dy,
        layer3: layer3Grh,
        layer4: layer4Grh,
        blocked
      });
    }
  }

  // Remove previous structure tiles in the footprint
  const filtered = store.structures.filter(
    s => !(s.x >= originX && s.x < originX + width && s.y >= originY && s.y < originY + height)
  );

  return {
    success: true,
    store: { ...store, structures: [...filtered, ...newTiles] },
    tiles: newTiles
  };
}
