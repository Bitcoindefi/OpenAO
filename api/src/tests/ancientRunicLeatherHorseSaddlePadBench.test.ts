import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseSaddlePadBenchEngine } from "../lib/ancientRunicLeatherHorseSaddlePadBench";
import type { ActiveSaddlePadBench } from "../lib/ancientRunicLeatherHorseSaddlePadBench";

describe("AncientRunicLeatherHorseSaddlePadBenchEngine Wither Shock Absorption Benches & Quilting Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Pad in Wither Sanctum achieving 100% absorption and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseSaddlePadBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_WITHER_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_WITHER_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_PAD_PELT",
            "CELESTIAL_VOID_ASTRAL_PAD_PELT",
            "CELESTIAL_VOID_ASTRAL_PAD_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseSaddlePadBenchEngine.craftSaddlePad(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_PAD",
            initialLeathers,
            0.1, // Success roll
            1.0, // Absorption roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddlePad?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_PAD");
        expect(craftRes.saddlePad?.witherShockAbsorptionPercent).toBe(100);
        expect(craftRes.saddlePad?.finalSpineFrictionMitigationPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.saddlePad?.finalHeatDissipationComfortBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.saddlePad?.consumedLeatherCount).toBe(2);
        expect(craftRes.saddlePad?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_PAD_PELT");
        expect(craftRes.saddlePad?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range absorption roll and sub-100% quality scaling on Linden saddle pad bench", () => {
        const bench = AncientRunicLeatherHorseSaddlePadBenchEngine.constructBench("leather_mid", "LINDEN_SADDLE_PAD_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeAbsorptionRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalFrictionMitigation = Math.round(24 * 0.944) = 23
        // finalHeatDissipationBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseSaddlePadBenchEngine.craftSaddlePad(
            bench,
            "NOVICE_SPINAL_SHOCK_SADDLE_PAD",
            ["TANNED_BUFFALO_WITHER_PAD_BLANK", "TANNED_BUFFALO_WITHER_PAD_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddlePad?.witherShockAbsorptionPercent).toBe(36);
        expect(craftRes.saddlePad?.finalSpineFrictionMitigationPercent).toBe(23);
        expect(craftRes.saddlePad?.finalHeatDissipationComfortBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseSaddlePadBenchEngine.constructBench("leather_wear", "LINDEN_SADDLE_PAD_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseSaddlePadBenchEngine.craftSaddlePad(
            bench,
            "NOVICE_SPINAL_SHOCK_SADDLE_PAD",
            ["TANNED_BUFFALO_WITHER_PAD_BLANK", "TANNED_BUFFALO_WITHER_PAD_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseSaddlePadBenchEngine.craftSaddlePad(
            res1.updatedBench!,
            "NOVICE_SPINAL_SHOCK_SADDLE_PAD",
            ["TANNED_BUFFALO_WITHER_PAD_BLANK", "TANNED_BUFFALO_WITHER_PAD_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseSaddlePadBenchEngine.constructBench("leather_02", "LINDEN_SADDLE_PAD_BENCH");

        const failRes = AncientRunicLeatherHorseSaddlePadBenchEngine.craftSaddlePad(
            bench,
            "WARMASTER_MITHRIL_QUILTED_PAD",
            ["TEMPERED_MITHRIL_QUILTING_THREAD_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient wither blanks/quilting thread");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles pad blank misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseSaddlePadBenchEngine.constructBench("leather_03", "LINDEN_SADDLE_PAD_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseSaddlePadBenchEngine.craftSaddlePad(
            bench,
            "NOVICE_SPINAL_SHOCK_SADDLE_PAD",
            ["TANNED_BUFFALO_WITHER_PAD_BLANK", "TANNED_BUFFALO_WITHER_PAD_BLANK", "TANNED_BUFFALO_WITHER_PAD_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseSaddlePadBenchEngine.constructBench("leather_04", "LINDEN_SADDLE_PAD_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseSaddlePadBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseSaddlePadBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseSaddlePadBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse saddle pad bench type"
        );

        const invalidBench: ActiveSaddlePadBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseSaddlePadBenchEngine.craftSaddlePad(invalidBench, "NOVICE_SPINAL_SHOCK_SADDLE_PAD", ["TANNED_BUFFALO_WITHER_PAD_BLANK", "TANNED_BUFFALO_WITHER_PAD_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherHorseSaddlePadBenchEngine.craftSaddlePad(null as any, "NOVICE_SPINAL_SHOCK_SADDLE_PAD", []).success).toBe(false);
        expect(AncientRunicLeatherHorseSaddlePadBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
