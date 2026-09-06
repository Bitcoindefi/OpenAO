import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseStirrupPadsBenchEngine } from "../lib/ancientRunicLeatherHorseStirrupPadsBench";
import type { ActiveStirrupPadsBench } from "../lib/ancientRunicLeatherHorseStirrupPadsBench";

describe("AncientRunicLeatherHorseStirrupPadsBenchEngine Equestrian Stirrup Pads Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Stirrup Pads in Stirrup Pads Sanctum achieving 100% anchor stability and returns remaining pelts", () => {
        const bench = AncientRunicLeatherHorseStirrupPadsBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_STIRRUP_PADS_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_STIRRUP_PADS_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_STIRRUP_PAD_PELT",
            "CELESTIAL_VOID_ASTRAL_STIRRUP_PAD_PELT",
            "CELESTIAL_VOID_ASTRAL_STIRRUP_PAD_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseStirrupPadsBenchEngine.craftStirrupPads(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_PADS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.stirrupPads?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_PADS");
        expect(craftRes.stirrupPads?.stirrupPadsAnchorStabilityPercent).toBe(100);
        expect(craftRes.stirrupPads?.finalPlantarShockAbsorptionPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.stirrupPads?.finalBootGripAdhesionPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.stirrupPads?.consumedLeatherCount).toBe(2);
        expect(craftRes.stirrupPads?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_STIRRUP_PAD_PELT");
        expect(craftRes.stirrupPads?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder stirrup pads bench", () => {
        const bench = AncientRunicLeatherHorseStirrupPadsBenchEngine.constructBench("leather_mid", "ELDER_STIRRUP_PADS_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeStabilityRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalShockAbsorption = Math.round(24 * 0.944) = 23
        // finalBootGrip = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseStirrupPadsBenchEngine.craftStirrupPads(
            bench,
            "NOVICE_EXPEDITION_STIRRUP_PADS",
            ["TANNED_BUFFALO_STIRRUP_PAD_TREAD", "TANNED_BUFFALO_STIRRUP_PAD_TREAD"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.stirrupPads?.stirrupPadsAnchorStabilityPercent).toBe(36);
        expect(craftRes.stirrupPads?.finalPlantarShockAbsorptionPercent).toBe(23);
        expect(craftRes.stirrupPads?.finalBootGripAdhesionPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseStirrupPadsBenchEngine.constructBench("leather_wear", "ELDER_STIRRUP_PADS_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseStirrupPadsBenchEngine.craftStirrupPads(
            bench,
            "NOVICE_EXPEDITION_STIRRUP_PADS",
            ["TANNED_BUFFALO_STIRRUP_PAD_TREAD", "TANNED_BUFFALO_STIRRUP_PAD_TREAD"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseStirrupPadsBenchEngine.craftStirrupPads(
            res1.updatedBench!,
            "NOVICE_EXPEDITION_STIRRUP_PADS",
            ["TANNED_BUFFALO_STIRRUP_PAD_TREAD", "TANNED_BUFFALO_STIRRUP_PAD_TREAD"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseStirrupPadsBenchEngine.constructBench("leather_02", "ELDER_STIRRUP_PADS_BENCH");

        const failRes = AncientRunicLeatherHorseStirrupPadsBenchEngine.craftStirrupPads(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_STIRRUP_PADS",
            ["TEMPERED_MITHRIL_STIRRUP_CLEAT_INSERT"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient stirrup pad treads/cleat inserts");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles stirrup pad tread misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseStirrupPadsBenchEngine.constructBench("leather_03", "ELDER_STIRRUP_PADS_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseStirrupPadsBenchEngine.craftStirrupPads(
            bench,
            "NOVICE_EXPEDITION_STIRRUP_PADS",
            ["TANNED_BUFFALO_STIRRUP_PAD_TREAD", "TANNED_BUFFALO_STIRRUP_PAD_TREAD", "TANNED_BUFFALO_STIRRUP_PAD_TREAD"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseStirrupPadsBenchEngine.constructBench("leather_04", "ELDER_STIRRUP_PADS_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseStirrupPadsBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseStirrupPadsBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseStirrupPadsBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse stirrup pads bench type"
        );

        const invalidBench: ActiveStirrupPadsBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseStirrupPadsBenchEngine.craftStirrupPads(invalidBench, "NOVICE_EXPEDITION_STIRRUP_PADS", ["TANNED_BUFFALO_STIRRUP_PAD_TREAD", "TANNED_BUFFALO_STIRRUP_PAD_TREAD"]).success).toBe(false);
        expect(AncientRunicLeatherHorseStirrupPadsBenchEngine.craftStirrupPads(null as any, "NOVICE_EXPEDITION_STIRRUP_PADS", []).success).toBe(false);
        expect(AncientRunicLeatherHorseStirrupPadsBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
