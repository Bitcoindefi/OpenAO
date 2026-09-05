import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseReinsBenchEngine } from "../lib/ancientRunicLeatherHorseReinsBench";
import type { ActiveReinsBench } from "../lib/ancientRunicLeatherHorseReinsBench";

describe("AncientRunicLeatherHorseReinsBenchEngine Steerage Benches & Bridle Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Reins in Steerage Sanctum achieving 100% responsiveness and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_STEERAGE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_STEERAGE_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_REIN_PELT",
            "CELESTIAL_VOID_ASTRAL_REIN_PELT",
            "CELESTIAL_VOID_ASTRAL_REIN_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Responsiveness roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.reins?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS");
        expect(craftRes.reins?.steerageResponsivenessPercent).toBe(100);
        expect(craftRes.reins?.finalTurningLagMitigationPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.reins?.finalSteeragePrecisionBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.reins?.consumedLeatherCount).toBe(2);
        expect(craftRes.reins?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_REIN_PELT");
        expect(craftRes.reins?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range responsiveness roll and sub-100% quality scaling on Yew reins bench", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_mid", "YEW_REINS_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeRespRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalLagMitigation = Math.round(24 * 0.944) = 23
        // finalPrecisionBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "NOVICE_TRAIL_SPLIT_REINS",
            ["TANNED_BUFFALO_SPLIT_REIN_STRAP", "TANNED_BUFFALO_SPLIT_REIN_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.reins?.steerageResponsivenessPercent).toBe(36);
        expect(craftRes.reins?.finalTurningLagMitigationPercent).toBe(23);
        expect(craftRes.reins?.finalSteeragePrecisionBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_wear", "YEW_REINS_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "NOVICE_TRAIL_SPLIT_REINS",
            ["TANNED_BUFFALO_SPLIT_REIN_STRAP", "TANNED_BUFFALO_SPLIT_REIN_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            res1.updatedBench!,
            "NOVICE_TRAIL_SPLIT_REINS",
            ["TANNED_BUFFALO_SPLIT_REIN_STRAP", "TANNED_BUFFALO_SPLIT_REIN_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_02", "YEW_REINS_BENCH");

        const failRes = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "WARMASTER_MITHRIL_COUPLING_REINS",
            ["TEMPERED_MITHRIL_BIT_COUPLING_CLASP"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient rein straps/bit clasps");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles rein braid misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_03", "YEW_REINS_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "NOVICE_TRAIL_SPLIT_REINS",
            ["TANNED_BUFFALO_SPLIT_REIN_STRAP", "TANNED_BUFFALO_SPLIT_REIN_STRAP", "TANNED_BUFFALO_SPLIT_REIN_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_04", "YEW_REINS_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseReinsBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseReinsBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseReinsBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse reins bench type"
        );

        const invalidBench: ActiveReinsBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseReinsBenchEngine.craftReins(invalidBench, "NOVICE_TRAIL_SPLIT_REINS", ["TANNED_BUFFALO_SPLIT_REIN_STRAP", "TANNED_BUFFALO_SPLIT_REIN_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseReinsBenchEngine.craftReins(null as any, "NOVICE_TRAIL_SPLIT_REINS", []).success).toBe(false);
        expect(AncientRunicLeatherHorseReinsBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
