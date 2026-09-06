import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseTieDownBenchEngine } from "../lib/ancientRunicLeatherHorseTieDownBench";
import type { ActiveTieDownBench } from "../lib/ancientRunicLeatherHorseTieDownBench";

describe("AncientRunicLeatherHorseTieDownBenchEngine Equestrian Tie Down Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Tie Down in Tie Down Sanctum achieving 100% stability and returns remaining pelts", () => {
        const bench = AncientRunicLeatherHorseTieDownBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_TIE_DOWN_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_TIE_DOWN_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_TIE_DOWN_PELT",
            "CELESTIAL_VOID_ASTRAL_TIE_DOWN_PELT",
            "CELESTIAL_VOID_ASTRAL_TIE_DOWN_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseTieDownBenchEngine.craftTieDown(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_TIE_DOWN",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.tieDown?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_TIE_DOWN");
        expect(craftRes.tieDown?.tieDownRigidStabilityPercent).toBe(100);
        expect(craftRes.tieDown?.finalHeadCarriageControlPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.tieDown?.finalChestTensionStabilityPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.tieDown?.consumedLeatherCount).toBe(2);
        expect(craftRes.tieDown?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_TIE_DOWN_PELT");
        expect(craftRes.tieDown?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder tie down bench", () => {
        const bench = AncientRunicLeatherHorseTieDownBenchEngine.constructBench("leather_mid", "ELDER_TIE_DOWN_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeStabilityRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalHeadCarriage = Math.round(24 * 0.944) = 23
        // finalChestTension = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseTieDownBenchEngine.craftTieDown(
            bench,
            "NOVICE_EXPEDITION_TIE_DOWN",
            ["TANNED_BULL_TIE_DOWN_STRAP", "TANNED_BULL_TIE_DOWN_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.tieDown?.tieDownRigidStabilityPercent).toBe(36);
        expect(craftRes.tieDown?.finalHeadCarriageControlPercent).toBe(23);
        expect(craftRes.tieDown?.finalChestTensionStabilityPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseTieDownBenchEngine.constructBench("leather_wear", "ELDER_TIE_DOWN_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseTieDownBenchEngine.craftTieDown(
            bench,
            "NOVICE_EXPEDITION_TIE_DOWN",
            ["TANNED_BULL_TIE_DOWN_STRAP", "TANNED_BULL_TIE_DOWN_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseTieDownBenchEngine.craftTieDown(
            res1.updatedBench!,
            "NOVICE_EXPEDITION_TIE_DOWN",
            ["TANNED_BULL_TIE_DOWN_STRAP", "TANNED_BULL_TIE_DOWN_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseTieDownBenchEngine.constructBench("leather_02", "ELDER_TIE_DOWN_BENCH");

        const failRes = AncientRunicLeatherHorseTieDownBenchEngine.craftTieDown(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_TIE_DOWN",
            ["TEMPERED_MITHRIL_TIE_DOWN_SNAP_RING"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient tie down straps/snap rings");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles tie down strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseTieDownBenchEngine.constructBench("leather_03", "ELDER_TIE_DOWN_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseTieDownBenchEngine.craftTieDown(
            bench,
            "NOVICE_EXPEDITION_TIE_DOWN",
            ["TANNED_BULL_TIE_DOWN_STRAP", "TANNED_BULL_TIE_DOWN_STRAP", "TANNED_BULL_TIE_DOWN_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseTieDownBenchEngine.constructBench("leather_04", "ELDER_TIE_DOWN_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseTieDownBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseTieDownBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseTieDownBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse tie down bench type"
        );

        const invalidBench: ActiveTieDownBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseTieDownBenchEngine.craftTieDown(invalidBench, "NOVICE_EXPEDITION_TIE_DOWN", ["TANNED_BULL_TIE_DOWN_STRAP", "TANNED_BULL_TIE_DOWN_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseTieDownBenchEngine.craftTieDown(null as any, "NOVICE_EXPEDITION_TIE_DOWN", []).success).toBe(false);
        expect(AncientRunicLeatherHorseTieDownBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
