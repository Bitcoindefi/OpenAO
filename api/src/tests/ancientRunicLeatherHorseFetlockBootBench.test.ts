import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseFetlockBootBenchEngine } from "../lib/ancientRunicLeatherHorseFetlockBootBench";
import type { ActiveFetlockBootBench } from "../lib/ancientRunicLeatherHorseFetlockBootBench";

describe("AncientRunicLeatherHorseFetlockBootBenchEngine Equestrian Fetlock Boots & Sesamoid Protection Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Fetlock Boots in Sanctum achieving 100% stability and returns remaining cores", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM");
        expect(bench.currentDurability).toBe(380);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_ANKLE_CORE",
            "CELESTIAL_VOID_ASTRAL_ANKLE_CORE",
            "CELESTIAL_VOID_ASTRAL_ANKLE_CORE"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoots(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOTS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOTS");
        expect(craftRes.boots?.bootStabilityPercent).toBe(100);
        expect(craftRes.boots?.finalFetlockJointImpactAbsorptionPercent).toBe(100); // 89 * 1.20 = 106.8 -> clamped 100%
        expect(craftRes.boots?.finalSesamoidBoneShieldingPercent).toBe(82); // 68 * 1.20 = 81.6 -> 82%
        expect(craftRes.boots?.consumedLeatherCount).toBe(2);
        expect(craftRes.boots?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_ANKLE_CORE");
        expect(craftRes.boots?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(370); // 380 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder fetlock boot bench", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("leather_mid", "ELDER_FETLOCK_BOOT_BENCH");
        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoots(
            bench,
            "NOVICE_EXPEDITION_FETLOCK_BOOTS",
            ["TANNED_RAM_FETLOCK_CUFF", "TANNED_RAM_FETLOCK_CUFF"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.bootStabilityPercent).toBe(37);
        expect(craftRes.boots?.finalFetlockJointImpactAbsorptionPercent).toBe(27);
        expect(craftRes.boots?.finalSesamoidBoneShieldingPercent).toBe(17);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("leather_fail", "ELDER_FETLOCK_BOOT_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoots(
            bench,
            "NOVICE_EXPEDITION_FETLOCK_BOOTS",
            ["TANNED_RAM_FETLOCK_CUFF", "TANNED_RAM_FETLOCK_CUFF", "TANNED_RAM_FETLOCK_CUFF"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Sesamoid shell seam misaligned");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("leather_short", "RUNIC_OAK_FETLOCK_BOOT_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoots(
            bench,
            "WARMASTER_MITHRIL_FETLOCK_BOOTS",
            ["TEMPERED_MITHRIL_SESAMOID_SHELL"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient fetlock boot materials");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveFetlockBootBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_FETLOCK_BOOT_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoots(
            brokenBench,
            "NOVICE_EXPEDITION_FETLOCK_BOOTS",
            ["TANNED_RAM_FETLOCK_CUFF", "TANNED_RAM_FETLOCK_CUFF"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveFetlockBootBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_FETLOCK_BOOT_RIG",
            currentDurability: 0,
            maxDurability: 220,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseFetlockBootBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseFetlockBootBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(220);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("p_def", "ELDER_FETLOCK_BOOT_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoots(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_RAM_FETLOCK_CUFF", "TANNED_RAM_FETLOCK_CUFF"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse fetlock boot recipe");

        const invalidLeathers = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoots(
            bench,
            "NOVICE_EXPEDITION_FETLOCK_BOOTS",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
