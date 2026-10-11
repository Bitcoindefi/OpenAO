import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseBlindersBenchEngine } from "../lib/ancientRunicLeatherHorseBlindersBench";
import type { ActiveBlindersBench } from "../lib/ancientRunicLeatherHorseBlindersBench";

describe("AncientRunicLeatherHorseBlindersBenchEngine Equestrian Shadow Blinders & Winker Cup Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Blinders in Blinders Sanctum achieving 100% stability and returns remaining pelts", () => {
        const bench = AncientRunicLeatherHorseBlindersBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_BLINDERS_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_BLINDERS_SANCTUM");
        expect(bench.currentDurability).toBe(340);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_WINKER_SHROUD",
            "CELESTIAL_VOID_ASTRAL_WINKER_SHROUD",
            "CELESTIAL_VOID_ASTRAL_WINKER_SHROUD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseBlindersBenchEngine.craftBlinders(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BLINDERS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.blinders?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BLINDERS");
        expect(craftRes.blinders?.blindersStabilityPercent).toBe(100);
        expect(craftRes.blinders?.finalShadowFocusPercent).toBe(98); // 82 * 1.20 = 98.4 -> 98%
        expect(craftRes.blinders?.finalPeripheralDeflectionPercent).toBe(74); // 62 * 1.20 = 74.4 -> 74%
        expect(craftRes.blinders?.consumedLeatherCount).toBe(2);
        expect(craftRes.blinders?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_WINKER_SHROUD");
        expect(craftRes.blinders?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(330); // 340 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder blinders bench", () => {
        const bench = AncientRunicLeatherHorseBlindersBenchEngine.constructBench("leather_mid", "ELDER_BLINDERS_BENCH");
        const craftRes = AncientRunicLeatherHorseBlindersBenchEngine.craftBlinders(
            bench,
            "NOVICE_EXPEDITION_BLINDERS",
            ["TANNED_BULL_BLINDER_CUP", "TANNED_BULL_BLINDER_CUP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.blinders?.blindersStabilityPercent).toBe(35);
        expect(craftRes.blinders?.finalShadowFocusPercent).toBe(21);
        expect(craftRes.blinders?.finalPeripheralDeflectionPercent).toBe(11);
        expect(craftRes.remainingDurability).toBe(80); // 90 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseBlindersBenchEngine.constructBench("leather_fail", "ELDER_BLINDERS_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBlindersBenchEngine.craftBlinders(
            bench,
            "NOVICE_EXPEDITION_BLINDERS",
            ["TANNED_BULL_BLINDER_CUP", "TANNED_BULL_BLINDER_CUP", "TANNED_BULL_BLINDER_CUP"],
            0.99 // Fails (threshold is 0.86)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Blinder stitch slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseBlindersBenchEngine.constructBench("leather_short", "RUNIC_OAK_BLINDERS_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBlindersBenchEngine.craftBlinders(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_BLINDERS",
            ["TEMPERED_MITHRIL_CHEEK_PLATE"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient blinder cups/cheek plates");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveBlindersBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_BLINDERS_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 90,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseBlindersBenchEngine.craftBlinders(
            brokenBench,
            "NOVICE_EXPEDITION_BLINDERS",
            ["TANNED_BULL_BLINDER_CUP", "TANNED_BULL_BLINDER_CUP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveBlindersBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_BLINDERS_RIG",
            currentDurability: 0,
            maxDurability: 195,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseBlindersBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseBlindersBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(195);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseBlindersBenchEngine.constructBench("p_def", "ELDER_BLINDERS_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseBlindersBenchEngine.craftBlinders(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_BLINDER_CUP", "TANNED_BULL_BLINDER_CUP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse blinders recipe");

        const invalidLeathers = AncientRunicLeatherHorseBlindersBenchEngine.craftBlinders(
            bench,
            "NOVICE_EXPEDITION_BLINDERS",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
