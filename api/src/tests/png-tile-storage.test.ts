import { describe, it, expect } from "vitest";
import {
  PngTileStorageService,
  isValidPngMagicBytes,
  extractPngDimensions
} from "../services/png-tile-storage";

function createMockPngBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(32);
  // PNG Magic bytes
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4E;
  buf[3] = 0x47;
  buf[4] = 0x0D;
  buf[5] = 0x0A;
  buf[6] = 0x1A;
  buf[7] = 0x0A;

  // IHDR chunk length & type
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12);

  // Width & Height in big endian
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);

  return buf;
}

describe("PNG Tile Asset Upload & Storage Service (Issue #5)", () => {
  it("Criterion 1: Stores valid 32x32 PNG tile and returns asset ID and URL", async () => {
    const service = new PngTileStorageService();
    const pngBuffer = createMockPngBuffer(32, 32);

    const res = await service.processAndStoreTilePng(pngBuffer, "user-123");
    expect(res.success).toBe(true);
    expect(res.asset?.assetId).toBeDefined();
    expect(res.asset?.assetUrl).toContain("/uploads/tiles/");
    expect(res.asset?.width).toBe(32);
    expect(res.asset?.height).toBe(32);
    expect(res.asset?.uploaderAccountId).toBe("user-123");
  });

  it("Criterion 2: Rejects fake files without PNG magic bytes", async () => {
    const service = new PngTileStorageService();
    const fakeBuffer = Buffer.from("THIS_IS_NOT_A_PNG_FILE_BUT_A_TEXT_DOCUMENT");

    const res = await service.processAndStoreTilePng(fakeBuffer, "user-123");
    expect(res.success).toBe(false);
    expect(res.error).toContain("cabecera mágica");
  });

  it("Criterion 3: Deduplicates identical files using SHA-256 checksum", async () => {
    const service = new PngTileStorageService();
    const pngBuffer = createMockPngBuffer(64, 64);

    const res1 = await service.processAndStoreTilePng(pngBuffer, "user-1");
    expect(res1.success).toBe(true);
    expect(res1.isDuplicate).toBe(false);

    const res2 = await service.processAndStoreTilePng(pngBuffer, "user-2");
    expect(res2.success).toBe(true);
    expect(res2.isDuplicate).toBe(true);
    expect(res2.asset?.assetId).toBe(res1.asset?.assetId);
  });

  it("Criterion 4: Rejects non-tile multiple dimensions (e.g. 35x50)", async () => {
    const service = new PngTileStorageService();
    const invalidDimensionsBuffer = createMockPngBuffer(35, 50);

    const res = await service.processAndStoreTilePng(invalidDimensionsBuffer, "user-123");
    expect(res.success).toBe(false);
    expect(res.error).toContain("múltiplos exactos");
  });
});
