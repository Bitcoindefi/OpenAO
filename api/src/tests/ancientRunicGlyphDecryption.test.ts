import { describe, it, expect } from "vitest";
import {
    AncientRunicGlyphDecryptionEngine,
    DungeonPuzzleStone,
    ScholarChiselTool,
} from "../lib/ancientRunicGlyphDecryption.js";

describe("AncientRunicGlyphDecryptionEngine Ciphers & Lore", () => {
    it("creates puzzle stone and decrypts Glyph of the Sun upon aligning cipher wheel to 90 degrees", () => {
        const stone = AncientRunicGlyphDecryptionEngine.createPuzzleStone("GLYPH_OF_THE_SUN", 0, 100000);
        expect(stone.currentWheelRotationDegrees).toBe(0);
        expect(stone.isDecrypted).toBe(false);

        const chisel: ScholarChiselTool = { toolId: "chisel_01", currentDurability: 50, maxDurability: 50, isBroken: false };

        AncientRunicGlyphDecryptionEngine.rotateCipherWheel(stone, 92);
        expect(stone.currentWheelRotationDegrees).toBe(92);

        const decryptRes = AncientRunicGlyphDecryptionEngine.attemptDecryption(stone, chisel, "scholar_01");
        expect(decryptRes.success).toBe(true);
        expect(decryptRes.xpAwarded).toBe(500);
        expect(decryptRes.goldAwarded).toBe(250);
        expect(decryptRes.loreText).toContain("The First Sun blazed");
        expect(stone.isDecrypted).toBe(true);
        expect(chisel.currentDurability).toBe(45);
    });

    it("rejects decryption when cipher wheel is misaligned", () => {
        const stone = AncientRunicGlyphDecryptionEngine.createPuzzleStone("GLYPH_OF_THE_VOID", 180, 100000);
        const chisel: ScholarChiselTool = { toolId: "chisel_02", currentDurability: 20, maxDurability: 20, isBroken: false };

        const failRes = AncientRunicGlyphDecryptionEngine.attemptDecryption(stone, chisel, "scholar_02");
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Cipher wheel misaligned");
        expect(stone.isDecrypted).toBe(false);
        expect(chisel.currentDurability).toBe(15);
    });

    it("guards against unknown glyph types in attemptDecryption without consuming chisel durability", () => {
        const fakeStone: DungeonPuzzleStone = {
            stoneId: "fake_stone",
            glyphType: "UNKNOWN_CHAOS_GLYPH" as any,
            currentWheelRotationDegrees: 0,
            isDecrypted: false,
        };
        const chisel: ScholarChiselTool = { toolId: "c_safe", currentDurability: 30, maxDurability: 30, isBroken: false };

        const res = AncientRunicGlyphDecryptionEngine.attemptDecryption(fakeStone, chisel, "scholar");
        expect(res.success).toBe(false);
        expect(res.reason).toContain("Unsupported glyph type");
        expect(chisel.currentDurability).toBe(30); // Durability preserved
    });

    it("breaks chisel when durability drops to 0 and blocks subsequent etching attempts", () => {
        const stone = AncientRunicGlyphDecryptionEngine.createPuzzleStone("GLYPH_OF_THE_MOON", 180, 100000);
        const brittleChisel: ScholarChiselTool = { toolId: "brittle", currentDurability: 5, maxDurability: 50, isBroken: false };

        const successDec = AncientRunicGlyphDecryptionEngine.attemptDecryption(stone, brittleChisel, "scholar");
        expect(successDec.success).toBe(true);
        expect(brittleChisel.currentDurability).toBe(0);
        expect(brittleChisel.isBroken).toBe(true);

        const stone2 = AncientRunicGlyphDecryptionEngine.createPuzzleStone("GLYPH_OF_THE_ECLIPSE", 0);
        const blocked = AncientRunicGlyphDecryptionEngine.attemptDecryption(stone2, brittleChisel, "scholar");
        expect(blocked.success).toBe(false);
        expect(blocked.reason).toContain("broken");
    });

    it("prevents re-deciphering already solved puzzle stones", () => {
        const stone = AncientRunicGlyphDecryptionEngine.createPuzzleStone("GLYPH_OF_THE_ECLIPSE", 0, 100000);
        const chisel: ScholarChiselTool = { toolId: "c", currentDurability: 50, maxDurability: 50, isBroken: false };

        AncientRunicGlyphDecryptionEngine.attemptDecryption(stone, chisel, "scholar");

        const reAttempt = AncientRunicGlyphDecryptionEngine.attemptDecryption(stone, chisel, "scholar");
        expect(reAttempt.success).toBe(false);
        expect(reAttempt.reason).toContain("already decrypted");
    });
});