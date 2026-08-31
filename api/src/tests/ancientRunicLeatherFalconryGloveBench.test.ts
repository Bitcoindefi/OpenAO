import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherFalconryGloveBenchEngine,
    ActiveFalconryGloveBench,
} from "../lib/ancientRunicLeatherFalconryGloveBench";

describe("AncientRunicLeatherFalconryGloveBenchEngine Glove Benches & Raptor Handling Gauntlets", () => {
    it("crafts Celestial Void Seraphic Raptor Handler Gauntlet in Raptor Sanctum achieving 100% resilience and returns spliced leathers", () => {
        const bench = AncientRunicLeatherFalconryGloveBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_RAPTOR_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_RAPTOR_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_FALCONRY_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_FALCONRY_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_FALCONRY_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherFalconryGloveBenchEngine.craftGauntlet(
            bench,
            "CELESTIAL_VOID_SERAPHIC_RAPTOR_HANDLER_GAUNTLET",
            initialLeathers,
            0.1, // Success roll
            1.0, // Resilience roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.gauntlet?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_RAPTOR_HANDLER_GAUNTLET");
        expect(craftRes.gauntlet?.gripResiliencePercent).toBe(100);
        expect(craftRes.gauntlet?.finalPetDamageAuraPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.gauntlet?.finalTalonRendMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.gauntlet?.consumedLeatherCount).toBe(2);
        expect(craftRes.gauntlet?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_FALCONRY_LEATHER");
        expect(craftRes.gauntlet?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range resilience roll and sub-100% quality scaling on Oak glove tree", () => {
        const bench = AncientRunicLeatherFalconryGloveBenchEngine.constructBench("leather_mid", "OAK_FALCONRY_GLOVE_TREE");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeResilienceRoll = 0.5 -> 0.5 * 40 = 20
        // resilienceScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalDamage = Math.round(20 * 0.936) = 19
        // finalMitigation = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherFalconryGloveBenchEngine.craftGauntlet(
            bench,
            "SCOUT_HUNTING_HAWK_GAUNTLET",
            ["TANNED_ELKHIDE_GAUNTLET_BLANK", "TANNED_ELKHIDE_GAUNTLET_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.gauntlet?.gripResiliencePercent).toBe(34);
        expect(craftRes.gauntlet?.finalPetDamageAuraPercent).toBe(19);
        expect(craftRes.gauntlet?.finalTalonRendMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherFalconryGloveBenchEngine.constructBench("leather_wear", "OAK_FALCONRY_GLOVE_TREE");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicLeatherFalconryGloveBenchEngine.craftGauntlet(
            bench,
            "SCOUT_HUNTING_HAWK_GAUNTLET",
            ["TANNED_ELKHIDE_GAUNTLET_BLANK", "TANNED_ELKHIDE_GAUNTLET_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(bench.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicLeatherFalconryGloveBenchEngine.craftGauntlet(
            bench,
            "SCOUT_HUNTING_HAWK_GAUNTLET",
            ["TANNED_ELKHIDE_GAUNTLET_BLANK", "TANNED_ELKHIDE_GAUNTLET_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("splintered or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherFalconryGloveBenchEngine.constructBench("leather_02", "OAK_FALCONRY_GLOVE_TREE");

        const failRes = AncientRunicLeatherFalconryGloveBenchEngine.craftGauntlet(
            bench,
            "FALCON_KING_TALON_BRACER",
            ["HARDENED_WYRM_CLAW_RIVET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient falconry leather");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles gauntlet torn failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherFalconryGloveBenchEngine.constructBench("leather_03", "OAK_FALCONRY_GLOVE_TREE"); // 85% success

        const fail = AncientRunicLeatherFalconryGloveBenchEngine.craftGauntlet(
            bench,
            "SCOUT_HUNTING_HAWK_GAUNTLET",
            ["TANNED_ELKHIDE_GAUNTLET_BLANK", "TANNED_ELKHIDE_GAUNTLET_BLANK", "TANNED_ELKHIDE_GAUNTLET_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("torn");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicLeatherFalconryGloveBenchEngine.constructBench("leather_04", "OAK_FALCONRY_GLOVE_TREE");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherFalconryGloveBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherFalconryGloveBenchEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherFalconryGloveBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported falconry glove bench type"
        );

        const invalidBench: ActiveFalconryGloveBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherFalconryGloveBenchEngine.craftGauntlet(invalidBench, "SCOUT_HUNTING_HAWK_GAUNTLET", ["TANNED_ELKHIDE_GAUNTLET_BLANK", "TANNED_ELKHIDE_GAUNTLET_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherFalconryGloveBenchEngine.craftGauntlet(null as any, "SCOUT_HUNTING_HAWK_GAUNTLET", []).success).toBe(false);
        expect(AncientRunicLeatherFalconryGloveBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});