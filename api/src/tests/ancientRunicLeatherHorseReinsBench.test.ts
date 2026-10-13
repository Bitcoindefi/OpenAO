import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseReinsBenchEngine } from "../lib/ancientRunicLeatherHorseReinsBench";
import type { ActiveReinsBench } from "../lib/ancientRunicLeatherHorseReinsBench";

describe("AncientRunicLeatherHorseReinsBenchEngine Equestrian Reins & Bit Coupling Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Reins in Reins Sanctum achieving 100% stability and returns remaining pads", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_REINS_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_REINS_SANCTUM");
        expect(bench.currentDurability).toBe(380);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_SNAFFLE_PAD",
            "CELESTIAL_VOID_ASTRAL_SNAFFLE_PAD",
            "CELESTIAL_VOID_ASTRAL_SNAFFLE_PAD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.reins?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS");
        expect(craftRes.reins?.reinsStabilityPercent).toBe(100);
        expect(craftRes.reins?.finalSteeringResponsePrecisionPercent).toBe(100); // 88 * 1.20 = 105.6 -> clamped 100%
        expect(craftRes.reins?.finalMouthJerkDampingPercent).toBe(82); // 68 * 1.20 = 81.6 -> 82%
        expect(craftRes.reins?.consumedLeatherCount).toBe(2);
        expect(craftRes.reins?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_SNAFFLE_PAD");
        expect(craftRes.reins?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(370); // 380 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder reins bench", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_mid", "ELDER_REINS_BENCH");
        const craftRes = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "NOVICE_EXPEDITION_REINS",
            ["TANNED_BULL_GUIDE_REIN_STRAP", "TANNED_BULL_GUIDE_REIN_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.reins?.reinsStabilityPercent).toBe(38);
        expect(craftRes.reins?.finalSteeringResponsePrecisionPercent).toBe(27);
        expect(craftRes.reins?.finalMouthJerkDampingPercent).toBe(17);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_fail", "ELDER_REINS_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "NOVICE_EXPEDITION_REINS",
            ["TANNED_BULL_GUIDE_REIN_STRAP", "TANNED_BULL_GUIDE_REIN_STRAP", "TANNED_BULL_GUIDE_REIN_STRAP"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Bit coupling slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("leather_short", "RUNIC_OAK_REINS_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_REINS",
            ["TEMPERED_MITHRIL_BIT_COUPLING"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient rein straps/couplings");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveReinsBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_REINS_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            brokenBench,
            "NOVICE_EXPEDITION_REINS",
            ["TANNED_BULL_GUIDE_REIN_STRAP", "TANNED_BULL_GUIDE_REIN_STRAP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveReinsBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_REINS_RIG",
            currentDurability: 0,
            maxDurability: 220,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseReinsBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseReinsBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(220);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseReinsBenchEngine.constructBench("p_def", "ELDER_REINS_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_GUIDE_REIN_STRAP", "TANNED_BULL_GUIDE_REIN_STRAP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse reins recipe");

        const invalidLeathers = AncientRunicLeatherHorseReinsBenchEngine.craftReins(
            bench,
            "NOVICE_EXPEDITION_REINS",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
