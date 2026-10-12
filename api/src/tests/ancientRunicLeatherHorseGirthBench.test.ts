import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseGirthBenchEngine } from "../lib/ancientRunicLeatherHorseGirthBench";
import type { ActiveGirthBench } from "../lib/ancientRunicLeatherHorseGirthBench";

describe("AncientRunicLeatherHorseGirthBenchEngine Equestrian Saddle Retention Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Girth in Girth Sanctum achieving 100% stability and returns remaining pads", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_GIRTH_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_GIRTH_SANCTUM");
        expect(bench.currentDurability).toBe(360);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_PECTORAL_PAD",
            "CELESTIAL_VOID_ASTRAL_PECTORAL_PAD",
            "CELESTIAL_VOID_ASTRAL_PECTORAL_PAD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.girth?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH");
        expect(craftRes.girth?.girthStabilityPercent).toBe(100);
        expect(craftRes.girth?.finalSaddleStabilityRetentionPercent).toBe(100); // 86 * 1.20 = 103.2 -> clamped 100%
        expect(craftRes.girth?.finalThoracicCompressionReliefPercent).toBe(79); // 66 * 1.20 = 79.2 -> 79%
        expect(craftRes.girth?.consumedLeatherCount).toBe(2);
        expect(craftRes.girth?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_PECTORAL_PAD");
        expect(craftRes.girth?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(350); // 360 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder girth bench", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_mid", "ELDER_GIRTH_BENCH");
        const craftRes = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "NOVICE_EXPEDITION_GIRTH",
            ["TANNED_BULL_VENTRAL_STRAP", "TANNED_BULL_VENTRAL_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.girth?.girthStabilityPercent).toBe(37);
        expect(craftRes.girth?.finalSaddleStabilityRetentionPercent).toBe(25);
        expect(craftRes.girth?.finalThoracicCompressionReliefPercent).toBe(15);
        expect(craftRes.remainingDurability).toBe(88); // 98 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_fail", "ELDER_GIRTH_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "NOVICE_EXPEDITION_GIRTH",
            ["TANNED_BULL_VENTRAL_STRAP", "TANNED_BULL_VENTRAL_STRAP", "TANNED_BULL_VENTRAL_STRAP"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Sternum buckle slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_short", "RUNIC_OAK_GIRTH_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_GIRTH",
            ["TEMPERED_MITHRIL_STERNUM_PLATE"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient ventral straps/plates");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveGirthBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_GIRTH_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 98,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            brokenBench,
            "NOVICE_EXPEDITION_GIRTH",
            ["TANNED_BULL_VENTRAL_STRAP", "TANNED_BULL_VENTRAL_STRAP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveGirthBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_GIRTH_RIG",
            currentDurability: 0,
            maxDurability: 210,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseGirthBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseGirthBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(210);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("p_def", "ELDER_GIRTH_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_VENTRAL_STRAP", "TANNED_BULL_VENTRAL_STRAP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse girth recipe");

        const invalidLeathers = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "NOVICE_EXPEDITION_GIRTH",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
