import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseBrowbandBenchEngine } from "../lib/ancientRunicLeatherHorseBrowbandBench";
import type { ActiveBrowbandBench } from "../lib/ancientRunicLeatherHorseBrowbandBench";

describe("AncientRunicLeatherHorseBrowbandBenchEngine Forehead Strap Stitching Benches & Rosette Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Browband in Temple Sanctum achieving 100% tension and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_TEMPLE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_TEMPLE_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_BROWBAND_PELT",
            "CELESTIAL_VOID_ASTRAL_BROWBAND_PELT",
            "CELESTIAL_VOID_ASTRAL_BROWBAND_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND",
            initialLeathers,
            0.1, // Success roll
            1.0, // Tension roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.browband?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND");
        expect(craftRes.browband?.browbandTensionPercent).toBe(100);
        expect(craftRes.browband?.finalBridleStabilityPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.browband?.finalWillpowerControlBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.browband?.consumedLeatherCount).toBe(2);
        expect(craftRes.browband?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_BROWBAND_PELT");
        expect(craftRes.browband?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range tension roll and sub-100% quality scaling on Elder browband bench", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_mid", "ELDER_BROWBAND_STITCHING_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeTensionRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalStability = Math.round(24 * 0.944) = 23
        // finalWillpowerBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "NOVICE_EQUINE_HEADPIECE_BROWBAND",
            ["TANNED_BUFFALO_BROWBAND_STRAP", "TANNED_BUFFALO_BROWBAND_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.browband?.browbandTensionPercent).toBe(36);
        expect(craftRes.browband?.finalBridleStabilityPercent).toBe(23);
        expect(craftRes.browband?.finalWillpowerControlBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_wear", "ELDER_BROWBAND_STITCHING_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "NOVICE_EQUINE_HEADPIECE_BROWBAND",
            ["TANNED_BUFFALO_BROWBAND_STRAP", "TANNED_BUFFALO_BROWBAND_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            res1.updatedBench!,
            "NOVICE_EQUINE_HEADPIECE_BROWBAND",
            ["TANNED_BUFFALO_BROWBAND_STRAP", "TANNED_BUFFALO_BROWBAND_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_02", "ELDER_BROWBAND_STITCHING_BENCH");

        const failRes = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "WARMASTER_MITHRIL_STUDDED_BROWBAND",
            ["TEMPERED_MITHRIL_ROSETTE_CLASP_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient browband straps/rosette clasps");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles browband strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_03", "ELDER_BROWBAND_STITCHING_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(
            bench,
            "NOVICE_EQUINE_HEADPIECE_BROWBAND",
            ["TANNED_BUFFALO_BROWBAND_STRAP", "TANNED_BUFFALO_BROWBAND_STRAP", "TANNED_BUFFALO_BROWBAND_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("leather_04", "ELDER_BROWBAND_STITCHING_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseBrowbandBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseBrowbandBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseBrowbandBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse browband bench type"
        );

        const invalidBench: ActiveBrowbandBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(invalidBench, "NOVICE_EQUINE_HEADPIECE_BROWBAND", ["TANNED_BUFFALO_BROWBAND_STRAP", "TANNED_BUFFALO_BROWBAND_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseBrowbandBenchEngine.craftBrowband(null as any, "NOVICE_EQUINE_HEADPIECE_BROWBAND", []).success).toBe(false);
        expect(AncientRunicLeatherHorseBrowbandBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
