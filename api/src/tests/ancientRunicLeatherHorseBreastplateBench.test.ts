import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseBreastplateBenchEngine } from "../lib/ancientRunicLeatherHorseBreastplateBench";
import type { ActiveBreastplateBench } from "../lib/ancientRunicLeatherHorseBreastplateBench";

describe("AncientRunicLeatherHorseBreastplateBenchEngine Equestrian Withers Yoke & Breastplate Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Breastplate in Breastplate Sanctum achieving 100% stability and returns remaining pads", () => {
        const bench = AncientRunicLeatherHorseBreastplateBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM");
        expect(bench.currentDurability).toBe(365);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_CLAVICULAR_PAD",
            "CELESTIAL_VOID_ASTRAL_CLAVICULAR_PAD",
            "CELESTIAL_VOID_ASTRAL_CLAVICULAR_PAD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseBreastplateBenchEngine.craftBreastplate(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.breastplate?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE");
        expect(craftRes.breastplate?.breastplateStabilityPercent).toBe(100);
        expect(craftRes.breastplate?.finalSaddleBackwardSlipPreventionPercent).toBe(100); // 86 * 1.20 = 103.2 -> clamped 100%
        expect(craftRes.breastplate?.finalChestImpactDeflectionPercent).toBe(79); // 66 * 1.20 = 79.2 -> 79%
        expect(craftRes.breastplate?.consumedLeatherCount).toBe(2);
        expect(craftRes.breastplate?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_CLAVICULAR_PAD");
        expect(craftRes.breastplate?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(355); // 365 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder breastplate bench", () => {
        const bench = AncientRunicLeatherHorseBreastplateBenchEngine.constructBench("leather_mid", "ELDER_BREASTPLATE_BENCH");
        const craftRes = AncientRunicLeatherHorseBreastplateBenchEngine.craftBreastplate(
            bench,
            "NOVICE_EXPEDITION_BREASTPLATE",
            ["TANNED_BULL_PECTORAL_HARNESS_STRAP", "TANNED_BULL_PECTORAL_HARNESS_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.breastplate?.breastplateStabilityPercent).toBe(37);
        expect(craftRes.breastplate?.finalSaddleBackwardSlipPreventionPercent).toBe(25);
        expect(craftRes.breastplate?.finalChestImpactDeflectionPercent).toBe(15);
        expect(craftRes.remainingDurability).toBe(88); // 98 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseBreastplateBenchEngine.constructBench("leather_fail", "ELDER_BREASTPLATE_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBreastplateBenchEngine.craftBreastplate(
            bench,
            "NOVICE_EXPEDITION_BREASTPLATE",
            ["TANNED_BULL_PECTORAL_HARNESS_STRAP", "TANNED_BULL_PECTORAL_HARNESS_STRAP", "TANNED_BULL_PECTORAL_HARNESS_STRAP"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Withers yoke buckle slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseBreastplateBenchEngine.constructBench("leather_short", "RUNIC_OAK_BREASTPLATE_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBreastplateBenchEngine.craftBreastplate(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_BREASTPLATE",
            ["TEMPERED_MITHRIL_WITHERS_YOKE"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient pectoral straps/yokes");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveBreastplateBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_BREASTPLATE_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 98,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseBreastplateBenchEngine.craftBreastplate(
            brokenBench,
            "NOVICE_EXPEDITION_BREASTPLATE",
            ["TANNED_BULL_PECTORAL_HARNESS_STRAP", "TANNED_BULL_PECTORAL_HARNESS_STRAP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveBreastplateBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_BREASTPLATE_RIG",
            currentDurability: 0,
            maxDurability: 212,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseBreastplateBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseBreastplateBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(212);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseBreastplateBenchEngine.constructBench("p_def", "ELDER_BREASTPLATE_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseBreastplateBenchEngine.craftBreastplate(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_PECTORAL_HARNESS_STRAP", "TANNED_BULL_PECTORAL_HARNESS_STRAP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse breastplate recipe");

        const invalidLeathers = AncientRunicLeatherHorseBreastplateBenchEngine.craftBreastplate(
            bench,
            "NOVICE_EXPEDITION_BREASTPLATE",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
