import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseFlyVeilBenchEngine } from "../lib/ancientRunicLeatherHorseFlyVeilBench";
import type { ActiveFlyVeilBench } from "../lib/ancientRunicLeatherHorseFlyVeilBench";

describe("AncientRunicLeatherHorseFlyVeilBenchEngine Equestrian Fly Veil Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Fly Veil in Fly Veil Sanctum achieving 100% crown stability and returns remaining pelts", () => {
        const bench = AncientRunicLeatherHorseFlyVeilBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_FLY_VEIL_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_FLY_VEIL_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_FLY_VEIL_PELT",
            "CELESTIAL_VOID_ASTRAL_FLY_VEIL_PELT",
            "CELESTIAL_VOID_ASTRAL_FLY_VEIL_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseFlyVeilBenchEngine.craftFlyVeil(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLY_VEIL",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.flyVeil?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLY_VEIL");
        expect(craftRes.flyVeil?.flyVeilCrownStabilityPercent).toBe(100);
        expect(craftRes.flyVeil?.finalAcousticDampeningPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.flyVeil?.finalInsectDeflectionRatingPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.flyVeil?.consumedLeatherCount).toBe(2);
        expect(craftRes.flyVeil?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_FLY_VEIL_PELT");
        expect(craftRes.flyVeil?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder fly veil bench", () => {
        const bench = AncientRunicLeatherHorseFlyVeilBenchEngine.constructBench("leather_mid", "ELDER_FLY_VEIL_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeStabilityRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalAcoustic = Math.round(24 * 0.944) = 23
        // finalDeflection = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseFlyVeilBenchEngine.craftFlyVeil(
            bench,
            "NOVICE_EXPEDITION_FLY_VEIL",
            ["TANNED_BULL_FLY_VEIL_STRAP", "TANNED_BULL_FLY_VEIL_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.flyVeil?.flyVeilCrownStabilityPercent).toBe(36);
        expect(craftRes.flyVeil?.finalAcousticDampeningPercent).toBe(23);
        expect(craftRes.flyVeil?.finalInsectDeflectionRatingPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseFlyVeilBenchEngine.constructBench("leather_wear", "ELDER_FLY_VEIL_BENCH");
        bench.currentDurability = 10; // Exactly 1 craft left

        const craftRes = AncientRunicLeatherHorseFlyVeilBenchEngine.craftFlyVeil(
            bench,
            "NOVICE_EXPEDITION_FLY_VEIL",
            ["TANNED_BULL_FLY_VEIL_STRAP", "TANNED_BULL_FLY_VEIL_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.remainingDurability).toBe(0);
        expect(craftRes.updatedBench?.isFunctional).toBe(false);

        // Next craft should fail
        const nextCraft = AncientRunicLeatherHorseFlyVeilBenchEngine.craftFlyVeil(
            craftRes.updatedBench!,
            "NOVICE_EXPEDITION_FLY_VEIL",
            ["TANNED_BULL_FLY_VEIL_STRAP", "TANNED_BULL_FLY_VEIL_STRAP"]
        );
        expect(nextCraft.success).toBe(false);
        expect(nextCraft.reason).toContain("warped or lacks durability");
    });

    it("deducts materials upfront on craft failure due to bad roll and returns remaining leathers", () => {
        const bench = AncientRunicLeatherHorseFlyVeilBenchEngine.constructBench("leather_fail", "RUNIC_OAK_FLY_VEIL_RIG");
        const initialLeathers = [
            "TEMPERED_MITHRIL_MESH_WEAVE",
            "TEMPERED_MITHRIL_MESH_WEAVE",
            "TEMPERED_MITHRIL_MESH_WEAVE"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseFlyVeilBenchEngine.craftFlyVeil(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_FLY_VEIL",
            initialLeathers,
            0.99, // Fails: 99% > 94%
            0.5
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Fly veil weave frayed");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 - 2 = 1
        expect(craftRes.remainingDurability).toBe(190); // 200 - 10
    });

    it("defensively rejects crafting if materials are insufficient without consuming durability", () => {
        const bench = AncientRunicLeatherHorseFlyVeilBenchEngine.constructBench("leather_short", "ELDER_FLY_VEIL_BENCH");

        const craftRes = AncientRunicLeatherHorseFlyVeilBenchEngine.craftFlyVeil(
            bench,
            "NOVICE_EXPEDITION_FLY_VEIL",
            ["TANNED_BULL_FLY_VEIL_STRAP"] // Requires 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient fly veil straps/mithril mesh");
        expect(craftRes.remainingDurability).toBe(bench.currentDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("maintains bench restoring durability up to maxDurability and restores functionality", () => {
        const bench: ActiveFlyVeilBench = {
            benchId: "bench_damaged",
            leatherworkerPlayerId: "player_1",
            benchType: "ELDER_FLY_VEIL_BENCH",
            currentDurability: 5,
            maxDurability: 95,
            isFunctional: false,
        };

        const maintainRes = AncientRunicLeatherHorseFlyVeilBenchEngine.maintainBench(bench, 50);
        expect(maintainRes.success).toBe(true);
        expect(maintainRes.newDurability).toBe(55);
        expect(maintainRes.isFunctional).toBe(true);
        expect(maintainRes.updatedBench?.currentDurability).toBe(55);

        // Clamping to maxDurability
        const overRepair = AncientRunicLeatherHorseFlyVeilBenchEngine.maintainBench(maintainRes.updatedBench!, 100);
        expect(overRepair.newDurability).toBe(95);
    });

    it("defensively handles null or undefined inputs across construct, craft, and maintain", () => {
        expect(() => AncientRunicLeatherHorseFlyVeilBenchEngine.constructBench("p1", "INVALID_BENCH" as any)).toThrow();

        const nullCraft = AncientRunicLeatherHorseFlyVeilBenchEngine.craftFlyVeil(
            null as any,
            "NOVICE_EXPEDITION_FLY_VEIL",
            []
        );
        expect(nullCraft.success).toBe(false);

        const nullMaintain = AncientRunicLeatherHorseFlyVeilBenchEngine.maintainBench(null as any);
        expect(nullMaintain.success).toBe(false);
    });
});
