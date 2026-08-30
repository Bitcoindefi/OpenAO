import { describe, it, expect } from "vitest";
import {
    AncientRunicJewelryAmuletRingEngine,
    ActiveJewelerBench,
} from "../lib/ancientRunicJewelryAmuletRing.js";

describe("AncientRunicJewelryAmuletRingEngine Rings & Amulets Imbuing", () => {
    it("crafts Celestial Ring of Transcendence on Void Lapidary Altar achieving 100% brilliance and returns spliced gems", () => {
        const bench = AncientRunicJewelryAmuletRingEngine.forgeBench("jeweler_01", "CELESTIAL_VOID_LAPIDARY_ALTAR", 100000);
        expect(bench.benchType).toBe("CELESTIAL_VOID_LAPIDARY_ALTAR");
        expect(bench.currentDurability).toBe(310);

        const initialGems = [
            "VOID_STAR_DIAMOND",
            "VOID_STAR_DIAMOND",
            "VOID_STAR_DIAMOND"
        ] as any[];

        const craftRes = AncientRunicJewelryAmuletRingEngine.craftJewelry(
            bench,
            "CELESTIAL_RING_OF_TRANSCENDENCE",
            initialGems,
            0.1, // Success roll
            1.0, // Brilliance roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.jewelry?.recipeType).toBe("CELESTIAL_RING_OF_TRANSCENDENCE");
        expect(craftRes.jewelry?.gemBrilliancePercent).toBe(100);
        expect(craftRes.jewelry?.finalPrimaryStatBonus).toBe(180); // 150 * 1.20 = 180
        expect(craftRes.jewelry?.finalSecondaryStatBonus).toBe(60); // 50 * 1.20 = 60
        expect(craftRes.jewelry?.consumedGemCount).toBe(2);
        expect(craftRes.jewelry?.consumedGemType).toBe("VOID_STAR_DIAMOND");
        expect(craftRes.jewelry?.remainingProvidedGems.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("rejects crafting when insufficient gemstones are provided", () => {
        const bench = AncientRunicJewelryAmuletRingEngine.forgeBench("jeweler_02", "NOVICE_GOLDSMITH_ANVIL", 100000);

        const failRes = AncientRunicJewelryAmuletRingEngine.craftJewelry(
            bench,
            "AMULET_OF_PRISMATIC_BARRIER",
            ["ASTRAL_SAPPHIRE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient gemstones");
        expect(bench.currentDurability).toBe(75);
    });

    it("handles gemstone setting fracture failure roll consuming durability", () => {
        const bench = AncientRunicJewelryAmuletRingEngine.forgeBench("jeweler_03", "NOVICE_GOLDSMITH_ANVIL", 100000); // 85% success

        const fracture = AncientRunicJewelryAmuletRingEngine.craftJewelry(
            bench,
            "RING_OF_PYROCLASTIC_MIGHT",
            ["FLAWLESS_RUBY", "FLAWLESS_RUBY"],
            0.95
        );

        expect(fracture.success).toBe(false);
        expect(fracture.reason).toContain("Gem setting fractured");
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_SETTING threshold", () => {
        const bench = AncientRunicJewelryAmuletRingEngine.forgeBench("jeweler_04", "NOVICE_GOLDSMITH_ANVIL", 100000);
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicJewelryAmuletRingEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicJewelryAmuletRingEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicJewelryAmuletRingEngine.forgeBench("j", "WOODEN_TABLE" as any)).toThrow(
            "Unsupported jeweler bench type"
        );

        const invalidBench: ActiveJewelerBench = {
            benchId: "bad",
            jewelerPlayerId: "p",
            benchType: "TABLE" as any,
            currentDurability: 50,
            maxDurability: 50,
            jewelerPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicJewelryAmuletRingEngine.craftJewelry(invalidBench, "RING_OF_PYROCLASTIC_MIGHT", ["FLAWLESS_RUBY", "FLAWLESS_RUBY"]).success).toBe(false);
        expect(AncientRunicJewelryAmuletRingEngine.craftJewelry(null as any, "RING_OF_PYROCLASTIC_MIGHT", []).success).toBe(false);
        expect(AncientRunicJewelryAmuletRingEngine.maintainBench(null as any).success).toBe(false);
    });
});