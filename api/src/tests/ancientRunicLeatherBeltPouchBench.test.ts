import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherBeltPouchBenchEngine,
    ActivePouchBench,
} from "../lib/ancientRunicLeatherBeltPouchBench";

describe("AncientRunicLeatherBeltPouchBenchEngine Pouch Benches & Alchemical Satchels", () => {
    it("crafts Celestial Void Seraphic Bottomless Satchel in Satchel Sanctum achieving 100% accessibility and returns spliced leathers", () => {
        const bench = AncientRunicLeatherBeltPouchBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_SATCHEL_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_SATCHEL_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherBeltPouchBenchEngine.craftPouch(
            bench,
            "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_SATCHEL",
            initialLeathers,
            0.1, // Success roll
            1.0, // Accessibility roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.pouch?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_SATCHEL");
        expect(craftRes.pouch?.quickdrawAccessibilityPercent).toBe(100);
        expect(craftRes.pouch?.finalPotionCooldownReductionPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.pouch?.finalHerbFreshnessPreservationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.pouch?.consumedLeatherCount).toBe(2);
        expect(craftRes.pouch?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_LEATHER");
        expect(craftRes.pouch?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range accessibility roll and sub-100% quality scaling on Oak stitching bench", () => {
        const bench = AncientRunicLeatherBeltPouchBenchEngine.constructBench("leather_mid", "OAK_POUCH_STITCHING_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeAccessibilityRoll = 0.5 -> 0.5 * 40 = 20
        // accessibilityScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalCooldown = Math.round(20 * 0.936) = 19
        // finalFreshness = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherBeltPouchBenchEngine.craftPouch(
            bench,
            "ADVENTURER_QUICK_ACCESS_BELT_POUCH",
            ["TANNED_CALFSKIN_POUCH_BLANK", "TANNED_CALFSKIN_POUCH_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.pouch?.quickdrawAccessibilityPercent).toBe(34);
        expect(craftRes.pouch?.finalPotionCooldownReductionPercent).toBe(19);
        expect(craftRes.pouch?.finalHerbFreshnessPreservationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherBeltPouchBenchEngine.constructBench("leather_wear", "OAK_POUCH_STITCHING_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherBeltPouchBenchEngine.craftPouch(
            bench,
            "ADVENTURER_QUICK_ACCESS_BELT_POUCH",
            ["TANNED_CALFSKIN_POUCH_BLANK", "TANNED_CALFSKIN_POUCH_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherBeltPouchBenchEngine.craftPouch(
            res1.updatedBench!,
            "ADVENTURER_QUICK_ACCESS_BELT_POUCH",
            ["TANNED_CALFSKIN_POUCH_BLANK", "TANNED_CALFSKIN_POUCH_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("jammed or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherBeltPouchBenchEngine.constructBench("leather_02", "OAK_POUCH_STITCHING_BENCH");

        const failRes = AncientRunicLeatherBeltPouchBenchEngine.craftPouch(
            bench,
            "ALCHEMIST_SPILL_PROOF_HERB_POUCH",
            ["POLISHED_BRASS_TOGGLE_CLASP"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient pouch leather");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles pouch seam ripped failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherBeltPouchBenchEngine.constructBench("leather_03", "OAK_POUCH_STITCHING_BENCH"); // 85% success

        const fail = AncientRunicLeatherBeltPouchBenchEngine.craftPouch(
            bench,
            "ADVENTURER_QUICK_ACCESS_BELT_POUCH",
            ["TANNED_CALFSKIN_POUCH_BLANK", "TANNED_CALFSKIN_POUCH_BLANK", "TANNED_CALFSKIN_POUCH_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("ripped");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherBeltPouchBenchEngine.constructBench("leather_04", "OAK_POUCH_STITCHING_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherBeltPouchBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherBeltPouchBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherBeltPouchBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported pouch bench type"
        );

        const invalidBench: ActivePouchBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherBeltPouchBenchEngine.craftPouch(invalidBench, "ADVENTURER_QUICK_ACCESS_BELT_POUCH", ["TANNED_CALFSKIN_POUCH_BLANK", "TANNED_CALFSKIN_POUCH_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherBeltPouchBenchEngine.craftPouch(null as any, "ADVENTURER_QUICK_ACCESS_BELT_POUCH", []).success).toBe(false);
        expect(AncientRunicLeatherBeltPouchBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});