import { describe, it, expect } from "vitest";
import { AncientRunicLeatherStirrupLeathersBenchEngine } from "../lib/ancientRunicLeatherStirrupLeathersBench";
import type { ActiveStirrupLeathersBench } from "../lib/ancientRunicLeatherStirrupLeathersBench";

describe("AncientRunicLeatherStirrupLeathersBenchEngine Stirrup Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Aerial Stirrup in Aerial Sanctum achieving 100% balance and returns spliced leathers", () => {
        const bench = AncientRunicLeatherStirrupLeathersBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_AERIAL_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_AERIAL_SANCTUM");
        expect(bench.currentDurability).toBe(330);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_VALKYRIE_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_VALKYRIE_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_VALKYRIE_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherStirrupLeathersBenchEngine.craftStirrups(
            bench,
            "CELESTIAL_VOID_VALKYRIE_AERIAL_STIRRUP",
            initialLeathers,
            0.1, // Success roll
            1.0, // Balance roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.stirrup?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_AERIAL_STIRRUP");
        expect(craftRes.stirrup?.riderBalancePercent).toBe(100);
        expect(craftRes.stirrup?.finalRiderWeightDistributionBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.stirrup?.finalLanceShockAbsorptionMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.stirrup?.consumedLeatherCount).toBe(2);
        expect(craftRes.stirrup?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_VALKYRIE_LEATHER");
        expect(craftRes.stirrup?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(320); // 330 - 10
    });

    it("verifies mid-range balance roll and sub-100% quality scaling on Ash stirrup bench", () => {
        const bench = AncientRunicLeatherStirrupLeathersBenchEngine.constructBench("leather_mid", "ASH_STIRRUP_LEATHER_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeBalanceRoll = 0.5 -> 0.5 * 40 = 20
        // balanceScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalWeightBonus = Math.round(20 * 0.936) = 19
        // finalShockMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherStirrupLeathersBenchEngine.craftStirrups(
            bench,
            "NOVICE_MOUNTED_STIRRUP_LEATHER",
            ["TANNED_HEAVY_BUFFALO_STIRRUP_STRAP", "TANNED_HEAVY_BUFFALO_STIRRUP_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.stirrup?.riderBalancePercent).toBe(34);
        expect(craftRes.stirrup?.finalRiderWeightDistributionBonusPercent).toBe(19);
        expect(craftRes.stirrup?.finalLanceShockAbsorptionMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherStirrupLeathersBenchEngine.constructBench("leather_wear", "ASH_STIRRUP_LEATHER_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherStirrupLeathersBenchEngine.craftStirrups(
            bench,
            "NOVICE_MOUNTED_STIRRUP_LEATHER",
            ["TANNED_HEAVY_BUFFALO_STIRRUP_STRAP", "TANNED_HEAVY_BUFFALO_STIRRUP_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherStirrupLeathersBenchEngine.craftStirrups(
            res1.updatedBench!,
            "NOVICE_MOUNTED_STIRRUP_LEATHER",
            ["TANNED_HEAVY_BUFFALO_STIRRUP_STRAP", "TANNED_HEAVY_BUFFALO_STIRRUP_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherStirrupLeathersBenchEngine.constructBench("leather_02", "ASH_STIRRUP_LEATHER_BENCH");

        const failRes = AncientRunicLeatherStirrupLeathersBenchEngine.craftStirrups(
            bench,
            "WARMASTER_MITHRIL_TREAD_STIRRUP",
            ["TEMPERED_MITHRIL_TREAD_IRON_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient stirrup leather/tread sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(85);
    });

    it("handles tread iron misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherStirrupLeathersBenchEngine.constructBench("leather_03", "ASH_STIRRUP_LEATHER_BENCH"); // 85% success

        const fail = AncientRunicLeatherStirrupLeathersBenchEngine.craftStirrups(
            bench,
            "NOVICE_MOUNTED_STIRRUP_LEATHER",
            ["TANNED_HEAVY_BUFFALO_STIRRUP_STRAP", "TANNED_HEAVY_BUFFALO_STIRRUP_STRAP", "TANNED_HEAVY_BUFFALO_STIRRUP_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(75); // 85 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherStirrupLeathersBenchEngine.constructBench("leather_04", "ASH_STIRRUP_LEATHER_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherStirrupLeathersBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherStirrupLeathersBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherStirrupLeathersBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported stirrup leathers bench type"
        );

        const invalidBench: ActiveStirrupLeathersBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherStirrupLeathersBenchEngine.craftStirrups(invalidBench, "NOVICE_MOUNTED_STIRRUP_LEATHER", ["TANNED_HEAVY_BUFFALO_STIRRUP_STRAP", "TANNED_HEAVY_BUFFALO_STIRRUP_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherStirrupLeathersBenchEngine.craftStirrups(null as any, "NOVICE_MOUNTED_STIRRUP_LEATHER", []).success).toBe(false);
        expect(AncientRunicLeatherStirrupLeathersBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});