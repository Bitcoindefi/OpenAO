import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseHockBootBenchEngine } from "../lib/ancientRunicLeatherHorseHockBootBench";
import type { ActiveHockBootBench } from "../lib/ancientRunicLeatherHorseHockBootBench";

describe("AncientRunicLeatherHorseHockBootBenchEngine Equestrian Hock Boots & Calcaneus Protection Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Hock Boots in Sanctum achieving 100% stability and returns remaining cores", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_HOCK_BOOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_HOCK_BOOT_SANCTUM");
        expect(bench.currentDurability).toBe(380);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_HOCK_CORE",
            "CELESTIAL_VOID_ASTRAL_HOCK_CORE",
            "CELESTIAL_VOID_ASTRAL_HOCK_CORE"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoots(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HOCK_BOOTS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HOCK_BOOTS");
        expect(craftRes.boots?.bootStabilityPercent).toBe(100);
        expect(craftRes.boots?.finalHockJointImpactAbsorptionPercent).toBe(100); // 89 * 1.20 = 106.8 -> clamped 100%
        expect(craftRes.boots?.finalCalcaneusShieldingPercent).toBe(82); // 68 * 1.20 = 81.6 -> 82%
        expect(craftRes.boots?.consumedLeatherCount).toBe(2);
        expect(craftRes.boots?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_HOCK_CORE");
        expect(craftRes.boots?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(370); // 380 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder hock boot bench", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("leather_mid", "ELDER_HOCK_BOOT_BENCH");
        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoots(
            bench,
            "NOVICE_EXPEDITION_HOCK_BOOTS",
            ["TANNED_STAG_HOCK_GAUNTLET", "TANNED_STAG_HOCK_GAUNTLET"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.bootStabilityPercent).toBe(37);
        expect(craftRes.boots?.finalHockJointImpactAbsorptionPercent).toBe(27);
        expect(craftRes.boots?.finalCalcaneusShieldingPercent).toBe(17);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("leather_fail", "ELDER_HOCK_BOOT_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoots(
            bench,
            "NOVICE_EXPEDITION_HOCK_BOOTS",
            ["TANNED_STAG_HOCK_GAUNTLET", "TANNED_STAG_HOCK_GAUNTLET", "TANNED_STAG_HOCK_GAUNTLET"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Calcaneus cup fitting loosened");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("leather_short", "RUNIC_OAK_HOCK_BOOT_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoots(
            bench,
            "WARMASTER_MITHRIL_HOCK_BOOTS",
            ["TEMPERED_MITHRIL_CALCANEUS_CUP"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient hock boot materials");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveHockBootBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_HOCK_BOOT_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoots(
            brokenBench,
            "NOVICE_EXPEDITION_HOCK_BOOTS",
            ["TANNED_STAG_HOCK_GAUNTLET", "TANNED_STAG_HOCK_GAUNTLET"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveHockBootBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_HOCK_BOOT_RIG",
            currentDurability: 0,
            maxDurability: 220,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseHockBootBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseHockBootBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(220);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("p_def", "ELDER_HOCK_BOOT_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoots(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_STAG_HOCK_GAUNTLET", "TANNED_STAG_HOCK_GAUNTLET"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse hock boot recipe");

        const invalidLeathers = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoots(
            bench,
            "NOVICE_EXPEDITION_HOCK_BOOTS",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
