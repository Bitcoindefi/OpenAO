import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseGirthExtenderBenchEngine } from "../lib/ancientRunicLeatherHorseGirthExtenderBench";
import type { ActiveGirthExtenderBench } from "../lib/ancientRunicLeatherHorseGirthExtenderBench";

describe("AncientRunicLeatherHorseGirthExtenderBenchEngine Equestrian Girth Extender Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Girth Extender in Girth Extender Sanctum achieving 100% anchor stability and returns remaining pelts", () => {
        const bench = AncientRunicLeatherHorseGirthExtenderBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_GIRTH_EXTENDER_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_GIRTH_EXTENDER_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_GIRTH_EXTENDER_PELT",
            "CELESTIAL_VOID_ASTRAL_GIRTH_EXTENDER_PELT",
            "CELESTIAL_VOID_ASTRAL_GIRTH_EXTENDER_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseGirthExtenderBenchEngine.craftGirthExtender(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH_EXTENDER",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.girthExtender?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH_EXTENDER");
        expect(craftRes.girthExtender?.girthExtenderAnchorStabilityPercent).toBe(100);
        expect(craftRes.girthExtender?.finalRibcageBreathingFlexibilityPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.girthExtender?.finalBilletExtensionSecurityPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.girthExtender?.consumedLeatherCount).toBe(2);
        expect(craftRes.girthExtender?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_GIRTH_EXTENDER_PELT");
        expect(craftRes.girthExtender?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder girth extender bench", () => {
        const bench = AncientRunicLeatherHorseGirthExtenderBenchEngine.constructBench("leather_mid", "ELDER_GIRTH_EXTENDER_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeStabilityRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalBreathing = Math.round(24 * 0.944) = 23
        // finalSecurity = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorseGirthExtenderBenchEngine.craftGirthExtender(
            bench,
            "NOVICE_EXPEDITION_GIRTH_EXTENDER",
            ["TANNED_BULL_GIRTH_EXTENDER_STRAP", "TANNED_BULL_GIRTH_EXTENDER_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.girthExtender?.girthExtenderAnchorStabilityPercent).toBe(36);
        expect(craftRes.girthExtender?.finalRibcageBreathingFlexibilityPercent).toBe(23);
        expect(craftRes.girthExtender?.finalBilletExtensionSecurityPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseGirthExtenderBenchEngine.constructBench("leather_wear", "ELDER_GIRTH_EXTENDER_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseGirthExtenderBenchEngine.craftGirthExtender(
            bench,
            "NOVICE_EXPEDITION_GIRTH_EXTENDER",
            ["TANNED_BULL_GIRTH_EXTENDER_STRAP", "TANNED_BULL_GIRTH_EXTENDER_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseGirthExtenderBenchEngine.craftGirthExtender(
            res1.updatedBench!,
            "NOVICE_EXPEDITION_GIRTH_EXTENDER",
            ["TANNED_BULL_GIRTH_EXTENDER_STRAP", "TANNED_BULL_GIRTH_EXTENDER_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseGirthExtenderBenchEngine.constructBench("leather_02", "ELDER_GIRTH_EXTENDER_BENCH");

        const failRes = AncientRunicLeatherHorseGirthExtenderBenchEngine.craftGirthExtender(
            bench,
            "WARMASTER_MITHRIL_REINFORCED_GIRTH_EXTENDER",
            ["TEMPERED_MITHRIL_DOUBLE_TONGUE_BUCKLE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient girth extender straps/double tongue buckles");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles girth extender strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseGirthExtenderBenchEngine.constructBench("leather_03", "ELDER_GIRTH_EXTENDER_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorseGirthExtenderBenchEngine.craftGirthExtender(
            bench,
            "NOVICE_EXPEDITION_GIRTH_EXTENDER",
            ["TANNED_BULL_GIRTH_EXTENDER_STRAP", "TANNED_BULL_GIRTH_EXTENDER_STRAP", "TANNED_BULL_GIRTH_EXTENDER_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseGirthExtenderBenchEngine.constructBench("leather_04", "ELDER_GIRTH_EXTENDER_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseGirthExtenderBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseGirthExtenderBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseGirthExtenderBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse girth extender bench type"
        );

        const invalidBench: ActiveGirthExtenderBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseGirthExtenderBenchEngine.craftGirthExtender(invalidBench, "NOVICE_EXPEDITION_GIRTH_EXTENDER", ["TANNED_BULL_GIRTH_EXTENDER_STRAP", "TANNED_BULL_GIRTH_EXTENDER_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseGirthExtenderBenchEngine.craftGirthExtender(null as any, "NOVICE_EXPEDITION_GIRTH_EXTENDER", []).success).toBe(false);
        expect(AncientRunicLeatherHorseGirthExtenderBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
