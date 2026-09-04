import { describe, it, expect } from "vitest";
import { AncientRunicLeatherBeastMuzzleBenchEngine } from "../lib/ancientRunicLeatherBeastMuzzleBench";
import type { ActiveBeastMuzzleBench } from "../lib/ancientRunicLeatherBeastMuzzleBench";

describe("AncientRunicLeatherBeastMuzzleBenchEngine Muzzle Benches & War Harnesses", () => {
    it("crafts Celestial Void Seraphic Apex Frenzy Collar in Apex Sanctum achieving 100% suppression and returns spliced leathers", () => {
        const bench = AncientRunicLeatherBeastMuzzleBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_APEX_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_APEX_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_APEX_BEAST_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_APEX_BEAST_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_APEX_BEAST_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherBeastMuzzleBenchEngine.craftMuzzle(
            bench,
            "CELESTIAL_VOID_SERAPHIC_APEX_FRENZY_COLLAR",
            initialLeathers,
            0.1, // Success roll
            1.0, // Suppression roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.muzzle?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_APEX_FRENZY_COLLAR");
        expect(craftRes.muzzle?.feralBiteSuppressionPercent).toBe(100);
        expect(craftRes.muzzle?.finalCompanionBitePunctureBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.muzzle?.finalCompanionWildFrenzyMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.muzzle?.consumedLeatherCount).toBe(2);
        expect(craftRes.muzzle?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_APEX_BEAST_LEATHER");
        expect(craftRes.muzzle?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range suppression roll and sub-100% quality scaling on Oak beast muzzle bench", () => {
        const bench = AncientRunicLeatherBeastMuzzleBenchEngine.constructBench("leather_mid", "OAK_BEAST_MUZZLE_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeSuppressionRoll = 0.5 -> 0.5 * 40 = 20
        // suppressionScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalBiteBonus = Math.round(20 * 0.936) = 19
        // finalFrenzyMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherBeastMuzzleBenchEngine.craftMuzzle(
            bench,
            "HOUND_TRAINING_RESTRAINT_MUZZLE",
            ["TANNED_DIREWOLF_HIDE_MUZZLE_BLANK", "TANNED_DIREWOLF_HIDE_MUZZLE_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.muzzle?.feralBiteSuppressionPercent).toBe(34);
        expect(craftRes.muzzle?.finalCompanionBitePunctureBonusPercent).toBe(19);
        expect(craftRes.muzzle?.finalCompanionWildFrenzyMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherBeastMuzzleBenchEngine.constructBench("leather_wear", "OAK_BEAST_MUZZLE_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherBeastMuzzleBenchEngine.craftMuzzle(
            bench,
            "HOUND_TRAINING_RESTRAINT_MUZZLE",
            ["TANNED_DIREWOLF_HIDE_MUZZLE_BLANK", "TANNED_DIREWOLF_HIDE_MUZZLE_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherBeastMuzzleBenchEngine.craftMuzzle(
            res1.updatedBench!,
            "HOUND_TRAINING_RESTRAINT_MUZZLE",
            ["TANNED_DIREWOLF_HIDE_MUZZLE_BLANK", "TANNED_DIREWOLF_HIDE_MUZZLE_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherBeastMuzzleBenchEngine.constructBench("leather_02", "OAK_BEAST_MUZZLE_BENCH");

        const failRes = AncientRunicLeatherBeastMuzzleBenchEngine.craftMuzzle(
            bench,
            "WAR_BEAST_SPIKED_BATTLE_HARNESS",
            ["ADAMANTINE_SPIKE_RIVETED_RING_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient beast muzzle leather/spikes");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles jaw strap sheared failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherBeastMuzzleBenchEngine.constructBench("leather_03", "OAK_BEAST_MUZZLE_BENCH"); // 85% success

        const fail = AncientRunicLeatherBeastMuzzleBenchEngine.craftMuzzle(
            bench,
            "HOUND_TRAINING_RESTRAINT_MUZZLE",
            ["TANNED_DIREWOLF_HIDE_MUZZLE_BLANK", "TANNED_DIREWOLF_HIDE_MUZZLE_BLANK", "TANNED_DIREWOLF_HIDE_MUZZLE_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("sheared");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherBeastMuzzleBenchEngine.constructBench("leather_04", "OAK_BEAST_MUZZLE_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherBeastMuzzleBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherBeastMuzzleBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherBeastMuzzleBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported beast muzzle bench type"
        );

        const invalidBench: ActiveBeastMuzzleBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherBeastMuzzleBenchEngine.craftMuzzle(invalidBench, "HOUND_TRAINING_RESTRAINT_MUZZLE", ["TANNED_DIREWOLF_HIDE_MUZZLE_BLANK", "TANNED_DIREWOLF_HIDE_MUZZLE_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherBeastMuzzleBenchEngine.craftMuzzle(null as any, "HOUND_TRAINING_RESTRAINT_MUZZLE", []).success).toBe(false);
        expect(AncientRunicLeatherBeastMuzzleBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});