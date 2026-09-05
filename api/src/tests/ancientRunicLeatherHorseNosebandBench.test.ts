import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseNosebandBenchEngine } from "../lib/ancientRunicLeatherHorseNosebandBench";
import type { ActiveNosebandBench } from "../lib/ancientRunicLeatherHorseNosebandBench";

describe("AncientRunicLeatherHorseNosebandBenchEngine Jaw Stabilization Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Noseband in Jaw Sanctum achieving 100% stabilization and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_JAW_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_JAW_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_NOSEBAND_PELT",
            "CELESTIAL_VOID_ASTRAL_NOSEBAND_PELT",
            "CELESTIAL_VOID_ASTRAL_NOSEBAND_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stabilization roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.noseband?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND");
        expect(craftRes.noseband?.jawStabilizationPercent).toBe(100);
        expect(craftRes.noseband?.finalBitEvasionMitigationPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.noseband?.finalJawComfortBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.noseband?.consumedLeatherCount).toBe(2);
        expect(craftRes.noseband?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_NOSEBAND_PELT");
        expect(craftRes.noseband?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stabilization roll and sub-100% quality scaling on Cedar noseband bench", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_mid", "CEDAR_NOSEBAND_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeStabilizationRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalMitigation = Math.round(24 * 0.944) = 23
        // finalComfort = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "NOVICE_TRAIL_MUZZLE_NOSEBAND",
            ["TANNED_BUFFALO_MUZZLE_STRAP", "TANNED_BUFFALO_MUZZLE_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.noseband?.jawStabilizationPercent).toBe(36);
        expect(craftRes.noseband?.finalBitEvasionMitigationPercent).toBe(23);
        expect(craftRes.noseband?.finalJawComfortBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_wear", "CEDAR_NOSEBAND_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "NOVICE_TRAIL_MUZZLE_NOSEBAND",
            ["TANNED_BUFFALO_MUZZLE_STRAP", "TANNED_BUFFALO_MUZZLE_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            res1.updatedBench!,
            "NOVICE_TRAIL_MUZZLE_NOSEBAND",
            ["TANNED_BUFFALO_MUZZLE_STRAP", "TANNED_BUFFALO_MUZZLE_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_02", "CEDAR_NOSEBAND_BENCH");

        const failRes = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "WARMASTER_MITHRIL_CAVESSON_NOSEBAND",
            ["TEMPERED_MITHRIL_CAVESSON_CHAPE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient noseband straps/cavesson chapes");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles muzzle strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_03", "CEDAR_NOSEBAND_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(
            bench,
            "NOVICE_TRAIL_MUZZLE_NOSEBAND",
            ["TANNED_BUFFALO_MUZZLE_STRAP", "TANNED_BUFFALO_MUZZLE_STRAP", "TANNED_BUFFALO_MUZZLE_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseNosebandBenchEngine.constructBench("leather_04", "CEDAR_NOSEBAND_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseNosebandBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseNosebandBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseNosebandBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse noseband bench type"
        );

        const invalidBench: ActiveNosebandBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(invalidBench, "NOVICE_TRAIL_MUZZLE_NOSEBAND", ["TANNED_BUFFALO_MUZZLE_STRAP", "TANNED_BUFFALO_MUZZLE_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseNosebandBenchEngine.craftNoseband(null as any, "NOVICE_TRAIL_MUZZLE_NOSEBAND", []).success).toBe(false);
        expect(AncientRunicLeatherHorseNosebandBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
