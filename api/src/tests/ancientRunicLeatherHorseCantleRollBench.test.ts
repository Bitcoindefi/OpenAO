import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseCantleRollBenchEngine } from "../lib/ancientRunicLeatherHorseCantleRollBench";
import type { ActiveCantleRollBench } from "../lib/ancientRunicLeatherHorseCantleRollBench";

describe("AncientRunicLeatherHorseCantleRollBenchEngine Cantle Bedroll Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Cantle Roll in Cantle Sanctum achieving 100% anchor stability and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseCantleRollBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_CANTLE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_CANTLE_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_CANTLE_PELT",
            "CELESTIAL_VOID_ASTRAL_CANTLE_PELT",
            "CELESTIAL_VOID_ASTRAL_CANTLE_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseCantleRollBenchEngine.craftCantleRoll(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CANTLE_ROLL",
            initialLeathers,
            0.1, // Success roll
            1.0, // Anchor roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.cantleRoll?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CANTLE_ROLL");
        expect(craftRes.cantleRoll?.cantleAnchorStabilityPercent).toBe(100);
        expect(craftRes.cantleRoll?.finalBedrollStorageCapacityPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.cantleRoll?.finalLumbarSupportBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.cantleRoll?.consumedLeatherCount).toBe(2);
        expect(craftRes.cantleRoll?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_CANTLE_PELT");
        expect(craftRes.cantleRoll?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range anchor roll and sub-100% quality scaling on Elder cantle roll bench", () => {
        const bench = AncientRunicLeatherHorseCantleRollBenchEngine.constructBench("leather_mid", "ELDER_CANTLE_ROLL_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeAnchorRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalStorage = Math.round(24 * 0.944) = 23
        // finalLumbar = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseCantleRollBenchEngine.craftCantleRoll(
            bench,
            "NOVICE_EXPEDITION_CANTLE_ROLL",
            ["TANNED_BUFFALO_CANTLE_ROLL_STRAP", "TANNED_BUFFALO_CANTLE_ROLL_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.cantleRoll?.cantleAnchorStabilityPercent).toBe(36);
        expect(craftRes.cantleRoll?.finalBedrollStorageCapacityPercent).toBe(23);
        expect(craftRes.cantleRoll?.finalLumbarSupportBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseCantleRollBenchEngine.constructBench("leather_wear", "ELDER_CANTLE_ROLL_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseCantleRollBenchEngine.craftCantleRoll(
            bench,
            "NOVICE_EXPEDITION_CANTLE_ROLL",
            ["TANNED_BUFFALO_CANTLE_ROLL_STRAP", "TANNED_BUFFALO_CANTLE_ROLL_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseCantleRollBenchEngine.craftCantleRoll(
            res1.updatedBench!,
            "NOVICE_EXPEDITION_CANTLE_ROLL",
            ["TANNED_BUFFALO_CANTLE_ROLL_STRAP", "TANNED_BUFFALO_CANTLE_ROLL_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseCantleRollBenchEngine.constructBench("leather_02", "ELDER_CANTLE_ROLL_BENCH");

        const failRes = AncientRunicLeatherHorseCantleRollBenchEngine.craftCantleRoll(
            bench,
            "WARMASTER_MITHRIL_BUCKLED_CANTLE_ROLL",
            ["TEMPERED_MITHRIL_CANTLE_BUCKLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient cantle roll straps/buckle sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles cantle roll strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseCantleRollBenchEngine.constructBench("leather_03", "ELDER_CANTLE_ROLL_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseCantleRollBenchEngine.craftCantleRoll(
            bench,
            "NOVICE_EXPEDITION_CANTLE_ROLL",
            ["TANNED_BUFFALO_CANTLE_ROLL_STRAP", "TANNED_BUFFALO_CANTLE_ROLL_STRAP", "TANNED_BUFFALO_CANTLE_ROLL_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseCantleRollBenchEngine.constructBench("leather_04", "ELDER_CANTLE_ROLL_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseCantleRollBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseCantleRollBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseCantleRollBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse cantle roll bench type"
        );

        const invalidBench: ActiveCantleRollBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseCantleRollBenchEngine.craftCantleRoll(invalidBench, "NOVICE_EXPEDITION_CANTLE_ROLL", ["TANNED_BUFFALO_CANTLE_ROLL_STRAP", "TANNED_BUFFALO_CANTLE_ROLL_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseCantleRollBenchEngine.craftCantleRoll(null as any, "NOVICE_EXPEDITION_CANTLE_ROLL", []).success).toBe(false);
        expect(AncientRunicLeatherHorseCantleRollBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
