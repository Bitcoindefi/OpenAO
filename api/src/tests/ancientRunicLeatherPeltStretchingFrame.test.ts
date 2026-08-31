import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherPeltStretchingFrameEngine,
    ActiveStretchingFrame,
} from "../lib/ancientRunicLeatherPeltStretchingFrame.js";

describe("AncientRunicLeatherPeltStretchingFrameEngine Stretching Frames & Glossed Furs", () => {
    it("stretches Celestial Void Sovereign Cape in Glossing Sanctum achieving 100% glossing and returns spliced pelts", () => {
        const frame = AncientRunicLeatherPeltStretchingFrameEngine.constructFrame("furrier_01", "CELESTIAL_VOID_GLOSSING_SANCTUM");
        expect(frame.frameType).toBe("CELESTIAL_VOID_GLOSSING_SANCTUM");
        expect(frame.currentDurability).toBe(310);

        const initialPelts = [
            "CELESTIAL_VOID_BEHEMOTH_FUR",
            "CELESTIAL_VOID_BEHEMOTH_FUR",
            "CELESTIAL_VOID_BEHEMOTH_FUR"
        ] as any[];

        const craftRes = AncientRunicLeatherPeltStretchingFrameEngine.stretchPelt(
            frame,
            "CELESTIAL_VOID_SOVEREIGN_CAPE",
            initialPelts,
            0.1, // Success roll
            1.0, // Glossing roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.fur?.recipeType).toBe("CELESTIAL_VOID_SOVEREIGN_CAPE");
        expect(craftRes.fur?.glossingRatingPercent).toBe(100);
        expect(craftRes.fur?.finalColdResistancePercent).toBe(100); // 85 * 1.20 = 102 -> clamped to 100%
        expect(craftRes.fur?.finalStealthConcealmentPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.fur?.consumedPeltCount).toBe(2);
        expect(craftRes.fur?.consumedPeltType).toBe("CELESTIAL_VOID_BEHEMOTH_FUR");
        expect(craftRes.fur?.remainingProvidedPelts.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles frame becoming non-functional after successful craft when durability falls below threshold", () => {
        const frame = AncientRunicLeatherPeltStretchingFrameEngine.constructFrame("furrier_wear", "ASHWOOD_PELT_STRETCHER");
        frame.currentDurability = 15;
        expect(frame.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicLeatherPeltStretchingFrameEngine.stretchPelt(
            frame,
            "WINTERGUARD_WARMTH_MANTLE",
            ["TUNDRA_WOLF_PELT", "TUNDRA_WOLF_PELT"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(frame.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicLeatherPeltStretchingFrameEngine.stretchPelt(
            frame,
            "WINTERGUARD_WARMTH_MANTLE",
            ["TUNDRA_WOLF_PELT", "TUNDRA_WOLF_PELT"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
    });

    it("rejects crafting when insufficient pelt is provided", () => {
        const frame = AncientRunicLeatherPeltStretchingFrameEngine.constructFrame("furrier_02", "ASHWOOD_PELT_STRETCHER");

        const failRes = AncientRunicLeatherPeltStretchingFrameEngine.stretchPelt(
            frame,
            "SHADOWSTALKER_STEALTH_LINING",
            ["SHADOW_PANTHER_PELT"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient pelt");
        expect(frame.currentDurability).toBe(75);
    });

    it("handles overstretched tear failure roll consuming durability and pelts", () => {
        const frame = AncientRunicLeatherPeltStretchingFrameEngine.constructFrame("furrier_03", "ASHWOOD_PELT_STRETCHER"); // 85% success

        const fail = AncientRunicLeatherPeltStretchingFrameEngine.stretchPelt(
            frame,
            "WINTERGUARD_WARMTH_MANTLE",
            ["TUNDRA_WOLF_PELT", "TUNDRA_WOLF_PELT", "TUNDRA_WOLF_PELT"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("overstretched");
        expect(fail.remainingProvidedPelts?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(frame.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainFrame based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const frame = AncientRunicLeatherPeltStretchingFrameEngine.constructFrame("furrier_04", "ASHWOOD_PELT_STRETCHER");
        frame.currentDurability = 0;
        frame.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherPeltStretchingFrameEngine.maintainFrame(frame, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherPeltStretchingFrameEngine.maintainFrame(frame, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported frame models", () => {
        expect(() => AncientRunicLeatherPeltStretchingFrameEngine.constructFrame("f", "PLASTIC_FRAME" as any)).toThrow(
            "Unsupported stretching frame type"
        );

        const invalidFrame: ActiveStretchingFrame = {
            frameId: "bad",
            furrierPlayerId: "p",
            frameType: "FRAME" as any,
            currentDurability: 50,
            maxDurability: 50,
            stretchingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicLeatherPeltStretchingFrameEngine.stretchPelt(invalidFrame, "WINTERGUARD_WARMTH_MANTLE", ["TUNDRA_WOLF_PELT", "TUNDRA_WOLF_PELT"]).success).toBe(false);
        expect(AncientRunicLeatherPeltStretchingFrameEngine.stretchPelt(null as any, "WINTERGUARD_WARMTH_MANTLE", []).success).toBe(false);
        expect(AncientRunicLeatherPeltStretchingFrameEngine.maintainFrame(null as any).success).toBe(false);
    });
});