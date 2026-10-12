import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseNosebandBenchEngine } from "../lib/ancientRunicLeatherHorseNosebandBench";
import type { ActiveNosebandBench } from "../lib/ancientRunicLeatherHorseNosebandBench";

describe("AncientRunicLeatherHorseNosebandBenchEngine Equestrian Cavesson Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Noseband in Noseband Sanctum achieving 100% stability and returns remaining pads", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_NOSEBAND_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_NOSEBAND_SANCTUM");
        expect(bench.currentDurability).toBe(375);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_CAVESSON_PAD",
            "CELESTIAL_VOID_ASTRAL_CAVESSON_PAD",
            "CELESTIAL_VOID_ASTRAL_CAVESSON_PAD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.noseband?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND");
        expect(craftRes.noseband?.nosebandStabilityPercent).toBe(100);
        expect(craftRes.noseband?.finalMandibularControlBonusPercent).toBe(100); // 88 * 1.20 = 105.6 -> clamped 100%
        expect(craftRes.noseband?.finalNasalImpactCushioningPercent).toBe(82); // 68 * 1.20 = 81.6 -> 82%
        expect(craftRes.noseband?.consumedLeatherCount).toBe(2);
        expect(craftRes.noseband?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_CAVESSON_PAD");
        expect(craftRes.noseband?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(365); // 375 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder noseband bench", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_mid", "ELDER_NOSEBAND_BENCH");
        const craftRes = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "NOVICE_EXPEDITION_NOSEBAND",
            ["TANNED_BULL_NASAL_STRAP", "TANNED_BULL_NASAL_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.noseband?.nosebandStabilityPercent).toBe(38);
        expect(craftRes.noseband?.finalMandibularControlBonusPercent).toBe(26);
        expect(craftRes.noseband?.finalNasalImpactCushioningPercent).toBe(16);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_fail", "ELDER_NOSEBAND_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "NOVICE_EXPEDITION_NOSEBAND",
            ["TANNED_BULL_NASAL_STRAP", "TANNED_BULL_NASAL_STRAP", "TANNED_BULL_NASAL_STRAP"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Nasal bridge splint slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_short", "RUNIC_OAK_NOSEBAND_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_NOSEBAND",
            ["TEMPERED_MITHRIL_NASAL_BRIDGE_SPLINT"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient nasal straps/splints");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveNosebandBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_NOSEBAND_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            brokenBench,
            "NOVICE_EXPEDITION_NOSEBAND",
            ["TANNED_BULL_NASAL_STRAP", "TANNED_BULL_NASAL_STRAP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveNosebandBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_NOSEBAND_RIG",
            currentDurability: 0,
            maxDurability: 218,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseNosebandBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseNosebandBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(218);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("p_def", "ELDER_NOSEBAND_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_NASAL_STRAP", "TANNED_BULL_NASAL_STRAP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse noseband recipe");

        const invalidLeathers = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "NOVICE_EXPEDITION_NOSEBAND",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
