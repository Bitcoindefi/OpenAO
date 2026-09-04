import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseHalterBenchEngine } from "../lib/ancientRunicLeatherHorseHalterBench";
import type { ActiveHalterBench } from "../lib/ancientRunicLeatherHorseHalterBench";

describe("AncientRunicLeatherHorseHalterBenchEngine Stable Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Halter in Stable Sanctum achieving 100% control and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseHalterBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_STABLE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_STABLE_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_HALTER_PELT",
            "CELESTIAL_VOID_ASTRAL_HALTER_PELT",
            "CELESTIAL_VOID_ASTRAL_HALTER_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseHalterBenchEngine.craftHalter(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HALTER",
            initialLeathers,
            0.1, // Success roll
            1.0, // Control roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.halter?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HALTER");
        expect(craftRes.halter?.leadControlPercent).toBe(100);
        expect(craftRes.halter?.finalTetherSlipMitigationPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.halter?.finalLeadDocilityBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.halter?.consumedLeatherCount).toBe(2);
        expect(craftRes.halter?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_HALTER_PELT");
        expect(craftRes.halter?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range control roll and sub-100% quality scaling on Ash horse halter bench", () => {
        const bench = AncientRunicLeatherHorseHalterBenchEngine.constructBench("leather_mid", "ASH_HORSE_HALTER_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeControlRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalTetherBonus = Math.round(24 * 0.944) = 23
        // finalDocilityBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseHalterBenchEngine.craftHalter(
            bench,
            "NOVICE_STABLE_PADDOCK_HALTER",
            ["TANNED_MOOSE_HIDE_HALTER_STRAP", "TANNED_MOOSE_HIDE_HALTER_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.halter?.leadControlPercent).toBe(36);
        expect(craftRes.halter?.finalTetherSlipMitigationPercent).toBe(23);
        expect(craftRes.halter?.finalLeadDocilityBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseHalterBenchEngine.constructBench("leather_wear", "ASH_HORSE_HALTER_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseHalterBenchEngine.craftHalter(
            bench,
            "NOVICE_STABLE_PADDOCK_HALTER",
            ["TANNED_MOOSE_HIDE_HALTER_STRAP", "TANNED_MOOSE_HIDE_HALTER_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseHalterBenchEngine.craftHalter(
            res1.updatedBench!,
            "NOVICE_STABLE_PADDOCK_HALTER",
            ["TANNED_MOOSE_HIDE_HALTER_STRAP", "TANNED_MOOSE_HIDE_HALTER_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseHalterBenchEngine.constructBench("leather_02", "ASH_HORSE_HALTER_BENCH");

        const failRes = AncientRunicLeatherHorseHalterBenchEngine.craftHalter(
            bench,
            "WARMASTER_MITHRIL_RING_HALTER",
            ["TEMPERED_MITHRIL_NOSEBAND_RING_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient halter straps/noseband ring sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles noseband ring misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseHalterBenchEngine.constructBench("leather_03", "ASH_HORSE_HALTER_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseHalterBenchEngine.craftHalter(
            bench,
            "NOVICE_STABLE_PADDOCK_HALTER",
            ["TANNED_MOOSE_HIDE_HALTER_STRAP", "TANNED_MOOSE_HIDE_HALTER_STRAP", "TANNED_MOOSE_HIDE_HALTER_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseHalterBenchEngine.constructBench("leather_04", "ASH_HORSE_HALTER_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseHalterBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseHalterBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseHalterBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse halter bench type"
        );

        const invalidBench: ActiveHalterBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseHalterBenchEngine.craftHalter(invalidBench, "NOVICE_STABLE_PADDOCK_HALTER", ["TANNED_MOOSE_HIDE_HALTER_STRAP", "TANNED_MOOSE_HIDE_HALTER_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseHalterBenchEngine.craftHalter(null as any, "NOVICE_STABLE_PADDOCK_HALTER", []).success).toBe(false);
        expect(AncientRunicLeatherHorseHalterBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
