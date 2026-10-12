import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseCrupperDockBenchEngine } from "../lib/ancientRunicLeatherHorseCrupperDockBench";
import type { ActiveCrupperDockBench } from "../lib/ancientRunicLeatherHorseCrupperDockBench";

describe("AncientRunicLeatherHorseCrupperDockBenchEngine Equestrian Crupper Dock Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Crupper Dock in Crupper Dock Sanctum achieving 100% stability and returns remaining fleeces", () => {
        const bench = AncientRunicLeatherHorseCrupperDockBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_CRUPPER_DOCK_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_CRUPPER_DOCK_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_DOCK_FLEECE",
            "CELESTIAL_VOID_ASTRAL_DOCK_FLEECE",
            "CELESTIAL_VOID_ASTRAL_DOCK_FLEECE"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseCrupperDockBenchEngine.craftCrupperDock(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER_DOCK",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.crupperDock?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER_DOCK");
        expect(craftRes.crupperDock?.crupperDockStabilityPercent).toBe(100);
        expect(craftRes.crupperDock?.finalTailChafingResistancePercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped 100%
        expect(craftRes.crupperDock?.finalSaddleForwardSlipPreventionPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.crupperDock?.consumedLeatherCount).toBe(2);
        expect(craftRes.crupperDock?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_DOCK_FLEECE");
        expect(craftRes.crupperDock?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder crupper dock bench", () => {
        const bench = AncientRunicLeatherHorseCrupperDockBenchEngine.constructBench("leather_mid", "ELDER_CRUPPER_DOCK_BENCH");
        const craftRes = AncientRunicLeatherHorseCrupperDockBenchEngine.craftCrupperDock(
            bench,
            "NOVICE_EXPEDITION_CRUPPER_DOCK",
            ["TANNED_BULL_DOCK_ROLL", "TANNED_BULL_DOCK_ROLL"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.crupperDock?.crupperDockStabilityPercent).toBe(36);
        expect(craftRes.crupperDock?.finalTailChafingResistancePercent).toBe(23);
        expect(craftRes.crupperDock?.finalSaddleForwardSlipPreventionPercent).toBe(13);
        expect(craftRes.remainingDurability).toBe(85); // 95 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseCrupperDockBenchEngine.constructBench("leather_fail", "ELDER_CRUPPER_DOCK_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseCrupperDockBenchEngine.craftCrupperDock(
            bench,
            "NOVICE_EXPEDITION_CRUPPER_DOCK",
            ["TANNED_BULL_DOCK_ROLL", "TANNED_BULL_DOCK_ROLL", "TANNED_BULL_DOCK_ROLL"],
            0.99 // Fails (threshold is 0.87)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Dock stitch slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseCrupperDockBenchEngine.constructBench("leather_short", "RUNIC_OAK_CRUPPER_DOCK_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseCrupperDockBenchEngine.craftCrupperDock(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_CRUPPER_DOCK",
            ["TEMPERED_MITHRIL_DOCK_BUCKLE"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient dock rolls/buckles");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveCrupperDockBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_CRUPPER_DOCK_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 95,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseCrupperDockBenchEngine.craftCrupperDock(
            brokenBench,
            "NOVICE_EXPEDITION_CRUPPER_DOCK",
            ["TANNED_BULL_DOCK_ROLL", "TANNED_BULL_DOCK_ROLL"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveCrupperDockBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_CRUPPER_DOCK_RIG",
            currentDurability: 0,
            maxDurability: 200,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseCrupperDockBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseCrupperDockBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(200);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseCrupperDockBenchEngine.constructBench("p_def", "ELDER_CRUPPER_DOCK_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseCrupperDockBenchEngine.craftCrupperDock(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_DOCK_ROLL", "TANNED_BULL_DOCK_ROLL"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse crupper dock recipe");

        const invalidLeathers = AncientRunicLeatherHorseCrupperDockBenchEngine.craftCrupperDock(
            bench,
            "NOVICE_EXPEDITION_CRUPPER_DOCK",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
