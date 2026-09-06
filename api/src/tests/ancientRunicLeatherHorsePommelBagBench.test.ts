import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorsePommelBagBenchEngine } from "../lib/ancientRunicLeatherHorsePommelBagBench";
import type { ActivePommelBagBench } from "../lib/ancientRunicLeatherHorsePommelBagBench";

describe("AncientRunicLeatherHorsePommelBagBenchEngine Saddle Horn Pommel Bag Stitching Benches & Rigs", () => {
    it("crafts Celestial Void Valkyrie Sovereign Pommel Bag in Pommel Sanctum achieving 100% stability and returns spliced pelts", () => {
        const bench = AncientRunicLeatherHorsePommelBagBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_POMMEL_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_POMMEL_SANCTUM");
        expect(bench.currentDurability).toBe(350);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_POMMEL_PELT",
            "CELESTIAL_VOID_ASTRAL_POMMEL_PELT",
            "CELESTIAL_VOID_ASTRAL_POMMEL_PELT"
        ] as any[];

        const craftRes = AncientRunicLeatherHorsePommelBagBenchEngine.craftPommelBag(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POMMEL_BAG",
            initialLeathers,
            0.1, // Success roll
            1.0, // Attachment roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.pommelBag?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POMMEL_BAG");
        expect(craftRes.pommelBag?.pommelAttachmentStabilityPercent).toBe(100);
        expect(craftRes.pommelBag?.finalQuickAccessEfficiencyPercent).toBe(100); // 84 * 1.20 = 100.8 -> clamped to 100%
        expect(craftRes.pommelBag?.finalSaddleHornBalanceBonusPercent).toBe(77); // 64 * 1.20 = 76.8 -> 77%
        expect(craftRes.pommelBag?.consumedLeatherCount).toBe(2);
        expect(craftRes.pommelBag?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_POMMEL_PELT");
        expect(craftRes.pommelBag?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(340); // 350 - 10
    });

    it("verifies mid-range attachment roll and sub-100% quality scaling on Elder pommel bag bench", () => {
        const bench = AncientRunicLeatherHorsePommelBagBenchEngine.constructBench("leather_mid", "ELDER_POMMEL_BAG_BENCH");
        // powerRatio = 30/130 = 0.23077, bonusPoints = (14/40)*20 = 7.0
        // safeAttachmentRoll = 0.5 -> 0.5 * 40 = 20
        // score = Math.round(20 + 9.23077 + 7.0) = 36
        // qualityMultiplier = 0.8 + (36/100)*0.4 = 0.944
        // finalAccess = Math.round(24 * 0.944) = 23
        // finalBalance = Math.round(14 * 0.944) = 13
        const craftRes = AncientRunicLeatherHorsePommelBagBenchEngine.craftPommelBag(
            bench,
            "NOVICE_EXPEDITION_POMMEL_BAG",
            ["TANNED_BUFFALO_POMMEL_POUCH_STRAP", "TANNED_BUFFALO_POMMEL_POUCH_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.pommelBag?.pommelAttachmentStabilityPercent).toBe(36);
        expect(craftRes.pommelBag?.finalQuickAccessEfficiencyPercent).toBe(23);
        expect(craftRes.pommelBag?.finalSaddleHornBalanceBonusPercent).toBe(13);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorsePommelBagBenchEngine.constructBench("leather_wear", "ELDER_POMMEL_BAG_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorsePommelBagBenchEngine.craftPommelBag(
            bench,
            "NOVICE_EXPEDITION_POMMEL_BAG",
            ["TANNED_BUFFALO_POMMEL_POUCH_STRAP", "TANNED_BUFFALO_POMMEL_POUCH_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorsePommelBagBenchEngine.craftPommelBag(
            res1.updatedBench!,
            "NOVICE_EXPEDITION_POMMEL_BAG",
            ["TANNED_BUFFALO_POMMEL_POUCH_STRAP", "TANNED_BUFFALO_POMMEL_POUCH_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorsePommelBagBenchEngine.constructBench("leather_02", "ELDER_POMMEL_BAG_BENCH");

        const failRes = AncientRunicLeatherHorsePommelBagBenchEngine.craftPommelBag(
            bench,
            "WARMASTER_MITHRIL_LATCHED_POMMEL_BAG",
            ["TEMPERED_MITHRIL_POMMEL_LATCH_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient pommel pouch straps/latch sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(95);
    });

    it("handles pommel pouch strap misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorsePommelBagBenchEngine.constructBench("leather_03", "ELDER_POMMEL_BAG_BENCH"); // 87% success

        const fail = AncientRunicLeatherHorsePommelBagBenchEngine.craftPommelBag(
            bench,
            "NOVICE_EXPEDITION_POMMEL_BAG",
            ["TANNED_BUFFALO_POMMEL_POUCH_STRAP", "TANNED_BUFFALO_POMMEL_POUCH_STRAP", "TANNED_BUFFALO_POMMEL_POUCH_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(85); // 95 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorsePommelBagBenchEngine.constructBench("leather_04", "ELDER_POMMEL_BAG_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorsePommelBagBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorsePommelBagBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorsePommelBagBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse pommel bag bench type"
        );

        const invalidBench: ActivePommelBagBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorsePommelBagBenchEngine.craftPommelBag(invalidBench, "NOVICE_EXPEDITION_POMMEL_BAG", ["TANNED_BUFFALO_POMMEL_POUCH_STRAP", "TANNED_BUFFALO_POMMEL_POUCH_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorsePommelBagBenchEngine.craftPommelBag(null as any, "NOVICE_EXPEDITION_POMMEL_BAG", []).success).toBe(false);
        expect(AncientRunicLeatherHorsePommelBagBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});
