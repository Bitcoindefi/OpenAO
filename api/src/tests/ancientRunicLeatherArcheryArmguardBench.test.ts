import { describe, it, expect } from "vitest";
import { AncientRunicLeatherArcheryArmguardBenchEngine } from "../lib/ancientRunicLeatherArcheryArmguardBench";
import type { ActiveArcheryArmguardBench } from "../lib/ancientRunicLeatherArcheryArmguardBench";

describe("AncientRunicLeatherArcheryArmguardBenchEngine Armguard Benches & Fletcher Armguards", () => {
    it("crafts Celestial Void Seraphic Hawkeye Trueflight Armguard in Hawkeye Sanctum achieving 100% absorption and returns spliced leathers", () => {
        const bench = AncientRunicLeatherArcheryArmguardBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_HAWKEYE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_HAWKEYE_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_HAWKEYE_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_HAWKEYE_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_HAWKEYE_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherArcheryArmguardBenchEngine.craftArmguard(
            bench,
            "CELESTIAL_VOID_SERAPHIC_HAWKEYE_TRUEFLIGHT_ARMGUARD",
            initialLeathers,
            0.1, // Success roll
            1.0, // Absorption roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.armguard?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_HAWKEYE_TRUEFLIGHT_ARMGUARD");
        expect(craftRes.armguard?.bowstringSlapAbsorptionPercent).toBe(100);
        expect(craftRes.armguard?.finalRangedCriticalHitBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.armguard?.finalBowDrawFatigueMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.armguard?.consumedLeatherCount).toBe(2);
        expect(craftRes.armguard?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_HAWKEYE_LEATHER");
        expect(craftRes.armguard?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range absorption roll and sub-100% quality scaling on Oak archery armguard bench", () => {
        const bench = AncientRunicLeatherArcheryArmguardBenchEngine.constructBench("leather_mid", "OAK_ARCHERY_ARMGUARD_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeAbsorptionRoll = 0.5 -> 0.5 * 40 = 20
        // absorptionScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalRangedCrit = Math.round(20 * 0.936) = 19
        // finalFatigueMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherArcheryArmguardBenchEngine.craftArmguard(
            bench,
            "RANGER_BOWSTRING_SLAP_GUARD",
            ["TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK", "TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.armguard?.bowstringSlapAbsorptionPercent).toBe(34);
        expect(craftRes.armguard?.finalRangedCriticalHitBonusPercent).toBe(19);
        expect(craftRes.armguard?.finalBowDrawFatigueMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherArcheryArmguardBenchEngine.constructBench("leather_wear", "OAK_ARCHERY_ARMGUARD_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherArcheryArmguardBenchEngine.craftArmguard(
            bench,
            "RANGER_BOWSTRING_SLAP_GUARD",
            ["TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK", "TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherArcheryArmguardBenchEngine.craftArmguard(
            res1.updatedBench!,
            "RANGER_BOWSTRING_SLAP_GUARD",
            ["TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK", "TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherArcheryArmguardBenchEngine.constructBench("leather_02", "OAK_ARCHERY_ARMGUARD_BENCH");

        const failRes = AncientRunicLeatherArcheryArmguardBenchEngine.craftArmguard(
            bench,
            "FLETCHER_PRECISION_BRACER",
            ["CARVED_HORN_BOWSTRING_DEFLECTOR_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient archery leather/deflectors");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles horn deflector split failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherArcheryArmguardBenchEngine.constructBench("leather_03", "OAK_ARCHERY_ARMGUARD_BENCH"); // 85% success

        const fail = AncientRunicLeatherArcheryArmguardBenchEngine.craftArmguard(
            bench,
            "RANGER_BOWSTRING_SLAP_GUARD",
            ["TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK", "TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK", "TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("split");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherArcheryArmguardBenchEngine.constructBench("leather_04", "OAK_ARCHERY_ARMGUARD_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherArcheryArmguardBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherArcheryArmguardBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherArcheryArmguardBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported archery armguard bench type"
        );

        const invalidBench: ActiveArcheryArmguardBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherArcheryArmguardBenchEngine.craftArmguard(invalidBench, "RANGER_BOWSTRING_SLAP_GUARD", ["TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK", "TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherArcheryArmguardBenchEngine.craftArmguard(null as any, "RANGER_BOWSTRING_SLAP_GUARD", []).success).toBe(false);
        expect(AncientRunicLeatherArcheryArmguardBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});