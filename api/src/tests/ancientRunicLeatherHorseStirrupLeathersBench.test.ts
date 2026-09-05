import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseStirrupLeathersBenchEngine } from "../lib/ancientRunicLeatherHorseStirrupLeathersBench";
import type { ActiveStirrupLeathersBench } from "../lib/ancientRunicLeatherHorseStirrupLeathersBench";

describe("AncientRunicLeatherHorseStirrupLeathersBenchEngine Stirrup Suspension Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Stirrup Leathers in Stride Sanctum achieving 100% suspension and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseStirrupLeathersBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_STRIDE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_STRIDE_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_STRIDE_PELT",
            "CELESTIAL_VOID_ASTRAL_STRIDE_PELT",
            "CELESTIAL_VOID_ASTRAL_STRIDE_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseStirrupLeathersBenchEngine.craftStirrupLeathers(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_LEATHERS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Suspension roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.stirrupLeathers?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_LEATHERS");
        expect(craftRes.stirrupLeathers?.stirrupSuspensionPercent).toBe(100);
        expect(craftRes.stirrupLeathers?.finalAnkleStrainMitigationPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.stirrupLeathers?.finalRiderStrideBalanceBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.stirrupLeathers?.consumedLeatherCount).toBe(2);
        expect(craftRes.stirrupLeathers?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_STRIDE_PELT");
        expect(craftRes.stirrupLeathers?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range suspension roll and sub-100% quality scaling on Rowan stirrup leathers bench", () => {
        const bench = AncientRunicLeatherHorseStirrupLeathersBenchEngine.constructBench("leather_mid", "ROWAN_STIRRUP_LEATHERS_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeSuspensionRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalStrainMitigation = Math.round(24 * 0.944) = 23
        // finalBalanceBonus = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseStirrupLeathersBenchEngine.craftStirrupLeathers(
            bench,
            "NOVICE_RIDERS_SUSPENSION_STIRRUP_LEATHERS",
            ["TANNED_BUFFALO_STIRRUP_STRAP", "TANNED_BUFFALO_STIRRUP_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.stirrupLeathers?.stirrupSuspensionPercent).toBe(36);
        expect(craftRes.stirrupLeathers?.finalAnkleStrainMitigationPercent).toBe(23);
        expect(craftRes.stirrupLeathers?.finalRiderStrideBalanceBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseStirrupLeathersBenchEngine.constructBench("leather_wear", "ROWAN_STIRRUP_LEATHERS_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseStirrupLeathersBenchEngine.craftStirrupLeathers(
            bench,
            "NOVICE_RIDERS_SUSPENSION_STIRRUP_LEATHERS",
            ["TANNED_BUFFALO_STIRRUP_STRAP", "TANNED_BUFFALO_STIRRUP_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseStirrupLeathersBenchEngine.craftStirrupLeathers(
            res1.updatedBench!,
            "NOVICE_RIDERS_SUSPENSION_STIRRUP_LEATHERS",
            ["TANNED_BUFFALO_STIRRUP_STRAP", "TANNED_BUFFALO_STIRRUP_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseStirrupLeathersBenchEngine.constructBench("leather_02", "ROWAN_STIRRUP_LEATHERS_BENCH");

        const failRes = AncientRunicLeatherHorseStirrupLeathersBenchEngine.craftStirrupLeathers(
            bench,
            "WARMASTER_MITHRIL_CALF_STIRRUP_LEATHERS",
            ["TEMPERED_MITHRIL_TONGUE_BUCKLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient stirrup straps/tongue buckles");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles stirrup strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseStirrupLeathersBenchEngine.constructBench("leather_03", "ROWAN_STIRRUP_LEATHERS_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseStirrupLeathersBenchEngine.craftStirrupLeathers(
            bench,
            "NOVICE_RIDERS_SUSPENSION_STIRRUP_LEATHERS",
            ["TANNED_BUFFALO_STIRRUP_STRAP", "TANNED_BUFFALO_STIRRUP_STRAP", "TANNED_BUFFALO_STIRRUP_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseStirrupLeathersBenchEngine.constructBench("leather_04", "ROWAN_STIRRUP_LEATHERS_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseStirrupLeathersBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseStirrupLeathersBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseStirrupLeathersBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse stirrup leathers bench type"
        );

        const invalidBench: ActiveStirrupLeathersBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseStirrupLeathersBenchEngine.craftStirrupLeathers(invalidBench, "NOVICE_RIDERS_SUSPENSION_STIRRUP_LEATHERS", ["TANNED_BUFFALO_STIRRUP_STRAP", "TANNED_BUFFALO_STIRRUP_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseStirrupLeathersBenchEngine.craftStirrupLeathers(null as any, "NOVICE_RIDERS_SUSPENSION_STIRRUP_LEATHERS", []).success).toBe(false);
        expect(AncientRunicLeatherHorseStirrupLeathersBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
