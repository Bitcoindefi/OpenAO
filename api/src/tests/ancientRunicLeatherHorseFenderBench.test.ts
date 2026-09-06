import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseFenderBenchEngine } from "../lib/ancientRunicLeatherHorseFenderBench";
import type { ActiveFenderBench } from "../lib/ancientRunicLeatherHorseFenderBench";

describe("AncientRunicLeatherHorseFenderBenchEngine Stirrup Fender Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Fender in Fender Sanctum achieving 100% shielding and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseFenderBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_FENDER_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_FENDER_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_FENDER_PELT",
            "CELESTIAL_VOID_ASTRAL_FENDER_PELT",
            "CELESTIAL_VOID_ASTRAL_FENDER_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseFenderBenchEngine.craftFender(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FENDER",
            initialLeathers,
            0.1, // Success roll
            1.0, // Shielding roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.fender?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FENDER");
        expect(craftRes.fender?.legShieldingPercent).toBe(100);
        expect(craftRes.fender?.finalLegFrictionProtectionPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.fender?.finalStirrupSwayMitigationBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.fender?.consumedLeatherCount).toBe(2);
        expect(craftRes.fender?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_FENDER_PELT");
        expect(craftRes.fender?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range shielding roll and sub-100% quality scaling on Elder fender bench", () => {
        const bench = AncientRunicLeatherHorseFenderBenchEngine.constructBench("leather_mid", "ELDER_FENDER_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeShieldingRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalProtection = Math.round(24 * 0.944) = 23
        // finalSwayBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseFenderBenchEngine.craftFender(
            bench,
            "NOVICE_REINFORCED_LEG_FENDER",
            ["TANNED_BUFFALO_FENDER_PANEL", "TANNED_BUFFALO_FENDER_PANEL"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.fender?.legShieldingPercent).toBe(36);
        expect(craftRes.fender?.finalLegFrictionProtectionPercent).toBe(23);
        expect(craftRes.fender?.finalStirrupSwayMitigationBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseFenderBenchEngine.constructBench("leather_wear", "ELDER_FENDER_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseFenderBenchEngine.craftFender(
            bench,
            "NOVICE_REINFORCED_LEG_FENDER",
            ["TANNED_BUFFALO_FENDER_PANEL", "TANNED_BUFFALO_FENDER_PANEL"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseFenderBenchEngine.craftFender(
            res1.updatedBench!,
            "NOVICE_REINFORCED_LEG_FENDER",
            ["TANNED_BUFFALO_FENDER_PANEL", "TANNED_BUFFALO_FENDER_PANEL"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseFenderBenchEngine.constructBench("leather_02", "ELDER_FENDER_BENCH");

        const failRes = AncientRunicLeatherHorseFenderBenchEngine.craftFender(
            bench,
            "WARMASTER_MITHRIL_SLIDER_FENDER",
            ["TEMPERED_MITHRIL_FENDER_SLIDER_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient fender panels/slider sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles fender panel misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseFenderBenchEngine.constructBench("leather_03", "ELDER_FENDER_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseFenderBenchEngine.craftFender(
            bench,
            "NOVICE_REINFORCED_LEG_FENDER",
            ["TANNED_BUFFALO_FENDER_PANEL", "TANNED_BUFFALO_FENDER_PANEL", "TANNED_BUFFALO_FENDER_PANEL"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseFenderBenchEngine.constructBench("leather_04", "ELDER_FENDER_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseFenderBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseFenderBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseFenderBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse stirrup fender bench type"
        );

        const invalidBench: ActiveFenderBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseFenderBenchEngine.craftFender(invalidBench, "NOVICE_REINFORCED_LEG_FENDER", ["TANNED_BUFFALO_FENDER_PANEL", "TANNED_BUFFALO_FENDER_PANEL"]).success).toBe(false);
        expect(AncientRunicLeatherHorseFenderBenchEngine.craftFender(null as any, "NOVICE_REINFORCED_LEG_FENDER", []).success).toBe(false);
        expect(AncientRunicLeatherHorseFenderBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
