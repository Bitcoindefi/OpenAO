import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseBellBootBenchEngine } from "../lib/ancientRunicLeatherHorseBellBootBench";
import type { ActiveBellBootBench } from "../lib/ancientRunicLeatherHorseBellBootBench";

describe("AncientRunicLeatherHorseBellBootBenchEngine Equestrian Overreach Guard Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Bell Boot in Bell Boot Sanctum achieving 100% stability and returns remaining shrouds", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_BELL_BOOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_BELL_BOOT_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_HOOF_SHROUD",
            "CELESTIAL_VOID_ASTRAL_HOOF_SHROUD",
            "CELESTIAL_VOID_ASTRAL_HOOF_SHROUD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoot(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BELL_BOOT",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.bellBoot?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BELL_BOOT");
        expect(craftRes.bellBoot?.bellBootStabilityPercent).toBe(100);
        expect(craftRes.bellBoot?.finalOverreachImpactDeflectionPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped 100%
        expect(craftRes.bellBoot?.finalCoronaryBandArmorPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.bellBoot?.consumedLeatherCount).toBe(2);
        expect(craftRes.bellBoot?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_HOOF_SHROUD");
        expect(craftRes.bellBoot?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder bell boot bench", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("leather_mid", "ELDER_BELL_BOOT_BENCH");
        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoot(
            bench,
            "NOVICE_EXPEDITION_BELL_BOOT",
            ["TANNED_BULL_BELL_CONE", "TANNED_BULL_BELL_CONE"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.bellBoot?.bellBootStabilityPercent).toBe(36);
        expect(craftRes.bellBoot?.finalOverreachImpactDeflectionPercent).toBe(23);
        expect(craftRes.bellBoot?.finalCoronaryBandArmorPercent).toBe(13);
        expect(craftRes.remainingDurability).toBe(85); // 95 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("leather_fail", "ELDER_BELL_BOOT_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoot(
            bench,
            "NOVICE_EXPEDITION_BELL_BOOT",
            ["TANNED_BULL_BELL_CONE", "TANNED_BULL_BELL_CONE", "TANNED_BULL_BELL_CONE"],
            0.99 // Fails (threshold is 0.87)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Coronary seam slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("leather_short", "RUNIC_OAK_BELL_BOOT_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoot(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_BELL_BOOT",
            ["TEMPERED_MITHRIL_CORONARY_RIM"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient bell cones/rims");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveBellBootBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_BELL_BOOT_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 95,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoot(
            brokenBench,
            "NOVICE_EXPEDITION_BELL_BOOT",
            ["TANNED_BULL_BELL_CONE", "TANNED_BULL_BELL_CONE"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveBellBootBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_BELL_BOOT_RIG",
            currentDurability: 0,
            maxDurability: 200,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseBellBootBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseBellBootBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(200);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("p_def", "ELDER_BELL_BOOT_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoot(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_BELL_CONE", "TANNED_BULL_BELL_CONE"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse bell boot recipe");

        const invalidLeathers = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoot(
            bench,
            "NOVICE_EXPEDITION_BELL_BOOT",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
