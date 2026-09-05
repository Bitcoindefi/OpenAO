import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseMartingaleBenchEngine } from "../lib/ancientRunicLeatherHorseMartingaleBench";
import type { ActiveMartingaleBench } from "../lib/ancientRunicLeatherHorseMartingaleBench";

describe("AncientRunicLeatherHorseMartingaleBenchEngine Carriage Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Martingale in Carriage Sanctum achieving 100% control and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseMartingaleBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_CARRIAGE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_CARRIAGE_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_MARTINGALE_PELT",
            "CELESTIAL_VOID_ASTRAL_MARTINGALE_PELT",
            "CELESTIAL_VOID_ASTRAL_MARTINGALE_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseMartingaleBenchEngine.craftMartingale(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_MARTINGALE",
            initialLeathers,
            0.1, // Success roll
            1.0, // Carriage roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.martingale?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_MARTINGALE");
        expect(craftRes.martingale?.headCarriagePercent).toBe(100);
        expect(craftRes.martingale?.finalHeadTossMitigationPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.martingale?.finalBitComplianceBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.martingale?.consumedLeatherCount).toBe(2);
        expect(craftRes.martingale?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_MARTINGALE_PELT");
        expect(craftRes.martingale?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range control roll and sub-100% quality scaling on Ash horse martingale bench", () => {
        const bench = AncientRunicLeatherHorseMartingaleBenchEngine.constructBench("leather_mid", "ASH_HORSE_MARTINGALE_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeCarriageRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalHeadTossBonus = Math.round(24 * 0.944) = 23
        // finalBitComplianceBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseMartingaleBenchEngine.craftMartingale(
            bench,
            "NOVICE_RUNNING_MARTINGALE",
            ["TANNED_DEER_HIDE_MARTINGALE_STRAP", "TANNED_DEER_HIDE_MARTINGALE_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.martingale?.headCarriagePercent).toBe(36);
        expect(craftRes.martingale?.finalHeadTossMitigationPercent).toBe(23);
        expect(craftRes.martingale?.finalBitComplianceBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseMartingaleBenchEngine.constructBench("leather_wear", "ASH_HORSE_MARTINGALE_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseMartingaleBenchEngine.craftMartingale(
            bench,
            "NOVICE_RUNNING_MARTINGALE",
            ["TANNED_DEER_HIDE_MARTINGALE_STRAP", "TANNED_DEER_HIDE_MARTINGALE_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseMartingaleBenchEngine.craftMartingale(
            res1.updatedBench!,
            "NOVICE_RUNNING_MARTINGALE",
            ["TANNED_DEER_HIDE_MARTINGALE_STRAP", "TANNED_DEER_HIDE_MARTINGALE_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseMartingaleBenchEngine.constructBench("leather_02", "ASH_HORSE_MARTINGALE_BENCH");

        const failRes = AncientRunicLeatherHorseMartingaleBenchEngine.craftMartingale(
            bench,
            "WARMASTER_MITHRIL_STANDING_MARTINGALE",
            ["TEMPERED_MITHRIL_NECK_CHAPE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient martingale straps/neck chape sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles neck strap chape misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseMartingaleBenchEngine.constructBench("leather_03", "ASH_HORSE_MARTINGALE_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseMartingaleBenchEngine.craftMartingale(
            bench,
            "NOVICE_RUNNING_MARTINGALE",
            ["TANNED_DEER_HIDE_MARTINGALE_STRAP", "TANNED_DEER_HIDE_MARTINGALE_STRAP", "TANNED_DEER_HIDE_MARTINGALE_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseMartingaleBenchEngine.constructBench("leather_04", "ASH_HORSE_MARTINGALE_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseMartingaleBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseMartingaleBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseMartingaleBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse martingale bench type"
        );

        const invalidBench: ActiveMartingaleBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseMartingaleBenchEngine.craftMartingale(invalidBench, "NOVICE_RUNNING_MARTINGALE", ["TANNED_DEER_HIDE_MARTINGALE_STRAP", "TANNED_DEER_HIDE_MARTINGALE_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseMartingaleBenchEngine.craftMartingale(null as any, "NOVICE_RUNNING_MARTINGALE", []).success).toBe(false);
        expect(AncientRunicLeatherHorseMartingaleBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
