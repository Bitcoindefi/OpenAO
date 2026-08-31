import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassOpticalPeriscopeEngine,
    ActivePeriscopeBench,
} from "../lib/ancientRunicGlassOpticalPeriscope";

describe("AncientRunicGlassOpticalPeriscopeEngine Periscope Benches & Reconnaissance Scopes", () => {
    it("assembles Celestial Void Seraphic Omniscient Periscope in Horizon Sanctum achieving 100% clarity and returns spliced materials", () => {
        const bench = AncientRunicGlassOpticalPeriscopeEngine.constructBench("glazier_01", "CELESTIAL_VOID_HORIZON_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_HORIZON_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialMaterials = [
            "CELESTIAL_VOID_OMNISCIENT_STARLIGHT_PRISM",
            "CELESTIAL_VOID_OMNISCIENT_STARLIGHT_PRISM",
            "CELESTIAL_VOID_OMNISCIENT_STARLIGHT_PRISM"
        ] as any[];

        const craftRes = AncientRunicGlassOpticalPeriscopeEngine.assemblePeriscope(
            bench,
            "CELESTIAL_VOID_SERAPHIC_OMNISCIENT_PERISCOPE",
            initialMaterials,
            0.1, // Success roll
            1.0, // Clarity roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.periscope?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_OMNISCIENT_PERISCOPE");
        expect(craftRes.periscope?.reconnaissanceClarityPercent).toBe(100);
        expect(craftRes.periscope?.finalTrueVisionRadiusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.periscope?.finalStealthDetectionPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.periscope?.consumedMaterialCount).toBe(2);
        expect(craftRes.periscope?.consumedMaterialType).toBe("CELESTIAL_VOID_OMNISCIENT_STARLIGHT_PRISM");
        expect(craftRes.periscope?.remainingProvidedPrisms.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range clarity roll and sub-100% quality scaling on Cedar bench", () => {
        const bench = AncientRunicGlassOpticalPeriscopeEngine.constructBench("glazier_mid", "CEDAR_PERISCOPE_ASSEMBLY_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeClarityRoll = 0.5 -> 0.5 * 40 = 20
        // clarityScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalVision = Math.round(20 * 0.936) = 19
        // finalStealth = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicGlassOpticalPeriscopeEngine.assemblePeriscope(
            bench,
            "SCOUT_HORIZON_SIGHT_PERISCOPE",
            ["SILICA_PRISM_REFLECTION_PLATE", "SILICA_PRISM_REFLECTION_PLATE"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.periscope?.reconnaissanceClarityPercent).toBe(34);
        expect(craftRes.periscope?.finalTrueVisionRadiusPercent).toBe(19);
        expect(craftRes.periscope?.finalStealthDetectionPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicGlassOpticalPeriscopeEngine.constructBench("glazier_wear", "CEDAR_PERISCOPE_ASSEMBLY_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassOpticalPeriscopeEngine.assemblePeriscope(
            bench,
            "SCOUT_HORIZON_SIGHT_PERISCOPE",
            ["SILICA_PRISM_REFLECTION_PLATE", "SILICA_PRISM_REFLECTION_PLATE"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(bench.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicGlassOpticalPeriscopeEngine.assemblePeriscope(
            bench,
            "SCOUT_HORIZON_SIGHT_PERISCOPE",
            ["SILICA_PRISM_REFLECTION_PLATE", "SILICA_PRISM_REFLECTION_PLATE"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("misaligned or lacks durability");
        expect(res2.remainingProvidedPrisms.length).toBe(2);
    });

    it("rejects crafting when insufficient material is provided and returns provided materials", () => {
        const bench = AncientRunicGlassOpticalPeriscopeEngine.constructBench("glazier_02", "CEDAR_PERISCOPE_ASSEMBLY_BENCH");

        const failRes = AncientRunicGlassOpticalPeriscopeEngine.assemblePeriscope(
            bench,
            "SUBTERRANEAN_TRENCH_VIEW_SCOPE",
            ["ARMORED_BRASS_TUBE_BLANK"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient material");
        expect(failRes.remainingProvidedPrisms.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles prism cracked failure roll consuming durability and materials", () => {
        const bench = AncientRunicGlassOpticalPeriscopeEngine.constructBench("glazier_03", "CEDAR_PERISCOPE_ASSEMBLY_BENCH"); // 85% success

        const fail = AncientRunicGlassOpticalPeriscopeEngine.assemblePeriscope(
            bench,
            "SCOUT_HORIZON_SIGHT_PERISCOPE",
            ["SILICA_PRISM_REFLECTION_PLATE", "SILICA_PRISM_REFLECTION_PLATE", "SILICA_PRISM_REFLECTION_PLATE"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("cracked");
        expect(fail.remainingProvidedPrisms?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicGlassOpticalPeriscopeEngine.constructBench("glazier_04", "CEDAR_PERISCOPE_ASSEMBLY_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassOpticalPeriscopeEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassOpticalPeriscopeEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicGlassOpticalPeriscopeEngine.constructBench("g", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported periscope bench type"
        );

        const invalidBench: ActivePeriscopeBench = {
            benchId: "bad",
            glazierPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicGlassOpticalPeriscopeEngine.assemblePeriscope(invalidBench, "SCOUT_HORIZON_SIGHT_PERISCOPE", ["SILICA_PRISM_REFLECTION_PLATE", "SILICA_PRISM_REFLECTION_PLATE"]).success).toBe(false);
        expect(AncientRunicGlassOpticalPeriscopeEngine.assemblePeriscope(null as any, "SCOUT_HORIZON_SIGHT_PERISCOPE", []).success).toBe(false);
        expect(AncientRunicGlassOpticalPeriscopeEngine.maintainBench(null as any).success).toBe(false);
    });
});