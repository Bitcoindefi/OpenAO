import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseShinGuardBenchEngine } from "../lib/ancientRunicLeatherHorseShinGuardBench";
import type { ActiveShinGuardBench } from "../lib/ancientRunicLeatherHorseShinGuardBench";

describe("AncientRunicLeatherHorseShinGuardBenchEngine Equestrian Cannon Bone Armor Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Shin Guard in Shin Guard Sanctum achieving 100% stability and returns remaining pads", () => {
        const bench = AncientRunicLeatherHorseShinGuardBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_SHIN_GUARD_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_SHIN_GUARD_SANCTUM");
        expect(bench.currentDurability).toBe(370);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_METACARPAL_PAD",
            "CELESTIAL_VOID_ASTRAL_METACARPAL_PAD",
            "CELESTIAL_VOID_ASTRAL_METACARPAL_PAD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseShinGuardBenchEngine.craftShinGuard(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SHIN_GUARD",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.shinGuard?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SHIN_GUARD");
        expect(craftRes.shinGuard?.shinGuardStabilityPercent).toBe(100);
        expect(craftRes.shinGuard?.finalCannonBoneImpactDeflectionPercent).toBe(100); // 87 * 1.20 = 104.4 -> clamped 100%
        expect(craftRes.shinGuard?.finalFlexorTendonShieldingPercent).toBe(80); // 67 * 1.20 = 80.4 -> 80%
        expect(craftRes.shinGuard?.consumedLeatherCount).toBe(2);
        expect(craftRes.shinGuard?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_METACARPAL_PAD");
        expect(craftRes.shinGuard?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(360); // 370 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder shin guard bench", () => {
        const bench = AncientRunicLeatherHorseShinGuardBenchEngine.constructBench("leather_mid", "ELDER_SHIN_GUARD_BENCH");
        const craftRes = AncientRunicLeatherHorseShinGuardBenchEngine.craftShinGuard(
            bench,
            "NOVICE_EXPEDITION_SHIN_GUARD",
            ["TANNED_BULL_CANNON_STRAP", "TANNED_BULL_CANNON_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.shinGuard?.shinGuardStabilityPercent).toBe(37);
        expect(craftRes.shinGuard?.finalCannonBoneImpactDeflectionPercent).toBe(26);
        expect(craftRes.shinGuard?.finalFlexorTendonShieldingPercent).toBe(16);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseShinGuardBenchEngine.constructBench("leather_fail", "ELDER_SHIN_GUARD_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseShinGuardBenchEngine.craftShinGuard(
            bench,
            "NOVICE_EXPEDITION_SHIN_GUARD",
            ["TANNED_BULL_CANNON_STRAP", "TANNED_BULL_CANNON_STRAP", "TANNED_BULL_CANNON_STRAP"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Cannon bone splint warped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseShinGuardBenchEngine.constructBench("leather_short", "RUNIC_OAK_SHIN_GUARD_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseShinGuardBenchEngine.craftShinGuard(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_SHIN_GUARD",
            ["TEMPERED_MITHRIL_CANNON_SPLINT"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient cannon straps/splints");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveShinGuardBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_SHIN_GUARD_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseShinGuardBenchEngine.craftShinGuard(
            brokenBench,
            "NOVICE_EXPEDITION_SHIN_GUARD",
            ["TANNED_BULL_CANNON_STRAP", "TANNED_BULL_CANNON_STRAP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveShinGuardBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_SHIN_GUARD_RIG",
            currentDurability: 0,
            maxDurability: 215,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseShinGuardBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseShinGuardBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(215);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseShinGuardBenchEngine.constructBench("p_def", "ELDER_SHIN_GUARD_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseShinGuardBenchEngine.craftShinGuard(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_CANNON_STRAP", "TANNED_BULL_CANNON_STRAP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse shin guard recipe");

        const invalidLeathers = AncientRunicLeatherHorseShinGuardBenchEngine.craftShinGuard(
            bench,
            "NOVICE_EXPEDITION_SHIN_GUARD",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
