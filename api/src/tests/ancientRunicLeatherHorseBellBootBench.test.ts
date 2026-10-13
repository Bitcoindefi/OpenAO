import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseBellBootBenchEngine } from "../lib/ancientRunicLeatherHorseBellBootBench";
import type { ActiveBellBootBench } from "../lib/ancientRunicLeatherHorseBellBootBench";

describe("AncientRunicLeatherHorseBellBootBenchEngine Equestrian Bell Boots & Hoof Bulb Protection Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Bell Boots in Sanctum achieving 100% stability and returns remaining rings", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_BELL_BOOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_BELL_BOOT_SANCTUM");
        expect(bench.currentDurability).toBe(380);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_IMPACT_RING",
            "CELESTIAL_VOID_ASTRAL_IMPACT_RING",
            "CELESTIAL_VOID_ASTRAL_IMPACT_RING"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoots(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BELL_BOOTS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BELL_BOOTS");
        expect(craftRes.boots?.bootStabilityPercent).toBe(100);
        expect(craftRes.boots?.finalOverreachImpactDeflectionPercent).toBe(100); // 89 * 1.20 = 106.8 -> clamped 100%
        expect(craftRes.boots?.finalCoronetBulbShieldingPercent).toBe(82); // 68 * 1.20 = 81.6 -> 82%
        expect(craftRes.boots?.consumedLeatherCount).toBe(2);
        expect(craftRes.boots?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_IMPACT_RING");
        expect(craftRes.boots?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(370); // 380 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder bell boot bench", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("leather_mid", "ELDER_BELL_BOOT_BENCH");
        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoots(
            bench,
            "NOVICE_EXPEDITION_BELL_BOOTS",
            ["TANNED_BUFFALO_HOOF_COLLAR", "TANNED_BUFFALO_HOOF_COLLAR"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.bootStabilityPercent).toBe(37);
        expect(craftRes.boots?.finalOverreachImpactDeflectionPercent).toBe(27);
        expect(craftRes.boots?.finalCoronetBulbShieldingPercent).toBe(17);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("leather_fail", "ELDER_BELL_BOOT_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoots(
            bench,
            "NOVICE_EXPEDITION_BELL_BOOTS",
            ["TANNED_BUFFALO_HOOF_COLLAR", "TANNED_BUFFALO_HOOF_COLLAR", "TANNED_BUFFALO_HOOF_COLLAR"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Hoof collar seam split");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("leather_short", "RUNIC_OAK_BELL_BOOT_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoots(
            bench,
            "WARMASTER_MITHRIL_BELL_BOOTS",
            ["TEMPERED_MITHRIL_BELL_SHELL"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient bell boot materials");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveBellBootBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_BELL_BOOT_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoots(
            brokenBench,
            "NOVICE_EXPEDITION_BELL_BOOTS",
            ["TANNED_BUFFALO_HOOF_COLLAR", "TANNED_BUFFALO_HOOF_COLLAR"]
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
            maxDurability: 220,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseBellBootBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseBellBootBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(220);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseBellBootBenchEngine.constructBench("p_def", "ELDER_BELL_BOOT_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoots(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BUFFALO_HOOF_COLLAR", "TANNED_BUFFALO_HOOF_COLLAR"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse bell boot recipe");

        const invalidLeathers = AncientRunicLeatherHorseBellBootBenchEngine.craftBellBoots(
            bench,
            "NOVICE_EXPEDITION_BELL_BOOTS",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
