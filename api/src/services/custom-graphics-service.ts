/**
 * Custom Graphics Registration & Palette Extension Engine (Modo Construcción - Etapa 1)
 * Resolves Issue #6: Registrar PNG subidos como gráficos del motor y extender la paleta ($50 USD)
 */

export const GRAPHIC_ID_RANGES = {
  OFFICIAL_MAX: 49999,
  CUSTOM_MIN: 50000,
  CUSTOM_MAX: 99999
} as const;

export interface CustomGraphicEntry {
  grhId: number;
  filename: string;
  width: number;
  height: number;
  authorAccountId?: string;
  createdAt: Date;
  assetUrl: string;
}

export interface MapPaletteEntry {
  graphics: number[]; // Layer grh IDs
  blocked: boolean;
}

export interface MapTerrainPaletteStore {
  mapId: number;
  palette: Record<string, MapPaletteEntry>;
}

export class CustomGraphicsRegistry {
  private graphics = new Map<number, CustomGraphicEntry>();
  private nextId = GRAPHIC_ID_RANGES.CUSTOM_MIN;

  /**
   * Registers an uploaded PNG into the engine's graphic index.
   */
  registerGraphic(
    filename: string,
    width: number,
    height: number,
    authorAccountId?: string
  ): CustomGraphicEntry {
    if (this.nextId > GRAPHIC_ID_RANGES.CUSTOM_MAX) {
      throw new Error("Se ha alcanzado el límite máximo del rango de gráficos personalizados (99999).");
    }

    const entry: CustomGraphicEntry = {
      grhId: this.nextId++,
      filename,
      width,
      height,
      authorAccountId,
      createdAt: new Date(),
      assetUrl: `/assets/custom_grh/${filename}`
    };

    this.graphics.set(entry.grhId, entry);
    return entry;
  }

  /**
   * Checks if a graphic ID exists (official or custom registered).
   */
  isValidGraphicId(grhId: number, officialCatalogMax: number = 35000): boolean {
    if (grhId >= 1 && grhId <= officialCatalogMax) {
      return true; // Official standard graphic
    }
    return this.graphics.has(grhId);
  }

  getGraphic(grhId: number): CustomGraphicEntry | undefined {
    return this.graphics.get(grhId);
  }

  /**
   * Adds a new palette entry to a map's terrain.json palette.
   */
  addPaletteEntry(
    store: MapTerrainPaletteStore,
    key: string,
    graphics: number[],
    blocked: boolean = false
  ): { success: boolean; error?: string; store?: MapTerrainPaletteStore } {
    if (!graphics || graphics.length === 0) {
      return { success: false, error: "La entrada de paleta debe contener al menos un identificador gráfico." };
    }

    // Validate that all referenced graphics exist
    for (const grhId of graphics) {
      if (!this.isValidGraphicId(grhId)) {
        return {
          success: false,
          error: `El identificador gráfico #${grhId} no existe en el catálogo oficial ni en los assets personalizados registrados.`
        };
      }
    }

    const updatedPalette = {
      ...store.palette,
      [key]: {
        graphics,
        blocked
      }
    };

    return {
      success: true,
      store: {
        ...store,
        palette: updatedPalette
      }
    };
  }
}
