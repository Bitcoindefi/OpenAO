import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseBrowbandBenchEngine } from "../lib/ancientRunicLeatherHorseBrowbandBench";
import type { ActiveBrowbandBench } from "../lib/ancientRunicLeatherHorseBrowbandBench";

describe("AncientRunicLeatherHorseBrowbandBenchEngine Equestrian Forehead Diadem Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Browband in Browband Sanctum achieving 100% stability and returns remaining pads", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_BROWBAND_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_BROWBAND_SANCTUM");
        expect(bench.currentDurability).toBe(380);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_DIADEM_PAD",
            "CELESTIAL_VOID_ASTRAL_DIADEM_PAD",
            "CELESTIAL_VOID_ASTRAL_DIADEM_PAD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.browband?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND");
        expect(craftRes.browband?.browbandStabilityPercent).toBe(100);
        expect(craftRes.browband?.finalBridleLateralSlipPreventionPercent).toBe(100); // 88 * 1.20 = 105.6 -> clamped 100%
        expect(craftRes.browband?.finalFrontalCranialProtectionPercent).toBe(82); // 68 * 1.20 = 81.6 -> 82%
        expect(craftRes.browband?.consumedLeatherCount).toBe(2);
        expect(craftRes.browband?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_DIADEM_PAD");
        expect(craftRes.browband?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(370); // 380 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder browband bench", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_mid", "ELDER_BROWBAND_BENCH");
        const craftRes = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "NOVICE_EXPEDITION_BROWBAND",
            ["TANNED_BULL_FRONTAL_STRAP", "TANNED_BULL_FRONTAL_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.browband?.browbandStabilityPercent).toBe(37);
        expect(craftRes.browband?.finalBridleLateralSlipPreventionPercent).toBe(27);
        expect(craftRes.browband?.finalFrontalCranialProtectionPercent).toBe(17);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_fail", "ELDER_BROWBAND_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "NOVICE_EXPEDITION_BROWBAND",
            ["TANNED_BULL_FRONTAL_STRAP", "TANNED_BULL_FRONTAL_STRAP", "TANNED_BULL_FRONTAL_STRAP"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Forehead crest buckle slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_short", "RUNIC_OAK_BROWBAND_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_BROWBAND",
            ["TEMPERED_MITHRIL_FOREHEAD_CREST"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient frontal straps/crests");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveBrowbandBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_BROWBAND_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            brokenBench,
            "NOVICE_EXPEDITION_BROWBAND",
            ["TANNED_BULL_FRONTAL_STRAP", "TANNED_BULL_FRONTAL_STRAP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveBrowbandBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_BROWBAND_RIG",
            currentDurability: 0,
            maxDurability: 220,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseBrowbandBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseBrowbandBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(220);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("p_def", "ELDER_BROWBAND_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_FRONTAL_STRAP", "TANNED_BULL_FRONTAL_STRAP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse browband recipe");

        const invalidLeathers = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "NOVICE_EXPEDITION_BROWBAND",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
