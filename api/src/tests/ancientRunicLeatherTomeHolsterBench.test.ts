import { describe, it, expect } from "vitest";
import { AncientRunicLeatherTomeHolsterBenchEngine } from "../lib/ancientRunicLeatherTomeHolsterBench";
import type { ActiveTomeHolsterBench } from "../lib/ancientRunicLeatherTomeHolsterBench";

describe("AncientRunicLeatherTomeHolsterBenchEngine Tome Benches & Grimoire Holsters", () => {
    it("crafts Celestial Void Seraphic Chronomantic Grimoire Harness in Archmage Sanctum achieving 100% drawing speed and returns spliced leathers", () => {
        const bench = AncientRunicLeatherTomeHolsterBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_ARCHMAGE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_ARCHMAGE_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_ARCHMAGE_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ARCHMAGE_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ARCHMAGE_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherTomeHolsterBenchEngine.craftHolster(
            bench,
            "CELESTIAL_VOID_SERAPHIC_CHRONOMANTIC_GRIMOIRE_HARNESS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Speed roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.holster?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_CHRONOMANTIC_GRIMOIRE_HARNESS");
        expect(craftRes.holster?.spellbookDrawingSpeedPercent).toBe(100);
        expect(craftRes.holster?.finalSpellCastAccelerationBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.holster?.finalArcaneManaExhaustionMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.holster?.consumedLeatherCount).toBe(2);
        expect(craftRes.holster?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_ARCHMAGE_LEATHER");
        expect(craftRes.holster?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range drawing speed roll and sub-100% quality scaling on Oak tome holster bench", () => {
        const bench = AncientRunicLeatherTomeHolsterBenchEngine.constructBench("leather_mid", "OAK_TOME_HOLSTER_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeSpeedRoll = 0.5 -> 0.5 * 40 = 20
        // speedScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalAcceleration = Math.round(20 * 0.936) = 19
        // finalExhaustionMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherTomeHolsterBenchEngine.craftHolster(
            bench,
            "APPRENTICE_GRIMOIRE_HIP_HOLSTER",
            ["TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK", "TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.holster?.spellbookDrawingSpeedPercent).toBe(34);
        expect(craftRes.holster?.finalSpellCastAccelerationBonusPercent).toBe(19);
        expect(craftRes.holster?.finalArcaneManaExhaustionMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherTomeHolsterBenchEngine.constructBench("leather_wear", "OAK_TOME_HOLSTER_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherTomeHolsterBenchEngine.craftHolster(
            bench,
            "APPRENTICE_GRIMOIRE_HIP_HOLSTER",
            ["TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK", "TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherTomeHolsterBenchEngine.craftHolster(
            res1.updatedBench!,
            "APPRENTICE_GRIMOIRE_HIP_HOLSTER",
            ["TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK", "TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherTomeHolsterBenchEngine.constructBench("leather_02", "OAK_TOME_HOLSTER_BENCH");

        const failRes = AncientRunicLeatherTomeHolsterBenchEngine.craftHolster(
            bench,
            "BATTLEMAGE_QUICK_CAST_TOME_SCABBARD",
            ["ENCHANTED_SILVER_BUCKLE_CLASP_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient tome leather/buckles");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles scabbard torn failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherTomeHolsterBenchEngine.constructBench("leather_03", "OAK_TOME_HOLSTER_BENCH"); // 85% success

        const fail = AncientRunicLeatherTomeHolsterBenchEngine.craftHolster(
            bench,
            "APPRENTICE_GRIMOIRE_HIP_HOLSTER",
            ["TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK", "TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK", "TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("torn");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherTomeHolsterBenchEngine.constructBench("leather_04", "OAK_TOME_HOLSTER_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherTomeHolsterBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherTomeHolsterBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherTomeHolsterBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported tome holster bench type"
        );

        const invalidBench: ActiveTomeHolsterBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherTomeHolsterBenchEngine.craftHolster(invalidBench, "APPRENTICE_GRIMOIRE_HIP_HOLSTER", ["TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK", "TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherTomeHolsterBenchEngine.craftHolster(null as any, "APPRENTICE_GRIMOIRE_HIP_HOLSTER", []).success).toBe(false);
        expect(AncientRunicLeatherTomeHolsterBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});