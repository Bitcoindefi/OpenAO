import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassMirrorSilveringBenchEngine,
    ActiveSilveringBench,
} from "../lib/ancientRunicGlassMirrorSilveringBench.js";

describe("AncientRunicGlassMirrorSilveringBenchEngine Mirror Silvering Benches & Scrying Vanities", () => {
    it("silver-plates Celestial Void True-Image Vanity in True-Image Sanctum achieving 100% specular reflectance and returns spliced plates", () => {
        const bench = AncientRunicGlassMirrorSilveringBenchEngine.constructBench("glazier_01", "CELESTIAL_VOID_TRUE_IMAGE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_TRUE_IMAGE_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialPlates = [
            "CELESTIAL_VOID_STARLIGHT_MIRROR_PLATE",
            "CELESTIAL_VOID_STARLIGHT_MIRROR_PLATE",
            "CELESTIAL_VOID_STARLIGHT_MIRROR_PLATE"
        ] as any[];

        const craftRes = AncientRunicGlassMirrorSilveringBenchEngine.silverMirror(
            bench,
            "CELESTIAL_VOID_TRUE_IMAGE_VANITY",
            initialPlates,
            0.1, // Success roll
            1.0, // Specular roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.mirror?.recipeType).toBe("CELESTIAL_VOID_TRUE_IMAGE_VANITY");
        expect(craftRes.mirror?.specularReflectancePercent).toBe(100);
        expect(craftRes.mirror?.finalIllusionReflectionPercent).toBe(100); // 85 * 1.20 = 102 -> clamped to 100%
        expect(craftRes.mirror?.finalScryingDivinationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.mirror?.consumedGlassCount).toBe(2);
        expect(craftRes.mirror?.consumedGlassType).toBe("CELESTIAL_VOID_STARLIGHT_MIRROR_PLATE");
        expect(craftRes.mirror?.remainingProvidedGlass.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicGlassMirrorSilveringBenchEngine.constructBench("glazier_wear", "PINE_MIRROR_SILVERING_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassMirrorSilveringBenchEngine.silverMirror(
            bench,
            "ILLUSIONIST_SCRYING_MIRROR",
            ["POLISHED_FLOAT_GLASS_SHEET", "POLISHED_FLOAT_GLASS_SHEET"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(bench.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicGlassMirrorSilveringBenchEngine.silverMirror(
            bench,
            "ILLUSIONIST_SCRYING_MIRROR",
            ["POLISHED_FLOAT_GLASS_SHEET", "POLISHED_FLOAT_GLASS_SHEET"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("oxidized or lacks durability");
    });

    it("rejects crafting when insufficient glass is provided", () => {
        const bench = AncientRunicGlassMirrorSilveringBenchEngine.constructBench("glazier_02", "PINE_MIRROR_SILVERING_BENCH");

        const failRes = AncientRunicGlassMirrorSilveringBenchEngine.silverMirror(
            bench,
            "SUNFLARE_BLINDING_COMPACT",
            ["PURE_ARGENTUM_SILVER_FOIL"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient glass sheet");
        expect(bench.currentDurability).toBe(75);
    });

    it("handles tarnished nitrate failure roll consuming durability and glass sheets", () => {
        const bench = AncientRunicGlassMirrorSilveringBenchEngine.constructBench("glazier_03", "PINE_MIRROR_SILVERING_BENCH"); // 85% success

        const fail = AncientRunicGlassMirrorSilveringBenchEngine.silverMirror(
            bench,
            "ILLUSIONIST_SCRYING_MIRROR",
            ["POLISHED_FLOAT_GLASS_SHEET", "POLISHED_FLOAT_GLASS_SHEET", "POLISHED_FLOAT_GLASS_SHEET"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("tarnished");
        expect(fail.remainingProvidedGlass?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicGlassMirrorSilveringBenchEngine.constructBench("glazier_04", "PINE_MIRROR_SILVERING_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassMirrorSilveringBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassMirrorSilveringBenchEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicGlassMirrorSilveringBenchEngine.constructBench("g", "PLASTIC_TABLE" as any)).toThrow(
            "Unsupported silvering bench type"
        );

        const invalidBench: ActiveSilveringBench = {
            benchId: "bad",
            glazierPlayerId: "p",
            benchType: "TABLE" as any,
            currentDurability: 50,
            maxDurability: 50,
            silveringPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicGlassMirrorSilveringBenchEngine.silverMirror(invalidBench, "ILLUSIONIST_SCRYING_MIRROR", ["POLISHED_FLOAT_GLASS_SHEET", "POLISHED_FLOAT_GLASS_SHEET"]).success).toBe(false);
        expect(AncientRunicGlassMirrorSilveringBenchEngine.silverMirror(null as any, "ILLUSIONIST_SCRYING_MIRROR", []).success).toBe(false);
        expect(AncientRunicGlassMirrorSilveringBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});