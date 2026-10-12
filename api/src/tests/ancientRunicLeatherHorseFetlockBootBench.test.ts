import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseFetlockBootBenchEngine } from "../lib/ancientRunicLeatherHorseFetlockBootBench";
import type { ActiveFetlockBootBench } from "../lib/ancientRunicLeatherHorseFetlockBootBench";

describe("AncientRunicLeatherHorseFetlockBootBenchEngine Equestrian Ankle Brushing Guard Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Fetlock Boot in Fetlock Boot Sanctum achieving 100% stability and returns remaining linings", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_SESAMOID_LINING",
            "CELESTIAL_VOID_ASTRAL_SESAMOID_LINING",
            "CELESTIAL_VOID_ASTRAL_SESAMOID_LINING"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoot(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOT",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.fetlockBoot?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOT");
        expect(craftRes.fetlockBoot?.fetlockBootStabilityPercent).toBe(100);
        expect(craftRes.fetlockBoot?.finalBrushingImpactAbsorptionPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped 100%
        expect(craftRes.fetlockBoot?.finalJointHyperextensionSupportPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.fetlockBoot?.consumedLeatherCount).toBe(2);
        expect(craftRes.fetlockBoot?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_SESAMOID_LINING");
        expect(craftRes.fetlockBoot?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder fetlock boot bench", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("leather_mid", "ELDER_FETLOCK_BOOT_BENCH");
        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoot(
            bench,
            "NOVICE_EXPEDITION_FETLOCK_BOOT",
            ["TANNED_BULL_FETLOCK_SHIELD", "TANNED_BULL_FETLOCK_SHIELD"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.fetlockBoot?.fetlockBootStabilityPercent).toBe(36);
        expect(craftRes.fetlockBoot?.finalBrushingImpactAbsorptionPercent).toBe(23);
        expect(craftRes.fetlockBoot?.finalJointHyperextensionSupportPercent).toBe(13);
        expect(craftRes.remainingDurability).toBe(85); // 95 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("leather_fail", "ELDER_FETLOCK_BOOT_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoot(
            bench,
            "NOVICE_EXPEDITION_FETLOCK_BOOT",
            ["TANNED_BULL_FETLOCK_SHIELD", "TANNED_BULL_FETLOCK_SHIELD", "TANNED_BULL_FETLOCK_SHIELD"],
            0.99 // Fails (threshold is 0.87)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Ankle contour slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("leather_short", "RUNIC_OAK_FETLOCK_BOOT_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoot(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_FETLOCK_BOOT",
            ["TEMPERED_MITHRIL_ANKLE_STUD"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient fetlock shields/studs");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveFetlockBootBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_FETLOCK_BOOT_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 95,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoot(
            brokenBench,
            "NOVICE_EXPEDITION_FETLOCK_BOOT",
            ["TANNED_BULL_FETLOCK_SHIELD", "TANNED_BULL_FETLOCK_SHIELD"]
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
            maxDurability: 200,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseFetlockBootBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseFetlockBootBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(200);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseFetlockBootBenchEngine.constructBench("p_def", "ELDER_FETLOCK_BOOT_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoot(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_FETLOCK_SHIELD", "TANNED_BULL_FETLOCK_SHIELD"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse fetlock boot recipe");

        const invalidLeathers = AncientRunicLeatherHorseFetlockBootBenchEngine.craftFetlockBoot(
            bench,
            "NOVICE_EXPEDITION_FETLOCK_BOOT",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
