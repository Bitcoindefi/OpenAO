import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseSplintBootBenchEngine } from "../lib/ancientRunicLeatherHorseSplintBootBench";
import type { ActiveSplintBootBench } from "../lib/ancientRunicLeatherHorseSplintBootBench";

describe("AncientRunicLeatherHorseSplintBootBenchEngine Equestrian Splint Boots & Tendon Strike Protection Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Splint Boots in Sanctum achieving 100% stability and returns remaining cores", () => {
        const bench = AncientRunicLeatherHorseSplintBootBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_SPLINT_BOOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_SPLINT_BOOT_SANCTUM");
        expect(bench.currentDurability).toBe(380);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_SPLINT_CORE",
            "CELESTIAL_VOID_ASTRAL_SPLINT_CORE",
            "CELESTIAL_VOID_ASTRAL_SPLINT_CORE"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseSplintBootBenchEngine.craftSplintBoots(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SPLINT_BOOTS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SPLINT_BOOTS");
        expect(craftRes.boots?.bootStabilityPercent).toBe(100);
        expect(craftRes.boots?.finalSplintBoneImpactAbsorptionPercent).toBe(100); // 89 * 1.20 = 106.8 -> clamped 100%
        expect(craftRes.boots?.finalFlexorTendonShieldingPercent).toBe(82); // 68 * 1.20 = 81.6 -> 82%
        expect(craftRes.boots?.consumedLeatherCount).toBe(2);
        expect(craftRes.boots?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_SPLINT_CORE");
        expect(craftRes.boots?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(370); // 380 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder splint boot bench", () => {
        const bench = AncientRunicLeatherHorseSplintBootBenchEngine.constructBench("leather_mid", "ELDER_SPLINT_BOOT_BENCH");
        const craftRes = AncientRunicLeatherHorseSplintBootBenchEngine.craftSplintBoots(
            bench,
            "NOVICE_EXPEDITION_SPLINT_BOOTS",
            ["TANNED_ELK_CANNON_STRAP", "TANNED_ELK_CANNON_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.bootStabilityPercent).toBe(37);
        expect(craftRes.boots?.finalSplintBoneImpactAbsorptionPercent).toBe(27);
        expect(craftRes.boots?.finalFlexorTendonShieldingPercent).toBe(17);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseSplintBootBenchEngine.constructBench("leather_fail", "ELDER_SPLINT_BOOT_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseSplintBootBenchEngine.craftSplintBoots(
            bench,
            "NOVICE_EXPEDITION_SPLINT_BOOTS",
            ["TANNED_ELK_CANNON_STRAP", "TANNED_ELK_CANNON_STRAP", "TANNED_ELK_CANNON_STRAP"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Tendon plate rivets sheared");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseSplintBootBenchEngine.constructBench("leather_short", "RUNIC_OAK_SPLINT_BOOT_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseSplintBootBenchEngine.craftSplintBoots(
            bench,
            "WARMASTER_MITHRIL_SPLINT_BOOTS",
            ["TEMPERED_MITHRIL_TENDON_PLATE"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient splint boot materials");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveSplintBootBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_SPLINT_BOOT_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseSplintBootBenchEngine.craftSplintBoots(
            brokenBench,
            "NOVICE_EXPEDITION_SPLINT_BOOTS",
            ["TANNED_ELK_CANNON_STRAP", "TANNED_ELK_CANNON_STRAP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveSplintBootBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_SPLINT_BOOT_RIG",
            currentDurability: 0,
            maxDurability: 220,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseSplintBootBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseSplintBootBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(220);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseSplintBootBenchEngine.constructBench("p_def", "ELDER_SPLINT_BOOT_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseSplintBootBenchEngine.craftSplintBoots(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_ELK_CANNON_STRAP", "TANNED_ELK_CANNON_STRAP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse splint boot recipe");

        const invalidLeathers = AncientRunicLeatherHorseSplintBootBenchEngine.craftSplintBoots(
            bench,
            "NOVICE_EXPEDITION_SPLINT_BOOTS",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
