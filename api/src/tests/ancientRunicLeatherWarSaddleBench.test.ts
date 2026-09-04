import { describe, it, expect } from "vitest";
import { AncientRunicLeatherWarSaddleBenchEngine } from "../lib/ancientRunicLeatherWarSaddleBench";
import type { ActiveWarSaddleBench } from "../lib/ancientRunicLeatherWarSaddleBench";

describe("AncientRunicLeatherWarSaddleBenchEngine Cavalry Benches & War Saddles", () => {
    it("crafts Celestial Void Pegasus Sovereign War Saddle in Pegasus Sanctum achieving 100% stability and returns spliced leathers", () => {
        const bench = AncientRunicLeatherWarSaddleBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_ASTRAL_PEGASUS_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_ASTRAL_PEGASUS_SANCTUM");
        expect(bench.currentDurability).toBe(330);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_PEGASUS_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_PEGASUS_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_PEGASUS_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherWarSaddleBenchEngine.craftSaddle(
            bench,
            "CELESTIAL_VOID_PEGASUS_SOVEREIGN_WAR_SADDLE",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddle?.recipeType).toBe("CELESTIAL_VOID_PEGASUS_SOVEREIGN_WAR_SADDLE");
        expect(craftRes.saddle?.riderStabilityPercent).toBe(100);
        expect(craftRes.saddle?.finalRiderStabilityBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.saddle?.finalMountExhaustionMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.saddle?.consumedLeatherCount).toBe(2);
        expect(craftRes.saddle?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_PEGASUS_LEATHER");
        expect(craftRes.saddle?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(320); // 330 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Pine war saddle bench", () => {
        const bench = AncientRunicLeatherWarSaddleBenchEngine.constructBench("leather_mid", "PINE_WAR_SADDLE_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeStabilityRoll = 0.5 -> 0.5 * 40 = 20
        // stabilityScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalStabilityBonus = Math.round(20 * 0.936) = 19
        // finalExhaustionMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherWarSaddleBenchEngine.craftSaddle(
            bench,
            "NOVICE_CAVALRY_TREESADDLE",
            ["TANNED_MAMMOTH_HIDE_SADDLE_BLANK", "TANNED_MAMMOTH_HIDE_SADDLE_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddle?.riderStabilityPercent).toBe(34);
        expect(craftRes.saddle?.finalRiderStabilityBonusPercent).toBe(19);
        expect(craftRes.saddle?.finalMountExhaustionMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherWarSaddleBenchEngine.constructBench("leather_wear", "PINE_WAR_SADDLE_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherWarSaddleBenchEngine.craftSaddle(
            bench,
            "NOVICE_CAVALRY_TREESADDLE",
            ["TANNED_MAMMOTH_HIDE_SADDLE_BLANK", "TANNED_MAMMOTH_HIDE_SADDLE_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherWarSaddleBenchEngine.craftSaddle(
            res1.updatedBench!,
            "NOVICE_CAVALRY_TREESADDLE",
            ["TANNED_MAMMOTH_HIDE_SADDLE_BLANK", "TANNED_MAMMOTH_HIDE_SADDLE_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherWarSaddleBenchEngine.constructBench("leather_02", "PINE_WAR_SADDLE_BENCH");

        const failRes = AncientRunicLeatherWarSaddleBenchEngine.craftSaddle(
            bench,
            "KNIGHT_COMMANDER_MITHRIL_CANTLE_SADDLE",
            ["ENGRAVED_MITHRIL_POMMEL_CANTLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient saddle leather/pommel sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(85);
    });

    it("handles pommel cantle misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherWarSaddleBenchEngine.constructBench("leather_03", "PINE_WAR_SADDLE_BENCH"); // 85% success

        const fail = AncientRunicLeatherWarSaddleBenchEngine.craftSaddle(
            bench,
            "NOVICE_CAVALRY_TREESADDLE",
            ["TANNED_MAMMOTH_HIDE_SADDLE_BLANK", "TANNED_MAMMOTH_HIDE_SADDLE_BLANK", "TANNED_MAMMOTH_HIDE_SADDLE_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(75); // 85 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherWarSaddleBenchEngine.constructBench("leather_04", "PINE_WAR_SADDLE_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherWarSaddleBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherWarSaddleBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherWarSaddleBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported war saddle bench type"
        );

        const invalidBench: ActiveWarSaddleBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherWarSaddleBenchEngine.craftSaddle(invalidBench, "NOVICE_CAVALRY_TREESADDLE", ["TANNED_MAMMOTH_HIDE_SADDLE_BLANK", "TANNED_MAMMOTH_HIDE_SADDLE_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherWarSaddleBenchEngine.craftSaddle(null as any, "NOVICE_CAVALRY_TREESADDLE", []).success).toBe(false);
        expect(AncientRunicLeatherWarSaddleBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});