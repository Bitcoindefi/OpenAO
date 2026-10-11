import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseSurcingleBenchEngine } from "../lib/ancientRunicLeatherHorseSurcingleBench";
import type { ActiveSurcingleBench } from "../lib/ancientRunicLeatherHorseSurcingleBench";

describe("AncientRunicLeatherHorseSurcingleBenchEngine Equestrian Surcingle Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Surcingle in Surcingle Sanctum achieving 100% girth stability and returns remaining pelts", () => {
        const bench = AncientRunicLeatherHorseSurcingleBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_SURCINGLE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_SURCINGLE_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_SURCINGLE_PELT",
            "CELESTIAL_VOID_ASTRAL_SURCINGLE_PELT",
            "CELESTIAL_VOID_ASTRAL_SURCINGLE_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseSurcingleBenchEngine.craftSurcingle(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SURCINGLE",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.surcingle?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SURCINGLE");
        expect(craftRes.surcingle?.surcingleGirthStabilityPercent).toBe(100);
        expect(craftRes.surcingle?.finalWithersPaddingComfortPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.surcingle?.finalSideReinAnchorSecurityPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.surcingle?.consumedLeatherCount).toBe(2);
        expect(craftRes.surcingle?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_SURCINGLE_PELT");
        expect(craftRes.surcingle?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder surcingle bench", () => {
        const bench = AncientRunicLeatherHorseSurcingleBenchEngine.constructBench("leather_mid", "ELDER_SURCINGLE_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeStabilityRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalWithers = Math.round(24 * 0.944) = 23
        // finalSecurity = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseSurcingleBenchEngine.craftSurcingle(
            bench,
            "NOVICE_EXPEDITION_SURCINGLE",
            ["TANNED_BULL_SURCINGLE_STRAP", "TANNED_BULL_SURCINGLE_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.surcingle?.surcingleGirthStabilityPercent).toBe(36);
        expect(craftRes.surcingle?.finalWithersPaddingComfortPercent).toBe(23);
        expect(craftRes.surcingle?.finalSideReinAnchorSecurityPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseSurcingleBenchEngine.constructBench("leather_wear", "ELDER_SURCINGLE_BENCH");
        bench.currentDurability = 10; // Exactly 1 craft left

        const craftRes = AncientRunicLeatherHorseSurcingleBenchEngine.craftSurcingle(
            bench,
            "NOVICE_EXPEDITION_SURCINGLE",
            ["TANNED_BULL_SURCINGLE_STRAP", "TANNED_BULL_SURCINGLE_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.remainingDurability).toBe(0);
        expect(craftRes.updatedBench?.isFunctional).toBe(false);

        // Next craft should fail
        const nextCraft = AncientRunicLeatherHorseSurcingleBenchEngine.craftSurcingle(
            craftRes.updatedBench!,
            "NOVICE_EXPEDITION_SURCINGLE",
            ["TANNED_BULL_SURCINGLE_STRAP", "TANNED_BULL_SURCINGLE_STRAP"]
        );
        expect(nextCraft.success).toBe(false);
        expect(nextCraft.reason).toContain("warped or lacks durability");
    });

    it("deducts materials upfront on craft failure due to bad roll and returns remaining leathers", () => {
        const bench = AncientRunicLeatherHorseSurcingleBenchEngine.constructBench("leather_fail", "RUNIC_OAK_SURCINGLE_RIG");
        const initialLeathers = [
            "TEMPERED_MITHRIL_ROLLER_BUCKLE_RING",
            "TEMPERED_MITHRIL_ROLLER_BUCKLE_RING",
            "TEMPERED_MITHRIL_ROLLER_BUCKLE_RING"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseSurcingleBenchEngine.craftSurcingle(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_SURCINGLE",
            initialLeathers,
            0.99, // Fails: 99% > 94%
            0.5
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Surcingle strap misaligned");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 - 2 = 1
        expect(craftRes.remainingDurability).toBe(190); // 200 - 10
    });

    it("defensively rejects crafting if materials are insufficient without consuming durability", () => {
        const bench = AncientRunicLeatherHorseSurcingleBenchEngine.constructBench("leather_short", "ELDER_SURCINGLE_BENCH");

        const craftRes = AncientRunicLeatherHorseSurcingleBenchEngine.craftSurcingle(
            bench,
            "NOVICE_EXPEDITION_SURCINGLE",
            ["TANNED_BULL_SURCINGLE_STRAP"] // Requires 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient surcingle straps/roller buckle rings");
        expect(craftRes.remainingDurability).toBe(bench.currentDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("maintains bench restoring durability up to maxDurability and restores functionality", () => {
        const bench: ActiveSurcingleBench = {
            benchId: "bench_damaged",
            leatherworkerPlayerId: "player_1",
            benchType: "ELDER_SURCINGLE_BENCH",
            currentDurability: 5,
            maxDurability: 95,
            isFunctional: false,
        };

        const maintainRes = AncientRunicLeatherHorseSurcingleBenchEngine.maintainBench(bench, 50);
        expect(maintainRes.success).toBe(true);
        expect(maintainRes.newDurability).toBe(55);
        expect(maintainRes.isFunctional).toBe(true);
        expect(maintainRes.updatedBench?.currentDurability).toBe(55);

        // Clamping to maxDurability
        const overRepair = AncientRunicLeatherHorseSurcingleBenchEngine.maintainBench(maintainRes.updatedBench!, 100);
        expect(overRepair.newDurability).toBe(95);
    });

    it("defensively handles null or undefined inputs across construct, craft, and maintain", () => {
        expect(() => AncientRunicLeatherHorseSurcingleBenchEngine.constructBench("p1", "INVALID_BENCH" as any)).toThrow();

        const nullCraft = AncientRunicLeatherHorseSurcingleBenchEngine.craftSurcingle(
            null as any,
            "NOVICE_EXPEDITION_SURCINGLE",
            []
        );
        expect(nullCraft.success).toBe(false);

        const nullMaintain = AncientRunicLeatherHorseSurcingleBenchEngine.maintainBench(null as any);
        expect(nullMaintain.success).toBe(false);
    });
});
