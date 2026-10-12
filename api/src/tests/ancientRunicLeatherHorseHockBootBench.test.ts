import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseHockBootBenchEngine } from "../lib/ancientRunicLeatherHorseHockBootBench";
import type { ActiveHockBootBench } from "../lib/ancientRunicLeatherHorseHockBootBench";

describe("AncientRunicLeatherHorseHockBootBenchEngine Equestrian Tarsal Joint Protector Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Hock Boot in Hock Boot Sanctum achieving 100% stability and returns remaining pads", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_HOCK_BOOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_HOCK_BOOT_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_CALCANEUS_PAD",
            "CELESTIAL_VOID_ASTRAL_CALCANEUS_PAD",
            "CELESTIAL_VOID_ASTRAL_CALCANEUS_PAD"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoot(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HOCK_BOOT",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.hockBoot?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HOCK_BOOT");
        expect(craftRes.hockBoot?.hockBootStabilityPercent).toBe(100);
        expect(craftRes.hockBoot?.finalTarsalImpactAbsorptionPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped 100%
        expect(craftRes.hockBoot?.finalHockFlexionSupportPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.hockBoot?.consumedLeatherCount).toBe(2);
        expect(craftRes.hockBoot?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_CALCANEUS_PAD");
        expect(craftRes.hockBoot?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder hock boot bench", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("leather_mid", "ELDER_HOCK_BOOT_BENCH");
        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoot(
            bench,
            "NOVICE_EXPEDITION_HOCK_BOOT",
            ["TANNED_BULL_HOCK_CUP", "TANNED_BULL_HOCK_CUP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.hockBoot?.hockBootStabilityPercent).toBe(36);
        expect(craftRes.hockBoot?.finalTarsalImpactAbsorptionPercent).toBe(23);
        expect(craftRes.hockBoot?.finalHockFlexionSupportPercent).toBe(13);
        expect(craftRes.remainingDurability).toBe(85); // 95 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("leather_fail", "ELDER_HOCK_BOOT_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoot(
            bench,
            "NOVICE_EXPEDITION_HOCK_BOOT",
            ["TANNED_BULL_HOCK_CUP", "TANNED_BULL_HOCK_CUP", "TANNED_BULL_HOCK_CUP"],
            0.99 // Fails (threshold is 0.87)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Tarsal hinge slipped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("leather_short", "RUNIC_OAK_HOCK_BOOT_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoot(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_HOCK_BOOT",
            ["TEMPERED_MITHRIL_TARSAL_HINGE"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient hock cups/hinges");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveHockBootBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_HOCK_BOOT_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 95,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoot(
            brokenBench,
            "NOVICE_EXPEDITION_HOCK_BOOT",
            ["TANNED_BULL_HOCK_CUP", "TANNED_BULL_HOCK_CUP"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveHockBootBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_HOCK_BOOT_RIG",
            currentDurability: 0,
            maxDurability: 200,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseHockBootBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseHockBootBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(200);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseHockBootBenchEngine.constructBench("p_def", "ELDER_HOCK_BOOT_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoot(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_BULL_HOCK_CUP", "TANNED_BULL_HOCK_CUP"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse hock boot recipe");

        const invalidLeathers = AncientRunicLeatherHorseHockBootBenchEngine.craftHockBoot(
            bench,
            "NOVICE_EXPEDITION_HOCK_BOOT",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});
