import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassPrismSpectrographEngine,
    ActiveSpectrographBench,
} from "../lib/ancientRunicGlassPrismSpectrograph";

describe("AncientRunicGlassPrismSpectrographEngine Spectrograph Benches & Aurora Prisms", () => {
    it("calibrates Celestial Void Seraphic Aurora Spectrograph in Aurora Sanctum achieving 100% dispersion and returns spliced prisms", () => {
        const bench = AncientRunicGlassPrismSpectrographEngine.constructBench("glazier_01", "CELESTIAL_VOID_PRISMATIC_AURORA_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_PRISMATIC_AURORA_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialPrisms = [
            "CELESTIAL_VOID_RAINBOW_AURORA_PRISM",
            "CELESTIAL_VOID_RAINBOW_AURORA_PRISM",
            "CELESTIAL_VOID_RAINBOW_AURORA_PRISM"
        ] as any[];

        const craftRes = AncientRunicGlassPrismSpectrographEngine.calibrateSpectrograph(
            bench,
            "CELESTIAL_VOID_SERAPHIC_AURORA_SPECTROGRAPH",
            initialPrisms,
            0.1, // Success roll
            1.0, // Dispersion roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.spectrograph?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_AURORA_SPECTROGRAPH");
        expect(craftRes.spectrograph?.chromaticDispersionPercent).toBe(100);
        expect(craftRes.spectrograph?.finalMagicPiercePercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.spectrograph?.finalChromaticSpellCriticalPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.spectrograph?.consumedPrismCount).toBe(2);
        expect(craftRes.spectrograph?.consumedPrismType).toBe("CELESTIAL_VOID_RAINBOW_AURORA_PRISM");
        expect(craftRes.spectrograph?.remainingProvidedPrisms.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range dispersion roll and sub-100% quality scaling on Pine bench", () => {
        const bench = AncientRunicGlassPrismSpectrographEngine.constructBench("glazier_mid", "PINE_PRISM_SPECTROGRAPH_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeDispersionRoll = 0.5 -> 0.5 * 40 = 20
        // dispersionScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalPierce = Math.round(20 * 0.936) = 19
        // finalCrit = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicGlassPrismSpectrographEngine.calibrateSpectrograph(
            bench,
            "SOLAR_FLARE_DISPERSION_SPECTROGRAPH",
            ["FLINT_GLASS_TRIANGULAR_PRISM", "FLINT_GLASS_TRIANGULAR_PRISM"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.spectrograph?.chromaticDispersionPercent).toBe(34);
        expect(craftRes.spectrograph?.finalMagicPiercePercent).toBe(19);
        expect(craftRes.spectrograph?.finalChromaticSpellCriticalPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicGlassPrismSpectrographEngine.constructBench("glazier_wear", "PINE_PRISM_SPECTROGRAPH_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassPrismSpectrographEngine.calibrateSpectrograph(
            bench,
            "SOLAR_FLARE_DISPERSION_SPECTROGRAPH",
            ["FLINT_GLASS_TRIANGULAR_PRISM", "FLINT_GLASS_TRIANGULAR_PRISM"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(bench.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicGlassPrismSpectrographEngine.calibrateSpectrograph(
            bench,
            "SOLAR_FLARE_DISPERSION_SPECTROGRAPH",
            ["FLINT_GLASS_TRIANGULAR_PRISM", "FLINT_GLASS_TRIANGULAR_PRISM"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("uncalibrated or lacks durability");
        expect(res2.remainingProvidedPrisms.length).toBe(2);
    });

    it("rejects crafting when insufficient prism is provided and returns provided prisms", () => {
        const bench = AncientRunicGlassPrismSpectrographEngine.constructBench("glazier_02", "PINE_PRISM_SPECTROGRAPH_BENCH");

        const failRes = AncientRunicGlassPrismSpectrographEngine.calibrateSpectrograph(
            bench,
            "LUNAR_RAINBOW_CHROMATIC_PRISM",
            ["FLUORITE_CHROMATIC_DISPERSION_CRYSTAL"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient glass prism");
        expect(failRes.remainingProvidedPrisms.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles prism chipped failure roll consuming durability and prisms", () => {
        const bench = AncientRunicGlassPrismSpectrographEngine.constructBench("glazier_03", "PINE_PRISM_SPECTROGRAPH_BENCH"); // 85% success

        const fail = AncientRunicGlassPrismSpectrographEngine.calibrateSpectrograph(
            bench,
            "SOLAR_FLARE_DISPERSION_SPECTROGRAPH",
            ["FLINT_GLASS_TRIANGULAR_PRISM", "FLINT_GLASS_TRIANGULAR_PRISM", "FLINT_GLASS_TRIANGULAR_PRISM"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("chipped");
        expect(fail.remainingProvidedPrisms?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicGlassPrismSpectrographEngine.constructBench("glazier_04", "PINE_PRISM_SPECTROGRAPH_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassPrismSpectrographEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassPrismSpectrographEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicGlassPrismSpectrographEngine.constructBench("g", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported spectrograph bench type"
        );

        const invalidBench: ActiveSpectrographBench = {
            benchId: "bad",
            glazierPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicGlassPrismSpectrographEngine.calibrateSpectrograph(invalidBench, "SOLAR_FLARE_DISPERSION_SPECTROGRAPH", ["FLINT_GLASS_TRIANGULAR_PRISM", "FLINT_GLASS_TRIANGULAR_PRISM"]).success).toBe(false);
        expect(AncientRunicGlassPrismSpectrographEngine.calibrateSpectrograph(null as any, "SOLAR_FLARE_DISPERSION_SPECTROGRAPH", []).success).toBe(false);
        expect(AncientRunicGlassPrismSpectrographEngine.maintainBench(null as any).success).toBe(false);
    });
});