import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseKneeBootBenchEngine } from "../lib/ancientRunicLeatherHorseKneeBootBench";
import type { ActiveKneeBootBench } from "../lib/ancientRunicLeatherHorseKneeBootBench";

describe("AncientRunicLeatherHorseKneeBootBenchEngine Equestrian Carpal Joint Protector Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Knee Boot in Knee Boot Sanctum achieving 100% stability and returns remaining pads", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_KNEE_BOOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_KNEE_BOOT_SANCTUM");
        expect(bench.currentDurability).toBe(355);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_MENISCUS_PAD",
            "CELESTIAL_VOID_ASTRAL_MENISCUS_PAD",
            "CELESTIAL_VOID_ASTRAL_MENISCUS_PAD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoot(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_KNEE_BOOT",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.kneeBoot?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_KNEE_BOOT");
        expect(craftRes.kneeBoot?.kneeBootStabilityPercent).toBe(100);
        expect(craftRes.kneeBoot?.finalCarpalImpactAbsorptionPercent).toBe(100); // 85 * 1.20 = 102 -> clamped 100%
        expect(craftRes.kneeBoot?.finalKneeFlexionSupportPercent).toBe(78); // 65 * 1.20 = 78%
        expect(craftRes.kneeBoot?.consumedLeatherCount).toBe(2);
        expect(craftRes.kneeBoot?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_MENISCUS_PAD");
        expect(craftRes.kneeBoot?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(345); // 355 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder knee boot bench", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("leather_mid", "ELDER_KNEE_BOOT_BENCH");
        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoot(
            bench,
            "NOVICE_EXPEDITION_KNEE_BOOT",
            ["TANNED_BULL_CARPAL_CUP", "TANNED_BULL_CARPAL_CUP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.kneeBoot?.kneeBootStabilityPercent).toBe(37);
        expect(craftRes.kneeBoot?.finalCarpalImpactAbsorptionPercent).toBe(24);
        expect(craftRes.kneeBoot?.finalKneeFlexionSupportPercent).toBe(14);
        expect(craftRes.remainingDurability).toBe(86); // 96 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("leather_fail", "ELDER_KNEE_BOOT_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoot(
            bench,
            "NOVICE_EXPEDITION_KNEE_BOOT",
            ["TANNED_BULL_CARPAL_CUP", "TANNED_BULL_CARPAL_CUP", "TANNED_BULL_CARPAL_CUP"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Patellar hinge slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("leather_short", "RUNIC_OAK_KNEE_BOOT_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoot(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_KNEE_BOOT",
            ["TEMPERED_MITHRIL_PATELLAR_HINGE"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient carpal cups/hinges");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveKneeBootBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_KNEE_BOOT_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 96,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoot(
            brokenBench,
            "NOVICE_EXPEDITION_KNEE_BOOT",
            ["TANNED_BULL_CARPAL_CUP", "TANNED_BULL_CARPAL_CUP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveKneeBootBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_KNEE_BOOT_RIG",
            currentDurability: 0,
            maxDurability: 205,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseKneeBootBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseKneeBootBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(205);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("p_def", "ELDER_KNEE_BOOT_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoot(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_CARPAL_CUP", "TANNED_BULL_CARPAL_CUP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse knee boot recipe");

        const invalidLeathers = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoot(
            bench,
            "NOVICE_EXPEDITION_KNEE_BOOT",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
