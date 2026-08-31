import { describe, it, expect } from "vitest";
import { AncientRunicLeatherMaskHoodBenchEngine } from "../lib/ancientRunicLeatherMaskHoodBench";
import type { ActiveMaskBench } from "../lib/ancientRunicLeatherMaskHoodBench";

describe("AncientRunicLeatherMaskHoodBenchEngine Mask Benches & Assassin Hoods", () => {
    it("crafts Celestial Void Seraphic Phantom Eclipse Hood in Shadow Sanctum achieving 100% concealment and returns spliced leathers", () => {
        const bench = AncientRunicLeatherMaskHoodBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_SHADOW_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_SHADOW_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_ASSASSIN_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ASSASSIN_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ASSASSIN_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherMaskHoodBenchEngine.craftMask(
            bench,
            "CELESTIAL_VOID_SERAPHIC_PHANTOM_ECLIPSE_HOOD",
            initialLeathers,
            0.1, // Success roll
            1.0, // Concealment roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.mask?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_PHANTOM_ECLIPSE_HOOD");
        expect(craftRes.mask?.shadowConcealmentPercent).toBe(100);
        expect(craftRes.mask?.finalSneakAttackDamageBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.mask?.finalStealthDetectionRadiusReductionPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.mask?.consumedLeatherCount).toBe(2);
        expect(craftRes.mask?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_ASSASSIN_LEATHER");
        expect(craftRes.mask?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range concealment roll and sub-100% quality scaling on Oak mask bench", () => {
        const bench = AncientRunicLeatherMaskHoodBenchEngine.constructBench("leather_mid", "OAK_MASK_HOOD_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeConcealmentRoll = 0.5 -> 0.5 * 40 = 20
        // concealmentScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalSneakDamage = Math.round(20 * 0.936) = 19
        // finalDetectionMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherMaskHoodBenchEngine.craftMask(
            bench,
            "ROGUE_SHADOW_STALKER_MASK",
            ["TANNED_SHADOWCAT_HIDE_MASK_BLANK", "TANNED_SHADOWCAT_HIDE_MASK_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.mask?.shadowConcealmentPercent).toBe(34);
        expect(craftRes.mask?.finalSneakAttackDamageBonusPercent).toBe(19);
        expect(craftRes.mask?.finalStealthDetectionRadiusReductionPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherMaskHoodBenchEngine.constructBench("leather_wear", "OAK_MASK_HOOD_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherMaskHoodBenchEngine.craftMask(
            bench,
            "ROGUE_SHADOW_STALKER_MASK",
            ["TANNED_SHADOWCAT_HIDE_MASK_BLANK", "TANNED_SHADOWCAT_HIDE_MASK_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherMaskHoodBenchEngine.craftMask(
            res1.updatedBench!,
            "ROGUE_SHADOW_STALKER_MASK",
            ["TANNED_SHADOWCAT_HIDE_MASK_BLANK", "TANNED_SHADOWCAT_HIDE_MASK_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherMaskHoodBenchEngine.constructBench("leather_02", "OAK_MASK_HOOD_BENCH");

        const failRes = AncientRunicLeatherMaskHoodBenchEngine.craftMask(
            bench,
            "ASSASSIN_NIGHT_VEIL_COWL",
            ["CONCENTRATED_NIGHTSHADE_DYE_CAKE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient mask leather/dye");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles veil blotched failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherMaskHoodBenchEngine.constructBench("leather_03", "OAK_MASK_HOOD_BENCH"); // 85% success

        const fail = AncientRunicLeatherMaskHoodBenchEngine.craftMask(
            bench,
            "ROGUE_SHADOW_STALKER_MASK",
            ["TANNED_SHADOWCAT_HIDE_MASK_BLANK", "TANNED_SHADOWCAT_HIDE_MASK_BLANK", "TANNED_SHADOWCAT_HIDE_MASK_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("blotched");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherMaskHoodBenchEngine.constructBench("leather_04", "OAK_MASK_HOOD_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherMaskHoodBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherMaskHoodBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherMaskHoodBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported mask bench type"
        );

        const invalidBench: ActiveMaskBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherMaskHoodBenchEngine.craftMask(invalidBench, "ROGUE_SHADOW_STALKER_MASK", ["TANNED_SHADOWCAT_HIDE_MASK_BLANK", "TANNED_SHADOWCAT_HIDE_MASK_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherMaskHoodBenchEngine.craftMask(null as any, "ROGUE_SHADOW_STALKER_MASK", []).success).toBe(false);
        expect(AncientRunicLeatherMaskHoodBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});