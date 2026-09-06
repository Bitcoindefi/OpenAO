import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseCavessonBenchEngine } from "../lib/ancientRunicLeatherHorseCavessonBench";
import type { ActiveCavessonBench } from "../lib/ancientRunicLeatherHorseCavessonBench";

describe("AncientRunicLeatherHorseCavessonBenchEngine Equestrian Cavesson Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Cavesson in Cavesson Sanctum achieving 100% anchor stability and returns remaining pelts", () => {
        const bench = AncientRunicLeatherHorseCavessonBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_CAVESSON_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_CAVESSON_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_CAVESSON_PELT",
            "CELESTIAL_VOID_ASTRAL_CAVESSON_PELT",
            "CELESTIAL_VOID_ASTRAL_CAVESSON_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseCavessonBenchEngine.craftCavesson(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CAVESSON",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.cavesson?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CAVESSON");
        expect(craftRes.cavesson?.cavessonAnchorStabilityPercent).toBe(100);
        expect(craftRes.cavesson?.finalLateralFlexionControlPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.cavesson?.finalJawPressureDistributionPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.cavesson?.consumedLeatherCount).toBe(2);
        expect(craftRes.cavesson?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_CAVESSON_PELT");
        expect(craftRes.cavesson?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder cavesson bench", () => {
        const bench = AncientRunicLeatherHorseCavessonBenchEngine.constructBench("leather_mid", "ELDER_CAVESSON_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeStabilityRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalLateral = Math.round(24 * 0.944) = 23
        // finalJaw = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseCavessonBenchEngine.craftCavesson(
            bench,
            "NOVICE_EXPEDITION_CAVESSON",
            ["TANNED_COLT_CAVESSON_STRAP", "TANNED_COLT_CAVESSON_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.cavesson?.cavessonAnchorStabilityPercent).toBe(36);
        expect(craftRes.cavesson?.finalLateralFlexionControlPercent).toBe(23);
        expect(craftRes.cavesson?.finalJawPressureDistributionPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseCavessonBenchEngine.constructBench("leather_wear", "ELDER_CAVESSON_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseCavessonBenchEngine.craftCavesson(
            bench,
            "NOVICE_EXPEDITION_CAVESSON",
            ["TANNED_COLT_CAVESSON_STRAP", "TANNED_COLT_CAVESSON_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseCavessonBenchEngine.craftCavesson(
            res1.updatedBench!,
            "NOVICE_EXPEDITION_CAVESSON",
            ["TANNED_COLT_CAVESSON_STRAP", "TANNED_COLT_CAVESSON_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseCavessonBenchEngine.constructBench("leather_02", "ELDER_CAVESSON_BENCH");

        const failRes = AncientRunicLeatherHorseCavessonBenchEngine.craftCavesson(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_CAVESSON",
            ["TEMPERED_MITHRIL_CAVESSON_NOSE_RING"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient cavesson straps/nose rings");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles cavesson strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseCavessonBenchEngine.constructBench("leather_03", "ELDER_CAVESSON_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseCavessonBenchEngine.craftCavesson(
            bench,
            "NOVICE_EXPEDITION_CAVESSON",
            ["TANNED_COLT_CAVESSON_STRAP", "TANNED_COLT_CAVESSON_STRAP", "TANNED_COLT_CAVESSON_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseCavessonBenchEngine.constructBench("leather_04", "ELDER_CAVESSON_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseCavessonBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseCavessonBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseCavessonBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse cavesson bench type"
        );

        const invalidBench: ActiveCavessonBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseCavessonBenchEngine.craftCavesson(invalidBench, "NOVICE_EXPEDITION_CAVESSON", ["TANNED_COLT_CAVESSON_STRAP", "TANNED_COLT_CAVESSON_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseCavessonBenchEngine.craftCavesson(null as any, "NOVICE_EXPEDITION_CAVESSON", []).success).toBe(false);
        expect(AncientRunicLeatherHorseCavessonBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
