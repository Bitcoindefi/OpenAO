import * as crypto from "crypto";

/**
 * PNG Tile Asset Storage & Deduplication Engine (Modo Construcción - Etapa 1)
 * Resolves Issue #5: Subida y almacenamiento de PNG para tiles ($50 USD)
 */

export interface PngAssetMeta {
  assetId: string;
  checksum: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  uploaderAccountId: string;
  createdAt: Date;
  assetUrl: string;
}

export const PNG_STORAGE_CONFIG = {
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  TILE_UNIT_SIZE: 32,
  MAX_DIMENSION: 512,
  MAGIC_BYTES: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
} as const;

/**
 * Verifies if a buffer begins with standard PNG 8-byte magic header.
 */
export function isValidPngMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  for (let i = 0; i < PNG_STORAGE_CONFIG.MAGIC_BYTES.length; i++) {
    if (buffer[i] !== PNG_STORAGE_CONFIG.MAGIC_BYTES[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Extracts width and height from PNG IHDR chunk (bytes 16-23).
 */
export function extractPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24 || !isValidPngMagicBytes(buffer)) {
    return null;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

export class PngTileStorageService {
  private assets = new Map<string, PngAssetMeta>(); // checksum -> meta

  /**
   * Processes, validates, deduplicates and stores a tile PNG asset.
   */
  async processAndStoreTilePng(
    buffer: Buffer,
    uploaderAccountId: string
  ): Promise<{ success: boolean; error?: string; asset?: PngAssetMeta; isDuplicate?: boolean }> {
    // 1. File size limit
    if (buffer.length > PNG_STORAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: `El archivo supera el tamaño máximo permitido de 2 MB (${buffer.length} bytes recibidos).`
      };
    }

    // 2. Magic byte check
    if (!isValidPngMagicBytes(buffer)) {
      return {
        success: false,
        error: "Formato de archivo inválido. El archivo no contiene la cabecera mágica de una imagen PNG válida."
      };
    }

    // 3. Dimension check (must be multiple of 32x32 and within 512x512)
    const dimensions = extractPngDimensions(buffer);
    if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
      return { success: false, error: "No se pudieron determinar las dimensiones del archivo PNG." };
    }

    if (dimensions.width > PNG_STORAGE_CONFIG.MAX_DIMENSION || dimensions.height > PNG_STORAGE_CONFIG.MAX_DIMENSION) {
      return {
        success: false,
        error: `Las dimensiones (${dimensions.width}x${dimensions.height}) exceden el límite máximo de ${PNG_STORAGE_CONFIG.MAX_DIMENSION}x${PNG_STORAGE_CONFIG.MAX_DIMENSION}.`
      };
    }

    if (dimensions.width % PNG_STORAGE_CONFIG.TILE_UNIT_SIZE !== 0 || dimensions.height % PNG_STORAGE_CONFIG.TILE_UNIT_SIZE !== 0) {
      return {
        success: false,
        error: `Las dimensiones (${dimensions.width}x${dimensions.height}) deben ser múltiplos exactos del tamaño de casilla (${PNG_STORAGE_CONFIG.TILE_UNIT_SIZE}x${PNG_STORAGE_CONFIG.TILE_UNIT_SIZE}).`
      };
    }

    // 4. SHA-256 Checksum Deduplication
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
    if (this.assets.has(checksum)) {
      const existing = this.assets.get(checksum)!;
      return {
        success: true,
        asset: existing,
        isDuplicate: true
      };
    }

    const assetId = `asset-${checksum.substring(0, 16)}`;
    const assetMeta: PngAssetMeta = {
      assetId,
      checksum,
      width: dimensions.width,
      height: dimensions.height,
      fileSizeBytes: buffer.length,
      uploaderAccountId,
      createdAt: new Date(),
      assetUrl: `/uploads/tiles/${checksum}.png`
    };

    this.assets.set(checksum, assetMeta);

    return {
      success: true,
      asset: assetMeta,
      isDuplicate: false
    };
  }

  getAssetByChecksum(checksum: string): PngAssetMeta | undefined {
    return this.assets.get(checksum);
  }
}
