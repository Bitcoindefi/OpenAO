import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseThroatlashBenchEngine } from "../lib/ancientRunicLeatherHorseThroatlashBench";
import type { ActiveThroatlashBench } from "../lib/ancientRunicLeatherHorseThroatlashBench";

describe("AncientRunicLeatherHorseThroatlashBenchEngine Equestrian Gular Arch Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Throatlash in Throatlash Sanctum achieving 100% stability and returns remaining pads", () => {
        const bench = AncientRunicLeatherHorseThroatlashBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_THROATLASH_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_THROATLASH_SANCTUM");
        expect(bench.currentDurability).toBe(380);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_THROATLATCH_PAD",
            "CELESTIAL_VOID_ASTRAL_THROATLATCH_PAD",
            "CELESTIAL_VOID_ASTRAL_THROATLATCH_PAD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseThroatlashBenchEngine.craftThroatlash(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLASH",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.throatlash?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLASH");
        expect(craftRes.throatlash?.throatlashStabilityPercent).toBe(100);
        expect(craftRes.throatlash?.finalBridleRetentionSecurityPercent).toBe(100); // 88 * 1.20 = 105.6 -> clamped 100%
        expect(craftRes.throatlash?.finalGularChokeReliefPercent).toBe(82); // 68 * 1.20 = 81.6 -> 82%
        expect(craftRes.throatlash?.consumedLeatherCount).toBe(2);
        expect(craftRes.throatlash?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_THROATLATCH_PAD");
        expect(craftRes.throatlash?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(370); // 380 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder throatlash bench", () => {
        const bench = AncientRunicLeatherHorseThroatlashBenchEngine.constructBench("leather_mid", "ELDER_THROATLASH_BENCH");
        const craftRes = AncientRunicLeatherHorseThroatlashBenchEngine.craftThroatlash(
            bench,
            "NOVICE_EXPEDITION_THROATLASH",
            ["TANNED_BULL_GULAR_STRAP", "TANNED_BULL_GULAR_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.throatlash?.throatlashStabilityPercent).toBe(38);
        expect(craftRes.throatlash?.finalBridleRetentionSecurityPercent).toBe(27);
        expect(craftRes.throatlash?.finalGularChokeReliefPercent).toBe(17);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseThroatlashBenchEngine.constructBench("leather_fail", "ELDER_THROATLASH_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseThroatlashBenchEngine.craftThroatlash(
            bench,
            "NOVICE_EXPEDITION_THROATLASH",
            ["TANNED_BULL_GULAR_STRAP", "TANNED_BULL_GULAR_STRAP", "TANNED_BULL_GULAR_STRAP"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Tracheal arch buckle slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseThroatlashBenchEngine.constructBench("leather_short", "RUNIC_OAK_THROATLASH_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseThroatlashBenchEngine.craftThroatlash(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_THROATLASH",
            ["TEMPERED_MITHRIL_TRACHEAL_ARCH"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient gular straps/arches");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveThroatlashBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_THROATLASH_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseThroatlashBenchEngine.craftThroatlash(
            brokenBench,
            "NOVICE_EXPEDITION_THROATLASH",
            ["TANNED_BULL_GULAR_STRAP", "TANNED_BULL_GULAR_STRAP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveThroatlashBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_THROATLASH_RIG",
            currentDurability: 0,
            maxDurability: 220,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseThroatlashBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseThroatlashBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(220);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseThroatlashBenchEngine.constructBench("p_def", "ELDER_THROATLASH_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseThroatlashBenchEngine.craftThroatlash(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_GULAR_STRAP", "TANNED_BULL_GULAR_STRAP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse throatlash recipe");

        const invalidLeathers = AncientRunicLeatherHorseThroatlashBenchEngine.craftThroatlash(
            bench,
            "NOVICE_EXPEDITION_THROATLASH",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
