import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseCheckreinBenchEngine } from "../lib/ancientRunicLeatherHorseCheckreinBench";
import type { ActiveCheckreinBench } from "../lib/ancientRunicLeatherHorseCheckreinBench";

describe("AncientRunicLeatherHorseCheckreinBenchEngine Equestrian Bearing Rein Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Checkrein in Checkrein Sanctum achieving 100% stability and returns remaining cords", () => {
        const bench = AncientRunicLeatherHorseCheckreinBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_CHECKREIN_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_CHECKREIN_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_CHECKREIN_CORD",
            "CELESTIAL_VOID_ASTRAL_CHECKREIN_CORD",
            "CELESTIAL_VOID_ASTRAL_CHECKREIN_CORD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseCheckreinBenchEngine.craftCheckrein(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHECKREIN",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.checkrein?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHECKREIN");
        expect(craftRes.checkrein?.checkreinStabilityPercent).toBe(100);
        expect(craftRes.checkrein?.finalHeadElevationControlPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped 100%
        expect(craftRes.checkrein?.finalNeckFatigueMitigationPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.checkrein?.consumedLeatherCount).toBe(2);
        expect(craftRes.checkrein?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_CHECKREIN_CORD");
        expect(craftRes.checkrein?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder checkrein bench", () => {
        const bench = AncientRunicLeatherHorseCheckreinBenchEngine.constructBench("leather_mid", "ELDER_CHECKREIN_BENCH");
        const craftRes = AncientRunicLeatherHorseCheckreinBenchEngine.craftCheckrein(
            bench,
            "NOVICE_EXPEDITION_CHECKREIN",
            ["TANNED_BULL_CHECKREIN_STRAP", "TANNED_BULL_CHECKREIN_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.checkrein?.checkreinStabilityPercent).toBe(36);
        expect(craftRes.checkrein?.finalHeadElevationControlPercent).toBe(23);
        expect(craftRes.checkrein?.finalNeckFatigueMitigationPercent).toBe(13);
        expect(craftRes.remainingDurability).toBe(85); // 95 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseCheckreinBenchEngine.constructBench("leather_fail", "ELDER_CHECKREIN_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseCheckreinBenchEngine.craftCheckrein(
            bench,
            "NOVICE_EXPEDITION_CHECKREIN",
            ["TANNED_BULL_CHECKREIN_STRAP", "TANNED_BULL_CHECKREIN_STRAP", "TANNED_BULL_CHECKREIN_STRAP"],
            0.99 // Fails (threshold is 0.87)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Bearing hook slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseCheckreinBenchEngine.constructBench("leather_short", "RUNIC_OAK_CHECKREIN_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseCheckreinBenchEngine.craftCheckrein(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_CHECKREIN",
            ["TEMPERED_MITHRIL_BEARING_HOOK"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient checkrein straps/bearing hooks");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveCheckreinBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_CHECKREIN_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 95,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseCheckreinBenchEngine.craftCheckrein(
            brokenBench,
            "NOVICE_EXPEDITION_CHECKREIN",
            ["TANNED_BULL_CHECKREIN_STRAP", "TANNED_BULL_CHECKREIN_STRAP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveCheckreinBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_CHECKREIN_RIG",
            currentDurability: 0,
            maxDurability: 200,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseCheckreinBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseCheckreinBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(200);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseCheckreinBenchEngine.constructBench("p_def", "ELDER_CHECKREIN_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseCheckreinBenchEngine.craftCheckrein(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_CHECKREIN_STRAP", "TANNED_BULL_CHECKREIN_STRAP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse checkrein recipe");

        const invalidLeathers = AncientRunicLeatherHorseCheckreinBenchEngine.craftCheckrein(
            bench,
            "NOVICE_EXPEDITION_CHECKREIN",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
