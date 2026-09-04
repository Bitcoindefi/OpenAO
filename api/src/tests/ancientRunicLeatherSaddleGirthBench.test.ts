import { describe, it, expect } from "vitest";
import { AncientRunicLeatherSaddleGirthBenchEngine } from "../lib/ancientRunicLeatherSaddleGirthBench";
import type { ActiveSaddleGirthBench } from "../lib/ancientRunicLeatherSaddleGirthBench";

describe("AncientRunicLeatherSaddleGirthBenchEngine Ventral Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Girth in Ventral Sanctum achieving 100% stability and returns spliced pelts", () => {
        const bench = AncientRunicLeatherSaddleGirthBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_GIRTH_PELT",
            "CELESTIAL_VOID_ASTRAL_GIRTH_PELT",
            "CELESTIAL_VOID_ASTRAL_GIRTH_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherSaddleGirthBenchEngine.craftGirth(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.girth?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH");
        expect(craftRes.girth?.ventralStabilityPercent).toBe(100);
        expect(craftRes.girth?.finalVentralStabilityBonusPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.girth?.finalSaddleSlippageMitigationPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.girth?.consumedLeatherCount).toBe(2);
        expect(craftRes.girth?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_GIRTH_PELT");
        expect(craftRes.girth?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Ash saddle girth bench", () => {
        const bench = AncientRunicLeatherSaddleGirthBenchEngine.constructBench("leather_mid", "ASH_SADDLE_GIRTH_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeStabilityRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalStabilityBonus = Math.round(24 * 0.944) = 23
        // finalSlippageMitigate = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherSaddleGirthBenchEngine.craftGirth(
            bench,
            "NOVICE_VENTRAL_SADDLE_GIRTH",
            ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.girth?.ventralStabilityPercent).toBe(36);
        expect(craftRes.girth?.finalVentralStabilityBonusPercent).toBe(23);
        expect(craftRes.girth?.finalSaddleSlippageMitigationPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherSaddleGirthBenchEngine.constructBench("leather_wear", "ASH_SADDLE_GIRTH_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherSaddleGirthBenchEngine.craftGirth(
            bench,
            "NOVICE_VENTRAL_SADDLE_GIRTH",
            ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherSaddleGirthBenchEngine.craftGirth(
            res1.updatedBench!,
            "NOVICE_VENTRAL_SADDLE_GIRTH",
            ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherSaddleGirthBenchEngine.constructBench("leather_02", "ASH_SADDLE_GIRTH_BENCH");

        const failRes = AncientRunicLeatherSaddleGirthBenchEngine.craftGirth(
            bench,
            "WARMASTER_MITHRIL_ROLLER_GIRTH",
            ["TEMPERED_MITHRIL_ROLLER_BUCKLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient saddle girth straps/roller buckle sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles roller buckle tongue sheared failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherSaddleGirthBenchEngine.constructBench("leather_03", "ASH_SADDLE_GIRTH_BENCH"); // 87% success

        const fail = AncientRunicLeatherSaddleGirthBenchEngine.craftGirth(
            bench,
            "NOVICE_VENTRAL_SADDLE_GIRTH",
            ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("tongue sheared");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherSaddleGirthBenchEngine.constructBench("leather_04", "ASH_SADDLE_GIRTH_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherSaddleGirthBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherSaddleGirthBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherSaddleGirthBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported saddle girth bench type"
        );

        const invalidBench: ActiveSaddleGirthBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherSaddleGirthBenchEngine.craftGirth(invalidBench, "NOVICE_VENTRAL_SADDLE_GIRTH", ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherSaddleGirthBenchEngine.craftGirth(null as any, "NOVICE_VENTRAL_SADDLE_GIRTH", []).success).toBe(false);
        expect(AncientRunicLeatherSaddleGirthBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
