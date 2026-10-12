import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorsePollPadBenchEngine } from "../lib/ancientRunicLeatherHorsePollPadBench";
import type { ActivePollPadBench } from "../lib/ancientRunicLeatherHorsePollPadBench";

describe("AncientRunicLeatherHorsePollPadBenchEngine Equestrian Crown Cushion Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Poll Pad in Poll Pad Sanctum achieving 100% stability and returns remaining fleeces", () => {
        const bench = AncientRunicLeatherHorsePollPadBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_POLL_PAD_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_POLL_PAD_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_POLL_FLEECE",
            "CELESTIAL_VOID_ASTRAL_POLL_FLEECE",
            "CELESTIAL_VOID_ASTRAL_POLL_FLEECE"
        ] as any[];

        const craftRes = AncientRunicLeatherHorsePollPadBenchEngine.craftPollPad(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POLL_PAD",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.pollPad?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POLL_PAD");
        expect(craftRes.pollPad?.pollPadStabilityPercent).toBe(100);
        expect(craftRes.pollPad?.finalCranialShockAbsorptionPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped 100%
        expect(craftRes.pollPad?.finalPollPressureDispersionPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.pollPad?.consumedLeatherCount).toBe(2);
        expect(craftRes.pollPad?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_POLL_FLEECE");
        expect(craftRes.pollPad?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder poll pad bench", () => {
        const bench = AncientRunicLeatherHorsePollPadBenchEngine.constructBench("leather_mid", "ELDER_POLL_PAD_BENCH");
        const craftRes = AncientRunicLeatherHorsePollPadBenchEngine.craftPollPad(
            bench,
            "NOVICE_EXPEDITION_POLL_PAD",
            ["TANNED_BULL_POLL_CUSHION", "TANNED_BULL_POLL_CUSHION"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.pollPad?.pollPadStabilityPercent).toBe(36);
        expect(craftRes.pollPad?.finalCranialShockAbsorptionPercent).toBe(23);
        expect(craftRes.pollPad?.finalPollPressureDispersionPercent).toBe(13);
        expect(craftRes.remainingDurability).toBe(85); // 95 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorsePollPadBenchEngine.constructBench("leather_fail", "ELDER_POLL_PAD_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorsePollPadBenchEngine.craftPollPad(
            bench,
            "NOVICE_EXPEDITION_POLL_PAD",
            ["TANNED_BULL_POLL_CUSHION", "TANNED_BULL_POLL_CUSHION", "TANNED_BULL_POLL_CUSHION"],
            0.99 // Fails (threshold is 0.87)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Cranial stitch slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorsePollPadBenchEngine.constructBench("leather_short", "RUNIC_OAK_POLL_PAD_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorsePollPadBenchEngine.craftPollPad(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_POLL_PAD",
            ["TEMPERED_MITHRIL_CRANIAL_PLATE"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient poll cushions/plates");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActivePollPadBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_POLL_PAD_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 95,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorsePollPadBenchEngine.craftPollPad(
            brokenBench,
            "NOVICE_EXPEDITION_POLL_PAD",
            ["TANNED_BULL_POLL_CUSHION", "TANNED_BULL_POLL_CUSHION"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActivePollPadBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_POLL_PAD_RIG",
            currentDurability: 0,
            maxDurability: 200,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorsePollPadBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorsePollPadBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(200);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorsePollPadBenchEngine.constructBench("p_def", "ELDER_POLL_PAD_BENCH");

        const invalidRecipe = AncientRunicLeatherHorsePollPadBenchEngine.craftPollPad(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_POLL_CUSHION", "TANNED_BULL_POLL_CUSHION"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse poll pad recipe");

        const invalidLeathers = AncientRunicLeatherHorsePollPadBenchEngine.craftPollPad(
            bench,
            "NOVICE_EXPEDITION_POLL_PAD",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
