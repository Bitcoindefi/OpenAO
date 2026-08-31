import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherArmoryDummyBenchEngine,
    ActiveDummyBench,
} from "../lib/ancientRunicLeatherArmoryDummyBench";

describe("AncientRunicLeatherArmoryDummyBenchEngine Dummy Benches & Training Automata", () => {
    it("crafts Celestial Void Seraphic Dynamic Automaton in Automaton Sanctum achieving 100% resilience and returns spliced leathers", () => {
        const bench = AncientRunicLeatherArmoryDummyBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_AUTOMATON_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_AUTOMATON_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_TRAINING_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_TRAINING_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_TRAINING_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherArmoryDummyBenchEngine.craftDummy(
            bench,
            "CELESTIAL_VOID_SERAPHIC_DYNAMIC_AUTOMATON",
            initialLeathers,
            0.1, // Success roll
            1.0, // Resilience roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.dummy?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_DYNAMIC_AUTOMATON");
        expect(craftRes.dummy?.impactResiliencePercent).toBe(100);
        expect(craftRes.dummy?.finalTrainingXPMultiplierPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.dummy?.finalWeaponWearMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.dummy?.consumedLeatherCount).toBe(2);
        expect(craftRes.dummy?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_TRAINING_LEATHER");
        expect(craftRes.dummy?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range resilience roll and sub-100% quality scaling on Oak dummy bench", () => {
        const bench = AncientRunicLeatherArmoryDummyBenchEngine.constructBench("leather_mid", "OAK_ARMORY_DUMMY_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeResilienceRoll = 0.5 -> 0.5 * 40 = 20
        // resilienceScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalXPMultiplier = Math.round(20 * 0.936) = 19
        // finalWearMitigation = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherArmoryDummyBenchEngine.craftDummy(
            bench,
            "NOVICE_STRAW_FILLED_TARGET_DUMMY",
            ["TANNED_HORSEHIDE_DUMMY_SKIN", "TANNED_HORSEHIDE_DUMMY_SKIN"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.dummy?.impactResiliencePercent).toBe(34);
        expect(craftRes.dummy?.finalTrainingXPMultiplierPercent).toBe(19);
        expect(craftRes.dummy?.finalWeaponWearMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherArmoryDummyBenchEngine.constructBench("leather_wear", "OAK_ARMORY_DUMMY_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherArmoryDummyBenchEngine.craftDummy(
            bench,
            "NOVICE_STRAW_FILLED_TARGET_DUMMY",
            ["TANNED_HORSEHIDE_DUMMY_SKIN", "TANNED_HORSEHIDE_DUMMY_SKIN"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherArmoryDummyBenchEngine.craftDummy(
            res1.updatedBench!,
            "NOVICE_STRAW_FILLED_TARGET_DUMMY",
            ["TANNED_HORSEHIDE_DUMMY_SKIN", "TANNED_HORSEHIDE_DUMMY_SKIN"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherArmoryDummyBenchEngine.constructBench("leather_02", "OAK_ARMORY_DUMMY_BENCH");

        const failRes = AncientRunicLeatherArmoryDummyBenchEngine.craftDummy(
            bench,
            "VETERAN_IRON_REINFORCED_SPARRING_DUMMY",
            ["ENCHANTED_STRAW_CORE_BUNDLE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient dummy leather/stuffing");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles skin burst failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherArmoryDummyBenchEngine.constructBench("leather_03", "OAK_ARMORY_DUMMY_BENCH"); // 85% success

        const fail = AncientRunicLeatherArmoryDummyBenchEngine.craftDummy(
            bench,
            "NOVICE_STRAW_FILLED_TARGET_DUMMY",
            ["TANNED_HORSEHIDE_DUMMY_SKIN", "TANNED_HORSEHIDE_DUMMY_SKIN", "TANNED_HORSEHIDE_DUMMY_SKIN"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("burst");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherArmoryDummyBenchEngine.constructBench("leather_04", "OAK_ARMORY_DUMMY_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherArmoryDummyBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherArmoryDummyBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherArmoryDummyBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported dummy bench type"
        );

        const invalidBench: ActiveDummyBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherArmoryDummyBenchEngine.craftDummy(invalidBench, "NOVICE_STRAW_FILLED_TARGET_DUMMY", ["TANNED_HORSEHIDE_DUMMY_SKIN", "TANNED_HORSEHIDE_DUMMY_SKIN"]).success).toBe(false);
        expect(AncientRunicLeatherArmoryDummyBenchEngine.craftDummy(null as any, "NOVICE_STRAW_FILLED_TARGET_DUMMY", []).success).toBe(false);
        expect(AncientRunicLeatherArmoryDummyBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});