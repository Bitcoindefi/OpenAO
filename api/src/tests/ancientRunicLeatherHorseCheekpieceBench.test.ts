import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseCheekpieceBenchEngine } from "../lib/ancientRunicLeatherHorseCheekpieceBench";
import type { ActiveCheekpieceBench } from "../lib/ancientRunicLeatherHorseCheekpieceBench";

describe("AncientRunicLeatherHorseCheekpieceBenchEngine Headstall Cheekpiece Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Cheekpiece in Cheekpiece Sanctum achieving 100% suspension and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorseCheekpieceBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_CHEEKPIECE_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_CHEEKPIECE_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_CHEEKPIECE_PELT",
            "CELESTIAL_VOID_ASTRAL_CHEEKPIECE_PELT",
            "CELESTIAL_VOID_ASTRAL_CHEEKPIECE_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseCheekpieceBenchEngine.craftCheekpiece(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHEEKPIECE",
            initialLeathers,
            0.1, // Success roll
            1.0, // Suspension roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.cheekpiece?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHEEKPIECE");
        expect(craftRes.cheekpiece?.bitSuspensionPercent).toBe(100);
        expect(craftRes.cheekpiece?.finalBitAlignmentPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.cheekpiece?.finalMouthpieceComfortBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.cheekpiece?.consumedLeatherCount).toBe(2);
        expect(craftRes.cheekpiece?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_CHEEKPIECE_PELT");
        expect(craftRes.cheekpiece?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range suspension roll and sub-100% quality scaling on Elder cheekpiece bench", () => {
        const bench = AncientRunicLeatherHorseCheekpieceBenchEngine.constructBench("leather_mid", "ELDER_CHEEKPIECE_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeSuspensionRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalAlignment = Math.round(24 * 0.944) = 23
        // finalComfort = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseCheekpieceBenchEngine.craftCheekpiece(
            bench,
            "NOVICE_VERTICAL_SUSPENSION_CHEEKPIECE",
            ["TANNED_BUFFALO_CHEEKPIECE_STRAP", "TANNED_BUFFALO_CHEEKPIECE_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.cheekpiece?.bitSuspensionPercent).toBe(36);
        expect(craftRes.cheekpiece?.finalBitAlignmentPercent).toBe(23);
        expect(craftRes.cheekpiece?.finalMouthpieceComfortBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseCheekpieceBenchEngine.constructBench("leather_wear", "ELDER_CHEEKPIECE_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseCheekpieceBenchEngine.craftCheekpiece(
            bench,
            "NOVICE_VERTICAL_SUSPENSION_CHEEKPIECE",
            ["TANNED_BUFFALO_CHEEKPIECE_STRAP", "TANNED_BUFFALO_CHEEKPIECE_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseCheekpieceBenchEngine.craftCheekpiece(
            res1.updatedBench!,
            "NOVICE_VERTICAL_SUSPENSION_CHEEKPIECE",
            ["TANNED_BUFFALO_CHEEKPIECE_STRAP", "TANNED_BUFFALO_CHEEKPIECE_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseCheekpieceBenchEngine.constructBench("leather_02", "ELDER_CHEEKPIECE_BENCH");

        const failRes = AncientRunicLeatherHorseCheekpieceBenchEngine.craftCheekpiece(
            bench,
            "WARMASTER_MITHRIL_COUPLED_CHEEKPIECE",
            ["TEMPERED_MITHRIL_BIT_COUPLING_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient cheekpiece straps/bit coupling sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles cheekpiece strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseCheekpieceBenchEngine.constructBench("leather_03", "ELDER_CHEEKPIECE_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseCheekpieceBenchEngine.craftCheekpiece(
            bench,
            "NOVICE_VERTICAL_SUSPENSION_CHEEKPIECE",
            ["TANNED_BUFFALO_CHEEKPIECE_STRAP", "TANNED_BUFFALO_CHEEKPIECE_STRAP", "TANNED_BUFFALO_CHEEKPIECE_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseCheekpieceBenchEngine.constructBench("leather_04", "ELDER_CHEEKPIECE_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseCheekpieceBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseCheekpieceBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseCheekpieceBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse cheekpiece bench type"
        );

        const invalidBench: ActiveCheekpieceBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseCheekpieceBenchEngine.craftCheekpiece(invalidBench, "NOVICE_VERTICAL_SUSPENSION_CHEEKPIECE", ["TANNED_BUFFALO_CHEEKPIECE_STRAP", "TANNED_BUFFALO_CHEEKPIECE_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseCheekpieceBenchEngine.craftCheekpiece(null as any, "NOVICE_VERTICAL_SUSPENSION_CHEEKPIECE", []).success).toBe(false);
        expect(AncientRunicLeatherHorseCheekpieceBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
