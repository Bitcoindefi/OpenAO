import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseSaddleBagsBenchEngine } from "../lib/ancientRunicLeatherHorseSaddleBagsBench";
import type { ActiveSaddleBagsBench } from "../lib/ancientRunicLeatherHorseSaddleBagsBench";

describe("AncientRunicLeatherHorseSaddleBagsBenchEngine Pannier Strap Stitching Benches & Flap Clasp Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Saddle Bags in Expedition Sanctum achieving 100% balance and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseSaddleBagsBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_EXPEDITION_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_EXPEDITION_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_BAG_PELT",
            "CELESTIAL_VOID_ASTRAL_BAG_PELT",
            "CELESTIAL_VOID_ASTRAL_BAG_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseSaddleBagsBenchEngine.craftSaddleBags(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SADDLE_BAGS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Balance roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddleBags?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SADDLE_BAGS");
        expect(craftRes.saddleBags?.payloadBalancePercent).toBe(100);
        expect(craftRes.saddleBags?.finalPayloadSwayMitigationPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.saddleBags?.finalCargoVolumeCapacityBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.saddleBags?.consumedLeatherCount).toBe(2);
        expect(craftRes.saddleBags?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_BAG_PELT");
        expect(craftRes.saddleBags?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range balance roll and sub-100% quality scaling on Elder saddle bags bench", () => {
        const bench = AncientRunicLeatherHorseSaddleBagsBenchEngine.constructBench("leather_mid", "ELDER_SADDLE_BAGS_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeBalanceRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalSwayMitigation = Math.round(24 * 0.944) = 23
        // finalCargoBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseSaddleBagsBenchEngine.craftSaddleBags(
            bench,
            "NOVICE_EXPEDITION_TRAIL_SADDLE_BAGS",
            ["TANNED_BUFFALO_PANNIER_STRAP", "TANNED_BUFFALO_PANNIER_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddleBags?.payloadBalancePercent).toBe(36);
        expect(craftRes.saddleBags?.finalPayloadSwayMitigationPercent).toBe(23);
        expect(craftRes.saddleBags?.finalCargoVolumeCapacityBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseSaddleBagsBenchEngine.constructBench("leather_wear", "ELDER_SADDLE_BAGS_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseSaddleBagsBenchEngine.craftSaddleBags(
            bench,
            "NOVICE_EXPEDITION_TRAIL_SADDLE_BAGS",
            ["TANNED_BUFFALO_PANNIER_STRAP", "TANNED_BUFFALO_PANNIER_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseSaddleBagsBenchEngine.craftSaddleBags(
            res1.updatedBench!,
            "NOVICE_EXPEDITION_TRAIL_SADDLE_BAGS",
            ["TANNED_BUFFALO_PANNIER_STRAP", "TANNED_BUFFALO_PANNIER_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseSaddleBagsBenchEngine.constructBench("leather_02", "ELDER_SADDLE_BAGS_BENCH");

        const failRes = AncientRunicLeatherHorseSaddleBagsBenchEngine.craftSaddleBags(
            bench,
            "WARMASTER_MITHRIL_FLAP_SADDLE_BAGS",
            ["TEMPERED_MITHRIL_FLAP_CLASP_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient pannier straps/flap clasps");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles pannier strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseSaddleBagsBenchEngine.constructBench("leather_03", "ELDER_SADDLE_BAGS_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseSaddleBagsBenchEngine.craftSaddleBags(
            bench,
            "NOVICE_EXPEDITION_TRAIL_SADDLE_BAGS",
            ["TANNED_BUFFALO_PANNIER_STRAP", "TANNED_BUFFALO_PANNIER_STRAP", "TANNED_BUFFALO_PANNIER_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseSaddleBagsBenchEngine.constructBench("leather_04", "ELDER_SADDLE_BAGS_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseSaddleBagsBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseSaddleBagsBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseSaddleBagsBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse saddle bags bench type"
        );

        const invalidBench: ActiveSaddleBagsBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseSaddleBagsBenchEngine.craftSaddleBags(invalidBench, "NOVICE_EXPEDITION_TRAIL_SADDLE_BAGS", ["TANNED_BUFFALO_PANNIER_STRAP", "TANNED_BUFFALO_PANNIER_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseSaddleBagsBenchEngine.craftSaddleBags(null as any, "NOVICE_EXPEDITION_TRAIL_SADDLE_BAGS", []).success).toBe(false);
        expect(AncientRunicLeatherHorseSaddleBagsBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
