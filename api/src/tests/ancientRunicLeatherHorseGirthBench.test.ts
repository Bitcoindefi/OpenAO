import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseGirthBenchEngine } from "../lib/ancientRunicLeatherHorseGirthBench";
import type { ActiveGirthBench } from "../lib/ancientRunicLeatherHorseGirthBench";

describe("AncientRunicLeatherHorseGirthBenchEngine Girth Tension Benches & Cinch Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Girth in Ventral Sanctum achieving 100% tension and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_GIRTH_PELT",
            "CELESTIAL_VOID_ASTRAL_GIRTH_PELT",
            "CELESTIAL_VOID_ASTRAL_GIRTH_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH",
            initialLeathers,
            0.1, // Success roll
            1.0, // Tension roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.girth?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH");
        expect(craftRes.girth?.girthTensionPercent).toBe(100);
        expect(craftRes.girth?.finalSaddleLoosenessMitigationPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.girth?.finalVentralRespirationComfortBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.girth?.consumedLeatherCount).toBe(2);
        expect(craftRes.girth?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_GIRTH_PELT");
        expect(craftRes.girth?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range tension roll and sub-100% quality scaling on Alder girth bench", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_mid", "ALDER_GIRTH_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeTensionRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalLoosenessMitigation = Math.round(24 * 0.944) = 23
        // finalRespirationComfortBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "NOVICE_VENTRAL_PADDING_GIRTH",
            ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.girth?.girthTensionPercent).toBe(36);
        expect(craftRes.girth?.finalSaddleLoosenessMitigationPercent).toBe(23);
        expect(craftRes.girth?.finalVentralRespirationComfortBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_wear", "ALDER_GIRTH_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "NOVICE_VENTRAL_PADDING_GIRTH",
            ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            res1.updatedBench!,
            "NOVICE_VENTRAL_PADDING_GIRTH",
            ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_02", "ALDER_GIRTH_BENCH");

        const failRes = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "WARMASTER_MITHRIL_ROLLER_GIRTH",
            ["TEMPERED_MITHRIL_ROLLER_BUCKLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient ventral straps/roller buckles");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles ventral strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_03", "ALDER_GIRTH_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseGirthBenchEngine.craftGirth(
            bench,
            "NOVICE_VENTRAL_PADDING_GIRTH",
            ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseGirthBenchEngine.constructBench("leather_04", "ALDER_GIRTH_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseGirthBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseGirthBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseGirthBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse girth bench type"
        );

        const invalidBench: ActiveGirthBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseGirthBenchEngine.craftGirth(invalidBench, "NOVICE_VENTRAL_PADDING_GIRTH", ["TANNED_BUFFALO_VENTRAL_STRAP", "TANNED_BUFFALO_VENTRAL_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseGirthBenchEngine.craftGirth(null as any, "NOVICE_VENTRAL_PADDING_GIRTH", []).success).toBe(false);
        expect(AncientRunicLeatherHorseGirthBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
