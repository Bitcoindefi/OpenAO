import { afterEach, describe, expect, it, vi } from "vitest";
import {
    MAX_ENGINE_GRAPHIC_INDEX,
    paletteEntrySchema,
    UPLOADED_GRAPHIC_INDEX_START,
    validatePaletteEntry,
} from "../repositories/worldBuilder";
import pool from "../db";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("Palette Entry Schema and Validation (#6)", () => {
    it("should accept valid multi-layer palette entries with blocking flag", () => {
        const valid = paletteEntrySchema.safeParse({
            graphics: [5500, 581],
            blocked: true,
        });
        expect(valid.success).toBe(true);
        if (valid.success) {
            expect(valid.data.graphics).toEqual([5500, 581]);
            expect(valid.data.blocked).toBe(true);
        }
    });

    it("should reject palette entries with empty graphics array", () => {
        const invalid = paletteEntrySchema.safeParse({
            graphics: [],
            blocked: false,
        });
        expect(invalid.success).toBe(false);
    });

    it("should reject palette entries exceeding maximum layers (4)", () => {
        const invalid = paletteEntrySchema.safeParse({
            graphics: [1, 2, 3, 4, 5],
        });
        expect(invalid.success).toBe(false);
    });

    it("should enforce non-colliding reserved range for uploaded graphics", () => {
        expect(UPLOADED_GRAPHIC_INDEX_START).toBe(1_000_000);
        // Original game graphics reach up to 320151, well below 1_000_000
        expect(UPLOADED_GRAPHIC_INDEX_START).toBeGreaterThan(
            MAX_ENGINE_GRAPHIC_INDEX,
        );
    });

    it("should accept an original engine graphic without a database lookup", async () => {
        const query = vi.spyOn(pool, "query");
        const result = await validatePaletteEntry({
            graphics: [MAX_ENGINE_GRAPHIC_INDEX],
        });

        expect(result).toEqual({ valid: true });
        expect(query).not.toHaveBeenCalled();
    });

    it("should reject graphic indices outside the original engine range", async () => {
        const query = vi.spyOn(pool, "query");
        const result = await validatePaletteEntry({
            graphics: [MAX_ENGINE_GRAPHIC_INDEX + 1],
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("Indice de grafico invalido");
        expect(query).not.toHaveBeenCalled();
    });

    it("should validate uploaded graphics against the database", async () => {
        const query = vi
            .spyOn(pool, "query")
            .mockResolvedValue({ rowCount: 1 } as never);

        const result = await validatePaletteEntry({
            graphics: [UPLOADED_GRAPHIC_INDEX_START],
        });

        expect(result).toEqual({ valid: true });
        expect(query).toHaveBeenCalledWith(
            expect.stringContaining("game_uploaded_graphics"),
            [UPLOADED_GRAPHIC_INDEX_START],
        );
    });

    it("should reject an uploaded graphic that is not registered", async () => {
        vi.spyOn(pool, "query").mockResolvedValue({ rowCount: 0 } as never);

        const result = await validatePaletteEntry({
            graphics: [UPLOADED_GRAPHIC_INDEX_START + 1],
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("no existe");
    });
});
