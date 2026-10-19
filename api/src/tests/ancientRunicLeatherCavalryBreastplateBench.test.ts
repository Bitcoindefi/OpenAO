import { describe, it, expect } from "vitest";
import { AncientRunicLeatherCavalryBreastplateBenchEngine } from "../lib/ancientRunicLeatherCavalryBreastplateBench";
import type { ActiveBreastplateBench } from "../lib/ancientRunicLeatherCavalryBreastplateBench";

describe("AncientRunicLeatherCavalryBreastplateBenchEngine Harness Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Breastguard in Sanctum achieving 100% impact mitigation and returns spliced pelts", () => {
        const bench = AncientRunicLeatherCavalryBreastplateBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM");
        expect(bench.currentDurability).toBe(340);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_VALKYRIE_PELT",
            "CELESTIAL_VOID_ASTRAL_VALKYRIE_PELT",
            "CELESTIAL_VOID_ASTRAL_VALKYRIE_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherCavalryBreastplateBenchEngine.craftBreastplate(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTGUARD",
            initialLeathers,
            0.1, // Success roll
            1.0, // Mitigation roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.breastplate?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTGUARD");
        expect(craftRes.breastplate?.steedImpactMitigationPercent).toBe(100);
        expect(craftRes.breastplate?.finalChestImpactAbsorptionPercent).toBe(98); // 82 * 1.20 = 98.4 -> 98%
        expect(craftRes.breastplate?.finalLanceDeflectionPercent).toBe(74); // 62 * 1.20 = 74.4 -> 74%
        expect(craftRes.breastplate?.consumedLeatherCount).toBe(2);
        expect(craftRes.breastplate?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_VALKYRIE_PELT");
        expect(craftRes.breastplate?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(330); // 340 - 10
    });

    it("verifies mid-range mitigation roll and sub-100% quality scaling on Ash breastplate bench", () => {
        const bench = AncientRunicLeatherCavalryBreastplateBenchEngine.constructBench("leather_mid", "ASH_BREASTPLATE_BENCH");
        // powerRatio = 28/125 = 0.224, bonusPoints = (12/38)*20 = 6.3157
        // safeMitigationRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 8.96 + 6.3157) = 35
        // qualityMultiplier = 0.8 + (35/100)*0.4 = 0.94
        // finalImpactBonus = Math.round(22 * 0.94) = 21
        // finalDeflectionBonus = Math.round(12 * 0.94) = 11
        const craftRes = AncientRunicLeatherCavalryBreastplateBenchEngine.craftBreastplate(
            bench,
            "NOVICE_CAVALRY_BREASTPLATE",
            ["TANNED_BULL_HIDE_BREAST_STRAP", "TANNED_BULL_HIDE_BREAST_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.breastplate?.steedImpactMitigationPercent).toBe(35);
        expect(craftRes.breastplate?.finalChestImpactAbsorptionPercent).toBe(21);
        expect(craftRes.breastplate?.finalLanceDeflectionPercent).toBe(11);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherCavalryBreastplateBenchEngine.constructBench("leather_wear", "ASH_BREASTPLATE_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherCavalryBreastplateBenchEngine.craftBreastplate(
            bench,
            "NOVICE_CAVALRY_BREASTPLATE",
            ["TANNED_BULL_HIDE_BREAST_STRAP", "TANNED_BULL_HIDE_BREAST_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherCavalryBreastplateBenchEngine.craftBreastplate(
            res1.updatedBench!,
            "NOVICE_CAVALRY_BREASTPLATE",
            ["TANNED_BULL_HIDE_BREAST_STRAP", "TANNED_BULL_HIDE_BREAST_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherCavalryBreastplateBenchEngine.constructBench("leather_02", "ASH_BREASTPLATE_BENCH");

        const failRes = AncientRunicLeatherCavalryBreastplateBenchEngine.craftBreastplate(
            bench,
            "WARMASTER_MITHRIL_HARNESS_BREASTPLATE",
            ["TEMPERED_MITHRIL_HARNESS_BUCKLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient breastplate straps/buckle sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(90);
    });

    it("handles harness buckle misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherCavalryBreastplateBenchEngine.constructBench("leather_03", "ASH_BREASTPLATE_BENCH"); // 86% success

        const fail = AncientRunicLeatherCavalryBreastplateBenchEngine.craftBreastplate(
            bench,
            "NOVICE_CAVALRY_BREASTPLATE",
            ["TANNED_BULL_HIDE_BREAST_STRAP", "TANNED_BULL_HIDE_BREAST_STRAP", "TANNED_BULL_HIDE_BREAST_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(80); // 90 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherCavalryBreastplateBenchEngine.constructBench("leather_04", "ASH_BREASTPLATE_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherCavalryBreastplateBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherCavalryBreastplateBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherCavalryBreastplateBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported cavalry breastplate bench type"
        );

        const invalidBench: ActiveBreastplateBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherCavalryBreastplateBenchEngine.craftBreastplate(invalidBench, "NOVICE_CAVALRY_BREASTPLATE", ["TANNED_BULL_HIDE_BREAST_STRAP", "TANNED_BULL_HIDE_BREAST_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherCavalryBreastplateBenchEngine.craftBreastplate(null as any, "NOVICE_CAVALRY_BREASTPLATE", []).success).toBe(false);
        expect(AncientRunicLeatherCavalryBreastplateBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
