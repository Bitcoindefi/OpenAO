import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseThroatlatchBenchEngine } from "../lib/ancientRunicLeatherHorseThroatlatchBench";
import type { ActiveThroatlatchBench } from "../lib/ancientRunicLeatherHorseThroatlatchBench";

describe("AncientRunicLeatherHorseThroatlatchBenchEngine Submandibular Throatlatch Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Throatlatch in Throatlatch Sanctum achieving 100% retention and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseThroatlatchBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_THROATLATCH_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_THROATLATCH_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_THROATLATCH_PELT",
            "CELESTIAL_VOID_ASTRAL_THROATLATCH_PELT",
            "CELESTIAL_VOID_ASTRAL_THROATLATCH_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseThroatlatchBenchEngine.craftThroatlatch(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLATCH",
            initialLeathers,
            0.1, // Success roll
            1.0, // Retention roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.throatlatch?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLATCH");
        expect(craftRes.throatlatch?.headstallRetentionPercent).toBe(100);
        expect(craftRes.throatlatch?.finalBridleRetentionPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.throatlatch?.finalCombatDislodgementMitigationPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.throatlatch?.consumedLeatherCount).toBe(2);
        expect(craftRes.throatlatch?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_THROATLATCH_PELT");
        expect(craftRes.throatlatch?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range retention roll and sub-100% quality scaling on Elder throatlatch bench", () => {
        const bench = AncientRunicLeatherHorseThroatlatchBenchEngine.constructBench("leather_mid", "ELDER_THROATLATCH_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeRetentionRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalRetention = Math.round(24 * 0.944) = 23
        // finalMitigation = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseThroatlatchBenchEngine.craftThroatlatch(
            bench,
            "NOVICE_SUBMANDIBULAR_THROATLATCH",
            ["TANNED_BUFFALO_THROATLATCH_STRAP", "TANNED_BUFFALO_THROATLATCH_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.throatlatch?.headstallRetentionPercent).toBe(36);
        expect(craftRes.throatlatch?.finalBridleRetentionPercent).toBe(23);
        expect(craftRes.throatlatch?.finalCombatDislodgementMitigationPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseThroatlatchBenchEngine.constructBench("leather_wear", "ELDER_THROATLATCH_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseThroatlatchBenchEngine.craftThroatlatch(
            bench,
            "NOVICE_SUBMANDIBULAR_THROATLATCH",
            ["TANNED_BUFFALO_THROATLATCH_STRAP", "TANNED_BUFFALO_THROATLATCH_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseThroatlatchBenchEngine.craftThroatlatch(
            res1.updatedBench!,
            "NOVICE_SUBMANDIBULAR_THROATLATCH",
            ["TANNED_BUFFALO_THROATLATCH_STRAP", "TANNED_BUFFALO_THROATLATCH_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseThroatlatchBenchEngine.constructBench("leather_02", "ELDER_THROATLATCH_BENCH");

        const failRes = AncientRunicLeatherHorseThroatlatchBenchEngine.craftThroatlatch(
            bench,
            "WARMASTER_MITHRIL_BUCKLED_THROATLATCH",
            ["TEMPERED_MITHRIL_THROAT_BUCKLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient throatlatch straps/throat buckle sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles throatlatch strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseThroatlatchBenchEngine.constructBench("leather_03", "ELDER_THROATLATCH_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseThroatlatchBenchEngine.craftThroatlatch(
            bench,
            "NOVICE_SUBMANDIBULAR_THROATLATCH",
            ["TANNED_BUFFALO_THROATLATCH_STRAP", "TANNED_BUFFALO_THROATLATCH_STRAP", "TANNED_BUFFALO_THROATLATCH_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseThroatlatchBenchEngine.constructBench("leather_04", "ELDER_THROATLATCH_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseThroatlatchBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseThroatlatchBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseThroatlatchBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse throatlatch bench type"
        );

        const invalidBench: ActiveThroatlatchBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseThroatlatchBenchEngine.craftThroatlatch(invalidBench, "NOVICE_SUBMANDIBULAR_THROATLATCH", ["TANNED_BUFFALO_THROATLATCH_STRAP", "TANNED_BUFFALO_THROATLATCH_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseThroatlatchBenchEngine.craftThroatlatch(null as any, "NOVICE_SUBMANDIBULAR_THROATLATCH", []).success).toBe(false);
        expect(AncientRunicLeatherHorseThroatlatchBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
