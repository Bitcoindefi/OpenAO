import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseBitGuardBenchEngine } from "../lib/ancientRunicLeatherHorseBitGuardBench";
import type { ActiveBitGuardBench } from "../lib/ancientRunicLeatherHorseBitGuardBench";

describe("AncientRunicLeatherHorseBitGuardBenchEngine Equestrian Bit Guards & Cheek Protection Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Bit Guards in Sanctum achieving 100% stability and returns remaining discs", () => {
        const bench = AncientRunicLeatherHorseBitGuardBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_BIT_GUARD_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_BIT_GUARD_SANCTUM");
        expect(bench.currentDurability).toBe(380);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_GEL_GUARD",
            "CELESTIAL_VOID_ASTRAL_GEL_GUARD",
            "CELESTIAL_VOID_ASTRAL_GEL_GUARD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseBitGuardBenchEngine.craftBitGuards(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BIT_GUARDS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.guards?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BIT_GUARDS");
        expect(craftRes.guards?.guardStabilityPercent).toBe(100);
        expect(craftRes.guards?.finalCheekChafingMitigationPercent).toBe(100); // 89 * 1.20 = 106.8 -> clamped 100%
        expect(craftRes.guards?.finalBitStabilityPercent).toBe(80); // 67 * 1.20 = 80.4 -> 80%
        expect(craftRes.guards?.consumedLeatherCount).toBe(2);
        expect(craftRes.guards?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_GEL_GUARD");
        expect(craftRes.guards?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(370); // 380 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder bit guard bench", () => {
        const bench = AncientRunicLeatherHorseBitGuardBenchEngine.constructBench("leather_mid", "ELDER_BIT_GUARD_BENCH");
        const craftRes = AncientRunicLeatherHorseBitGuardBenchEngine.craftBitGuards(
            bench,
            "NOVICE_EXPEDITION_BIT_GUARDS",
            ["TANNED_CALF_CHEEK_DISC", "TANNED_CALF_CHEEK_DISC"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.guards?.guardStabilityPercent).toBe(37);
        expect(craftRes.guards?.finalCheekChafingMitigationPercent).toBe(26);
        expect(craftRes.guards?.finalBitStabilityPercent).toBe(16);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseBitGuardBenchEngine.constructBench("leather_fail", "ELDER_BIT_GUARD_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBitGuardBenchEngine.craftBitGuards(
            bench,
            "NOVICE_EXPEDITION_BIT_GUARDS",
            ["TANNED_CALF_CHEEK_DISC", "TANNED_CALF_CHEEK_DISC", "TANNED_CALF_CHEEK_DISC"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Cheek disc edge curled");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseBitGuardBenchEngine.constructBench("leather_short", "RUNIC_OAK_BIT_GUARD_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseBitGuardBenchEngine.craftBitGuards(
            bench,
            "WARMASTER_MITHRIL_RIMMED_BIT_GUARDS",
            ["TEMPERED_MITHRIL_RIMMED_GUARD"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient guard discs/pads");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveBitGuardBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_BIT_GUARD_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseBitGuardBenchEngine.craftBitGuards(
            brokenBench,
            "NOVICE_EXPEDITION_BIT_GUARDS",
            ["TANNED_CALF_CHEEK_DISC", "TANNED_CALF_CHEEK_DISC"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveBitGuardBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_BIT_GUARD_RIG",
            currentDurability: 0,
            maxDurability: 220,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseBitGuardBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseBitGuardBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(220);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseBitGuardBenchEngine.constructBench("p_def", "ELDER_BIT_GUARD_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseBitGuardBenchEngine.craftBitGuards(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_CALF_CHEEK_DISC", "TANNED_CALF_CHEEK_DISC"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse bit guard recipe");

        const invalidLeathers = AncientRunicLeatherHorseBitGuardBenchEngine.craftBitGuards(
            bench,
            "NOVICE_EXPEDITION_BIT_GUARDS",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
