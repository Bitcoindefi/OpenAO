import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassLensGrindingBenchEngine,
    ActiveGrindingBench,
} from "../lib/ancientRunicGlassLensGrindingBench.js";

describe("AncientRunicGlassLensGrindingBenchEngine Lens Grinding Benches & Stargazer Optics", () => {
    it("grinds Celestial Void Stargazer Monocular in Stargazer Sanctum achieving 100% optical clarity and returns spliced disks", () => {
        const bench = AncientRunicGlassLensGrindingBenchEngine.constructBench("optician_01", "CELESTIAL_VOID_STARGAZER_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_STARGAZER_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialDisks = [
            "CELESTIAL_VOID_STARLIGHT_DISK",
            "CELESTIAL_VOID_STARLIGHT_DISK",
            "CELESTIAL_VOID_STARLIGHT_DISK"
        ] as any[];

        const craftRes = AncientRunicGlassLensGrindingBenchEngine.grindLens(
            bench,
            "CELESTIAL_VOID_STARGAZER_MONOCULAR",
            initialDisks,
            0.1, // Success roll
            1.0, // Clarity roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.lens?.recipeType).toBe("CELESTIAL_VOID_STARGAZER_MONOCULAR");
        expect(craftRes.lens?.opticalClarityPercent).toBe(100);
        expect(craftRes.lens?.finalReconnaissanceRangePercent).toBe(100); // 85 * 1.20 = 102 -> clamped to 100%
        expect(craftRes.lens?.finalTrueSightDetectionPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.lens?.consumedGlassCount).toBe(2);
        expect(craftRes.lens?.consumedGlassType).toBe("CELESTIAL_VOID_STARLIGHT_DISK");
        expect(craftRes.lens?.remainingProvidedGlass.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicGlassLensGrindingBenchEngine.constructBench("optician_wear", "CEDAR_LENS_GRINDING_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassLensGrindingBenchEngine.grindLens(
            bench,
            "SURVEYOR_SPYGLASS_LENS",
            ["FLINT_GLASS_BLANK", "FLINT_GLASS_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(bench.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicGlassLensGrindingBenchEngine.grindLens(
            bench,
            "SURVEYOR_SPYGLASS_LENS",
            ["FLINT_GLASS_BLANK", "FLINT_GLASS_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("wobbling or lacks durability");
    });

    it("rejects crafting when insufficient glass is provided", () => {
        const bench = AncientRunicGlassLensGrindingBenchEngine.constructBench("optician_02", "CEDAR_LENS_GRINDING_BENCH");

        const failRes = AncientRunicGlassLensGrindingBenchEngine.grindLens(
            bench,
            "ASTROLOGER_SEXTANT_PRISM",
            ["QUARTZ_CRYSTAL_PRISM"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient glass");
        expect(bench.currentDurability).toBe(75);
    });

    it("handles pitted disk failure roll consuming durability and glass blanks", () => {
        const bench = AncientRunicGlassLensGrindingBenchEngine.constructBench("optician_03", "CEDAR_LENS_GRINDING_BENCH"); // 85% success

        const fail = AncientRunicGlassLensGrindingBenchEngine.grindLens(
            bench,
            "SURVEYOR_SPYGLASS_LENS",
            ["FLINT_GLASS_BLANK", "FLINT_GLASS_BLANK", "FLINT_GLASS_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("pitted");
        expect(fail.remainingProvidedGlass?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicGlassLensGrindingBenchEngine.constructBench("optician_04", "CEDAR_LENS_GRINDING_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassLensGrindingBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassLensGrindingBenchEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicGlassLensGrindingBenchEngine.constructBench("o", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported grinding bench type"
        );

        const invalidBench: ActiveGrindingBench = {
            benchId: "bad",
            opticianPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            grindingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicGlassLensGrindingBenchEngine.grindLens(invalidBench, "SURVEYOR_SPYGLASS_LENS", ["FLINT_GLASS_BLANK", "FLINT_GLASS_BLANK"]).success).toBe(false);
        expect(AncientRunicGlassLensGrindingBenchEngine.grindLens(null as any, "SURVEYOR_SPYGLASS_LENS", []).success).toBe(false);
        expect(AncientRunicGlassLensGrindingBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});