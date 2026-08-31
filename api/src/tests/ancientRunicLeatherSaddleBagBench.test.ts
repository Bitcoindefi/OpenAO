import { describe, it, expect } from "vitest";
import { AncientRunicLeatherSaddleBagBenchEngine } from "../lib/ancientRunicLeatherSaddleBagBench";
import type { ActiveSaddleBagBench } from "../lib/ancientRunicLeatherSaddleBagBench";

describe("AncientRunicLeatherSaddleBagBenchEngine Saddle Bag Benches & Mount Panniers", () => {
    it("crafts Celestial Void Seraphic Dimension-Folded Mount Haversack in Caravan Sanctum achieving 100% accessibility and returns spliced leathers", () => {
        const bench = AncientRunicLeatherSaddleBagBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_CARAVAN_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_CARAVAN_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_CARAVAN_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_CARAVAN_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_CARAVAN_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherSaddleBagBenchEngine.craftSaddleBag(
            bench,
            "CELESTIAL_VOID_SERAPHIC_DIMENSION_FOLDED_MOUNT_HAVERSACK",
            initialLeathers,
            0.1, // Success roll
            1.0, // Accessibility roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddleBag?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_DIMENSION_FOLDED_MOUNT_HAVERSACK");
        expect(craftRes.saddleBag?.quicklootAccessibilityPercent).toBe(100);
        expect(craftRes.saddleBag?.finalMountCarryingCapacityBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.saddleBag?.finalMountStaminaDepletionMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.saddleBag?.consumedLeatherCount).toBe(2);
        expect(craftRes.saddleBag?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_SOVEREIGN_CARAVAN_LEATHER");
        expect(craftRes.saddleBag?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range accessibility roll and sub-100% quality scaling on Oak saddle bag bench", () => {
        const bench = AncientRunicLeatherSaddleBagBenchEngine.constructBench("leather_mid", "OAK_SADDLE_BAG_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeAccessibilityRoll = 0.5 -> 0.5 * 40 = 20
        // accessibilityScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalCapacityBonus = Math.round(20 * 0.936) = 19
        // finalStaminaMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherSaddleBagBenchEngine.craftSaddleBag(
            bench,
            "COURIER_FAST_ACCESS_SADDLE_BAG",
            ["TANNED_HORSEHIDE_PANNIER_BLANK", "TANNED_HORSEHIDE_PANNIER_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddleBag?.quicklootAccessibilityPercent).toBe(34);
        expect(craftRes.saddleBag?.finalMountCarryingCapacityBonusPercent).toBe(19);
        expect(craftRes.saddleBag?.finalMountStaminaDepletionMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherSaddleBagBenchEngine.constructBench("leather_wear", "OAK_SADDLE_BAG_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherSaddleBagBenchEngine.craftSaddleBag(
            bench,
            "COURIER_FAST_ACCESS_SADDLE_BAG",
            ["TANNED_HORSEHIDE_PANNIER_BLANK", "TANNED_HORSEHIDE_PANNIER_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherSaddleBagBenchEngine.craftSaddleBag(
            res1.updatedBench!,
            "COURIER_FAST_ACCESS_SADDLE_BAG",
            ["TANNED_HORSEHIDE_PANNIER_BLANK", "TANNED_HORSEHIDE_PANNIER_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherSaddleBagBenchEngine.constructBench("leather_02", "OAK_SADDLE_BAG_BENCH");

        const failRes = AncientRunicLeatherSaddleBagBenchEngine.craftSaddleBag(
            bench,
            "CARAVAN_HEAVY_DOUBLE_PANNIER",
            ["BRASS_RIVETED_BUCKLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient saddle bag leather/buckles");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles gusset torn failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherSaddleBagBenchEngine.constructBench("leather_03", "OAK_SADDLE_BAG_BENCH"); // 85% success

        const fail = AncientRunicLeatherSaddleBagBenchEngine.craftSaddleBag(
            bench,
            "COURIER_FAST_ACCESS_SADDLE_BAG",
            ["TANNED_HORSEHIDE_PANNIER_BLANK", "TANNED_HORSEHIDE_PANNIER_BLANK", "TANNED_HORSEHIDE_PANNIER_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("torn");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherSaddleBagBenchEngine.constructBench("leather_04", "OAK_SADDLE_BAG_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherSaddleBagBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherSaddleBagBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherSaddleBagBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported saddle bag bench type"
        );

        const invalidBench: ActiveSaddleBagBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherSaddleBagBenchEngine.craftSaddleBag(invalidBench, "COURIER_FAST_ACCESS_SADDLE_BAG", ["TANNED_HORSEHIDE_PANNIER_BLANK", "TANNED_HORSEHIDE_PANNIER_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherSaddleBagBenchEngine.craftSaddleBag(null as any, "COURIER_FAST_ACCESS_SADDLE_BAG", []).success).toBe(false);
        expect(AncientRunicLeatherSaddleBagBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});