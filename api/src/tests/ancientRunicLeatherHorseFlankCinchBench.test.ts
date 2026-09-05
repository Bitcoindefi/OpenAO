import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseFlankCinchBenchEngine } from "../lib/ancientRunicLeatherHorseFlankCinchBench";
import type { ActiveFlankCinchBench } from "../lib/ancientRunicLeatherHorseFlankCinchBench";

describe("AncientRunicLeatherHorseFlankCinchBenchEngine Rear Cinch Stitching Benches & Buckle Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Flank Cinch in Flank Sanctum achieving 100% tension and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseFlankCinchBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_FLANK_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_FLANK_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_FLANK_PELT",
            "CELESTIAL_VOID_ASTRAL_FLANK_PELT",
            "CELESTIAL_VOID_ASTRAL_FLANK_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseFlankCinchBenchEngine.craftFlankCinch(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLANK_CINCH",
            initialLeathers,
            0.1, // Success roll
            1.0, // Tension roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.flankCinch?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLANK_CINCH");
        expect(craftRes.flankCinch?.flankTensionPercent).toBe(100);
        expect(craftRes.flankCinch?.finalInclineStabilityPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.flankCinch?.finalSaddleRollMitigationPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.flankCinch?.consumedLeatherCount).toBe(2);
        expect(craftRes.flankCinch?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_FLANK_PELT");
        expect(craftRes.flankCinch?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range tension roll and sub-100% quality scaling on Elder flank cinch bench", () => {
        const bench = AncientRunicLeatherHorseFlankCinchBenchEngine.constructBench("leather_mid", "ELDER_FLANK_CINCH_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeTensionRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalStability = Math.round(24 * 0.944) = 23
        // finalRollMitigation = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseFlankCinchBenchEngine.craftFlankCinch(
            bench,
            "NOVICE_REAR_STABILIZER_FLANK_CINCH",
            ["TANNED_BUFFALO_FLANK_CINCH_STRAP", "TANNED_BUFFALO_FLANK_CINCH_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.flankCinch?.flankTensionPercent).toBe(36);
        expect(craftRes.flankCinch?.finalInclineStabilityPercent).toBe(23);
        expect(craftRes.flankCinch?.finalSaddleRollMitigationPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseFlankCinchBenchEngine.constructBench("leather_wear", "ELDER_FLANK_CINCH_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseFlankCinchBenchEngine.craftFlankCinch(
            bench,
            "NOVICE_REAR_STABILIZER_FLANK_CINCH",
            ["TANNED_BUFFALO_FLANK_CINCH_STRAP", "TANNED_BUFFALO_FLANK_CINCH_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseFlankCinchBenchEngine.craftFlankCinch(
            res1.updatedBench!,
            "NOVICE_REAR_STABILIZER_FLANK_CINCH",
            ["TANNED_BUFFALO_FLANK_CINCH_STRAP", "TANNED_BUFFALO_FLANK_CINCH_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseFlankCinchBenchEngine.constructBench("leather_02", "ELDER_FLANK_CINCH_BENCH");

        const failRes = AncientRunicLeatherHorseFlankCinchBenchEngine.craftFlankCinch(
            bench,
            "WARMASTER_MITHRIL_BUCKLED_FLANK_CINCH",
            ["TEMPERED_MITHRIL_FLANK_BUCKLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient flank cinch straps/buckle sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles flank cinch strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseFlankCinchBenchEngine.constructBench("leather_03", "ELDER_FLANK_CINCH_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseFlankCinchBenchEngine.craftFlankCinch(
            bench,
            "NOVICE_REAR_STABILIZER_FLANK_CINCH",
            ["TANNED_BUFFALO_FLANK_CINCH_STRAP", "TANNED_BUFFALO_FLANK_CINCH_STRAP", "TANNED_BUFFALO_FLANK_CINCH_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseFlankCinchBenchEngine.constructBench("leather_04", "ELDER_FLANK_CINCH_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseFlankCinchBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseFlankCinchBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseFlankCinchBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse flank cinch bench type"
        );

        const invalidBench: ActiveFlankCinchBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseFlankCinchBenchEngine.craftFlankCinch(invalidBench, "NOVICE_REAR_STABILIZER_FLANK_CINCH", ["TANNED_BUFFALO_FLANK_CINCH_STRAP", "TANNED_BUFFALO_FLANK_CINCH_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseFlankCinchBenchEngine.craftFlankCinch(null as any, "NOVICE_REAR_STABILIZER_FLANK_CINCH", []).success).toBe(false);
        expect(AncientRunicLeatherHorseFlankCinchBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
