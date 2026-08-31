import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherFlaskHolsterBenchEngine,
    ActiveHolsterBench,
} from "../lib/ancientRunicLeatherFlaskHolsterBench";

describe("AncientRunicLeatherFlaskHolsterBenchEngine Flask Holster Benches & Alchemy Harnesses", () => {
    it("crafts Celestial Void Seraphic Bottomless Elixir Rig in Elixir Sanctum achieving 100% fluidity and returns spliced leathers", () => {
        const bench = AncientRunicLeatherFlaskHolsterBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_ELIXIR_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_ELIXIR_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_HARNESS_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_HARNESS_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_HARNESS_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherFlaskHolsterBenchEngine.craftHolster(
            bench,
            "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_ELIXIR_RIG",
            initialLeathers,
            0.1, // Success roll
            1.0, // Fluidity roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.holster?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_ELIXIR_RIG");
        expect(craftRes.holster?.deliveryFluidityPercent).toBe(100);
        expect(craftRes.holster?.finalPotionEfficacyBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.holster?.finalPotionShatterMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.holster?.consumedLeatherCount).toBe(2);
        expect(craftRes.holster?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_HARNESS_LEATHER");
        expect(craftRes.holster?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range fluidity roll and sub-100% quality scaling on Oak holster bench", () => {
        const bench = AncientRunicLeatherFlaskHolsterBenchEngine.constructBench("leather_mid", "OAK_FLASK_HOLSTER_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeFluidityRoll = 0.5 -> 0.5 * 40 = 20
        // fluidityScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalEfficacy = Math.round(20 * 0.936) = 19
        // finalShatter = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherFlaskHolsterBenchEngine.craftHolster(
            bench,
            "SCOUT_QUICK_SIP_FLASK_HOLSTER",
            ["TANNED_GOATSKIN_HOLSTER_BLANK", "TANNED_GOATSKIN_HOLSTER_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.holster?.deliveryFluidityPercent).toBe(34);
        expect(craftRes.holster?.finalPotionEfficacyBonusPercent).toBe(19);
        expect(craftRes.holster?.finalPotionShatterMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherFlaskHolsterBenchEngine.constructBench("leather_wear", "OAK_FLASK_HOLSTER_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherFlaskHolsterBenchEngine.craftHolster(
            bench,
            "SCOUT_QUICK_SIP_FLASK_HOLSTER",
            ["TANNED_GOATSKIN_HOLSTER_BLANK", "TANNED_GOATSKIN_HOLSTER_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherFlaskHolsterBenchEngine.craftHolster(
            res1.updatedBench!,
            "SCOUT_QUICK_SIP_FLASK_HOLSTER",
            ["TANNED_GOATSKIN_HOLSTER_BLANK", "TANNED_GOATSKIN_HOLSTER_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("damaged or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherFlaskHolsterBenchEngine.constructBench("leather_02", "OAK_FLASK_HOLSTER_BENCH");

        const failRes = AncientRunicLeatherFlaskHolsterBenchEngine.craftHolster(
            bench,
            "COMBAT_MEDIC_DOUBLE_VIAL_HARNESS",
            ["WAXED_CORK_STOPPER_STRAP"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient holster leather");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles holster torn failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherFlaskHolsterBenchEngine.constructBench("leather_03", "OAK_FLASK_HOLSTER_BENCH"); // 85% success

        const fail = AncientRunicLeatherFlaskHolsterBenchEngine.craftHolster(
            bench,
            "SCOUT_QUICK_SIP_FLASK_HOLSTER",
            ["TANNED_GOATSKIN_HOLSTER_BLANK", "TANNED_GOATSKIN_HOLSTER_BLANK", "TANNED_GOATSKIN_HOLSTER_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("torn");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherFlaskHolsterBenchEngine.constructBench("leather_04", "OAK_FLASK_HOLSTER_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherFlaskHolsterBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherFlaskHolsterBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherFlaskHolsterBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported holster bench type"
        );

        const invalidBench: ActiveHolsterBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherFlaskHolsterBenchEngine.craftHolster(invalidBench, "SCOUT_QUICK_SIP_FLASK_HOLSTER", ["TANNED_GOATSKIN_HOLSTER_BLANK", "TANNED_GOATSKIN_HOLSTER_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherFlaskHolsterBenchEngine.craftHolster(null as any, "SCOUT_QUICK_SIP_FLASK_HOLSTER", []).success).toBe(false);
        expect(AncientRunicLeatherFlaskHolsterBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});