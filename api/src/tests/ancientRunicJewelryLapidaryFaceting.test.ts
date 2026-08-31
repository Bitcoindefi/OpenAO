import { describe, it, expect } from "vitest";
import {
    AncientRunicJewelryLapidaryFacetingEngine,
    ActiveFacetingSpindle,
} from "../lib/ancientRunicJewelryLapidaryFaceting.js";

describe("AncientRunicJewelryLapidaryFacetingEngine Faceting Spindles & Gemstone Cuts", () => {
    it("facets Celestial Void Astral Diamond Tiara in Prism Sanctum achieving 100% light refraction and returns spliced diamonds", () => {
        const spindle = AncientRunicJewelryLapidaryFacetingEngine.constructSpindle("jeweler_01", "CELESTIAL_VOID_LIGHT_PRISM_SANCTUM");
        expect(spindle.spindleType).toBe("CELESTIAL_VOID_LIGHT_PRISM_SANCTUM");
        expect(spindle.currentDurability).toBe(310);

        const initialGems = [
            "CELESTIAL_VOID_ASTRAL_DIAMOND",
            "CELESTIAL_VOID_ASTRAL_DIAMOND",
            "CELESTIAL_VOID_ASTRAL_DIAMOND"
        ] as any[];

        const craftRes = AncientRunicJewelryLapidaryFacetingEngine.facetJewelry(
            spindle,
            "CELESTIAL_VOID_ASTRAL_DIAMOND_TIARA",
            initialGems,
            0.1, // Success roll
            1.0, // Refraction roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.jewelry?.recipeType).toBe("CELESTIAL_VOID_ASTRAL_DIAMOND_TIARA");
        expect(craftRes.jewelry?.lightRefractionPercent).toBe(100);
        expect(craftRes.jewelry?.finalSpellCritChancePercent).toBe(84); // 70 * 1.20 = 84%
        expect(craftRes.jewelry?.finalManaRegenPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.jewelry?.consumedGemCount).toBe(2);
        expect(craftRes.jewelry?.consumedGemType).toBe("CELESTIAL_VOID_ASTRAL_DIAMOND");
        expect(craftRes.jewelry?.remainingProvidedGems.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles spindle becoming non-functional after successful craft when durability falls below threshold", () => {
        const spindle = AncientRunicJewelryLapidaryFacetingEngine.constructSpindle("jeweler_wear", "BRONZE_LAPIDARY_SPINDLE");
        spindle.currentDurability = 15;
        expect(spindle.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicJewelryLapidaryFacetingEngine.facetJewelry(
            spindle,
            "BRILLIANT_STAR_SAPPHIRE_BROOCH",
            ["ROUGH_STAR_SAPPHIRE", "ROUGH_STAR_SAPPHIRE"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(spindle.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicJewelryLapidaryFacetingEngine.facetJewelry(
            spindle,
            "BRILLIANT_STAR_SAPPHIRE_BROOCH",
            ["ROUGH_STAR_SAPPHIRE", "ROUGH_STAR_SAPPHIRE"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("unbalanced or lacks durability");
    });

    it("rejects crafting when insufficient gemstone is provided", () => {
        const spindle = AncientRunicJewelryLapidaryFacetingEngine.constructSpindle("jeweler_02", "BRONZE_LAPIDARY_SPINDLE");

        const failRes = AncientRunicJewelryLapidaryFacetingEngine.facetJewelry(
            spindle,
            "FLAWLESS_DRAGON_RUBY_SIGNET",
            ["FLAWLESS_DRAGON_RUBY"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient gemstone");
        expect(spindle.currentDurability).toBe(75);
    });

    it("handles fractured gemstone failure roll consuming durability and gems", () => {
        const spindle = AncientRunicJewelryLapidaryFacetingEngine.constructSpindle("jeweler_03", "BRONZE_LAPIDARY_SPINDLE"); // 85% success

        const fail = AncientRunicJewelryLapidaryFacetingEngine.facetJewelry(
            spindle,
            "BRILLIANT_STAR_SAPPHIRE_BROOCH",
            ["ROUGH_STAR_SAPPHIRE", "ROUGH_STAR_SAPPHIRE", "ROUGH_STAR_SAPPHIRE"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("fractured");
        expect(fail.remainingProvidedGems?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(spindle.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainSpindle based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const spindle = AncientRunicJewelryLapidaryFacetingEngine.constructSpindle("jeweler_04", "BRONZE_LAPIDARY_SPINDLE");
        spindle.currentDurability = 0;
        spindle.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicJewelryLapidaryFacetingEngine.maintainSpindle(spindle, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicJewelryLapidaryFacetingEngine.maintainSpindle(spindle, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported spindle models", () => {
        expect(() => AncientRunicJewelryLapidaryFacetingEngine.constructSpindle("j", "PLASTIC_SPINDLE" as any)).toThrow(
            "Unsupported faceting spindle type"
        );

        const invalidSpindle: ActiveFacetingSpindle = {
            spindleId: "bad",
            jewelerPlayerId: "p",
            spindleType: "SPINDLE" as any,
            currentDurability: 50,
            maxDurability: 50,
            facetingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicJewelryLapidaryFacetingEngine.facetJewelry(invalidSpindle, "BRILLIANT_STAR_SAPPHIRE_BROOCH", ["ROUGH_STAR_SAPPHIRE", "ROUGH_STAR_SAPPHIRE"]).success).toBe(false);
        expect(AncientRunicJewelryLapidaryFacetingEngine.facetJewelry(null as any, "BRILLIANT_STAR_SAPPHIRE_BROOCH", []).success).toBe(false);
        expect(AncientRunicJewelryLapidaryFacetingEngine.maintainSpindle(null as any).success).toBe(false);
    });
});