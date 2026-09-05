import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseCrownpieceBenchEngine } from "../lib/ancientRunicLeatherHorseCrownpieceBench";
import type { ActiveCrownpieceBench } from "../lib/ancientRunicLeatherHorseCrownpieceBench";

describe("AncientRunicLeatherHorseCrownpieceBenchEngine Headstall Crownpiece Stitching Benches & Poll Relief Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Crownpiece in Crownpiece Sanctum achieving 100% relief and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseCrownpieceBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_CROWNPIECE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_CROWNPIECE_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_CROWNPIECE_PELT",
            "CELESTIAL_VOID_ASTRAL_CROWNPIECE_PELT",
            "CELESTIAL_VOID_ASTRAL_CROWNPIECE_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseCrownpieceBenchEngine.craftCrownpiece(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CROWNPIECE",
            initialLeathers,
            0.1, // Success roll
            1.0, // Relief roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.crownpiece?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CROWNPIECE");
        expect(craftRes.crownpiece?.pollPressureReliefPercent).toBe(100);
        expect(craftRes.crownpiece?.finalPollComfortPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.crownpiece?.finalBitResponsivenessBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.crownpiece?.consumedLeatherCount).toBe(2);
        expect(craftRes.crownpiece?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_CROWNPIECE_PELT");
        expect(craftRes.crownpiece?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range relief roll and sub-100% quality scaling on Elder crownpiece bench", () => {
        const bench = AncientRunicLeatherHorseCrownpieceBenchEngine.constructBench("leather_mid", "ELDER_CROWNPIECE_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeReliefRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalComfort = Math.round(24 * 0.944) = 23
        // finalBitBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseCrownpieceBenchEngine.craftCrownpiece(
            bench,
            "NOVICE_ANATOMICAL_POLL_CROWNPIECE",
            ["TANNED_BUFFALO_CROWNPIECE_STRAP", "TANNED_BUFFALO_CROWNPIECE_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.crownpiece?.pollPressureReliefPercent).toBe(36);
        expect(craftRes.crownpiece?.finalPollComfortPercent).toBe(23);
        expect(craftRes.crownpiece?.finalBitResponsivenessBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseCrownpieceBenchEngine.constructBench("leather_wear", "ELDER_CROWNPIECE_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseCrownpieceBenchEngine.craftCrownpiece(
            bench,
            "NOVICE_ANATOMICAL_POLL_CROWNPIECE",
            ["TANNED_BUFFALO_CROWNPIECE_STRAP", "TANNED_BUFFALO_CROWNPIECE_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseCrownpieceBenchEngine.craftCrownpiece(
            res1.updatedBench!,
            "NOVICE_ANATOMICAL_POLL_CROWNPIECE",
            ["TANNED_BUFFALO_CROWNPIECE_STRAP", "TANNED_BUFFALO_CROWNPIECE_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseCrownpieceBenchEngine.constructBench("leather_02", "ELDER_CROWNPIECE_BENCH");

        const failRes = AncientRunicLeatherHorseCrownpieceBenchEngine.craftCrownpiece(
            bench,
            "WARMASTER_MITHRIL_PADDED_CROWNPIECE",
            ["TEMPERED_MITHRIL_POLL_PADDING_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient crownpiece straps/poll padding");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles crownpiece strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseCrownpieceBenchEngine.constructBench("leather_03", "ELDER_CROWNPIECE_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseCrownpieceBenchEngine.craftCrownpiece(
            bench,
            "NOVICE_ANATOMICAL_POLL_CROWNPIECE",
            ["TANNED_BUFFALO_CROWNPIECE_STRAP", "TANNED_BUFFALO_CROWNPIECE_STRAP", "TANNED_BUFFALO_CROWNPIECE_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseCrownpieceBenchEngine.constructBench("leather_04", "ELDER_CROWNPIECE_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseCrownpieceBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseCrownpieceBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseCrownpieceBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse crownpiece bench type"
        );

        const invalidBench: ActiveCrownpieceBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseCrownpieceBenchEngine.craftCrownpiece(invalidBench, "NOVICE_ANATOMICAL_POLL_CROWNPIECE", ["TANNED_BUFFALO_CROWNPIECE_STRAP", "TANNED_BUFFALO_CROWNPIECE_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseCrownpieceBenchEngine.craftCrownpiece(null as any, "NOVICE_ANATOMICAL_POLL_CROWNPIECE", []).success).toBe(false);
        expect(AncientRunicLeatherHorseCrownpieceBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
