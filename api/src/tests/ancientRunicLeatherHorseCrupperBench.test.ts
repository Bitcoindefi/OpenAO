import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseCrupperBenchEngine } from "../lib/ancientRunicLeatherHorseCrupperBench";
import type { ActiveCrupperBench } from "../lib/ancientRunicLeatherHorseCrupperBench";

describe("AncientRunicLeatherHorseCrupperBenchEngine Caudal Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Crupper in Caudal Sanctum achieving 100% stability and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseCrupperBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_CAUDAL_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_CAUDAL_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_VALKYRIE_TAIL_PELT",
            "CELESTIAL_VOID_ASTRAL_VALKYRIE_TAIL_PELT",
            "CELESTIAL_VOID_ASTRAL_VALKYRIE_TAIL_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseCrupperBenchEngine.craftCrupper(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.crupper?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER");
        expect(craftRes.crupper?.caudalStabilityPercent).toBe(100);
        expect(craftRes.crupper?.finalCaudalStabilityBonusPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.crupper?.finalForwardSaddleSlipMitigationPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.crupper?.consumedLeatherCount).toBe(2);
        expect(craftRes.crupper?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_VALKYRIE_TAIL_PELT");
        expect(craftRes.crupper?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Ash horse crupper bench", () => {
        const bench = AncientRunicLeatherHorseCrupperBenchEngine.constructBench("leather_mid", "ASH_HORSE_CRUPPER_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeStabilityRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalStabilityBonus = Math.round(24 * 0.944) = 23
        // finalSlipMitigate = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseCrupperBenchEngine.craftCrupper(
            bench,
            "NOVICE_CAVALRY_DOCK_CRUPPER",
            ["TANNED_ELK_HIDE_CRUPPER_STRAP", "TANNED_ELK_HIDE_CRUPPER_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.crupper?.caudalStabilityPercent).toBe(36);
        expect(craftRes.crupper?.finalCaudalStabilityBonusPercent).toBe(23);
        expect(craftRes.crupper?.finalForwardSaddleSlipMitigationPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseCrupperBenchEngine.constructBench("leather_wear", "ASH_HORSE_CRUPPER_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseCrupperBenchEngine.craftCrupper(
            bench,
            "NOVICE_CAVALRY_DOCK_CRUPPER",
            ["TANNED_ELK_HIDE_CRUPPER_STRAP", "TANNED_ELK_HIDE_CRUPPER_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseCrupperBenchEngine.craftCrupper(
            res1.updatedBench!,
            "NOVICE_CAVALRY_DOCK_CRUPPER",
            ["TANNED_ELK_HIDE_CRUPPER_STRAP", "TANNED_ELK_HIDE_CRUPPER_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseCrupperBenchEngine.constructBench("leather_02", "ASH_HORSE_CRUPPER_BENCH");

        const failRes = AncientRunicLeatherHorseCrupperBenchEngine.craftCrupper(
            bench,
            "WARMASTER_MITHRIL_DOCK_CRUPPER",
            ["TEMPERED_MITHRIL_DOCK_BUCKLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient crupper straps/dock buckle sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles dock loop misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseCrupperBenchEngine.constructBench("leather_03", "ASH_HORSE_CRUPPER_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseCrupperBenchEngine.craftCrupper(
            bench,
            "NOVICE_CAVALRY_DOCK_CRUPPER",
            ["TANNED_ELK_HIDE_CRUPPER_STRAP", "TANNED_ELK_HIDE_CRUPPER_STRAP", "TANNED_ELK_HIDE_CRUPPER_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseCrupperBenchEngine.constructBench("leather_04", "ASH_HORSE_CRUPPER_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseCrupperBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseCrupperBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseCrupperBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse crupper bench type"
        );

        const invalidBench: ActiveCrupperBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseCrupperBenchEngine.craftCrupper(invalidBench, "NOVICE_CAVALRY_DOCK_CRUPPER", ["TANNED_ELK_HIDE_CRUPPER_STRAP", "TANNED_ELK_HIDE_CRUPPER_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseCrupperBenchEngine.craftCrupper(null as any, "NOVICE_CAVALRY_DOCK_CRUPPER", []).success).toBe(false);
        expect(AncientRunicLeatherHorseCrupperBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
