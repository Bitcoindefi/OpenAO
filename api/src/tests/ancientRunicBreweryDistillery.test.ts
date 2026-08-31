import { describe, it, expect } from "vitest";
import {
    AncientRunicBreweryDistilleryEngine,
    ActiveBrewingStill,
} from "../lib/ancientRunicBreweryDistillery.js";

describe("AncientRunicBreweryDistilleryEngine Fermentation & Spirits", () => {
    it("distills Celestial Starfire Spirits in Void Aging Vat achieving 100% vintage and returns spliced ingredients", () => {
        const still = AncientRunicBreweryDistilleryEngine.constructStill("brewer_01", "CELESTIAL_VOID_AGING_VAT", 100000);
        expect(still.stillType).toBe("CELESTIAL_VOID_AGING_VAT");
        expect(still.currentDurability).toBe(310);

        const initialIngredients = [
            "VOID_STAR_BLOSSOM_YEAST",
            "VOID_STAR_BLOSSOM_YEAST",
            "VOID_STAR_BLOSSOM_YEAST"
        ] as any[];

        const brewRes = AncientRunicBreweryDistilleryEngine.distillBrew(
            still,
            "CELESTIAL_STARFIRE_SPIRITS",
            initialIngredients,
            0.1, // Success roll
            1.0, // Vintage roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(brewRes.success).toBe(true);
        expect(brewRes.brew?.recipeType).toBe("CELESTIAL_STARFIRE_SPIRITS");
        expect(brewRes.brew?.beverageVintagePercent).toBe(100);
        expect(brewRes.brew?.finalHealthRegenPerSec).toBe(156); // 130 * 1.20 = 156 HP/s
        expect(brewRes.brew?.finalBuffDurationSeconds).toBe(4320); // 3600 * 1.20 = 4320s
        expect(brewRes.brew?.consumedIngredientCount).toBe(2);
        expect(brewRes.brew?.consumedIngredientType).toBe("VOID_STAR_BLOSSOM_YEAST");
        expect(brewRes.brew?.remainingProvidedIngredients.length).toBe(1);
        expect(brewRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles still becoming non-functional after successful brew when durability falls below threshold", () => {
        const still = AncientRunicBreweryDistilleryEngine.constructStill("brewer_wear", "OAK_FERMENTATION_BARREL", 100000);
        still.currentDurability = 15;
        expect(still.isFunctional).toBe(true);

        // First brew succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const brew1 = AncientRunicBreweryDistilleryEngine.distillBrew(
            still,
            "FROSTED_HOPS_ALE",
            ["WILD_HONEY_HOPS", "WILD_HONEY_HOPS"],
            0.1
        );
        expect(brew1.success).toBe(true);
        expect(brew1.remainingDurability).toBe(5);
        expect(still.isFunctional).toBe(false);

        // Subsequent brew is rejected
        const brew2 = AncientRunicBreweryDistilleryEngine.distillBrew(
            still,
            "FROSTED_HOPS_ALE",
            ["WILD_HONEY_HOPS", "WILD_HONEY_HOPS"]
        );
        expect(brew2.success).toBe(false);
        expect(brew2.reason).toContain("leaky or lacks durability");
    });

    it("rejects brewing when insufficient ingredients are provided", () => {
        const still = AncientRunicBreweryDistilleryEngine.constructStill("brewer_02", "OAK_FERMENTATION_BARREL", 100000);

        const failRes = AncientRunicBreweryDistilleryEngine.distillBrew(
            still,
            "ASTRAL_GOLDEN_MEAD",
            ["ASTRAL_SUN_MALT"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient ingredients");
        expect(still.currentDurability).toBe(75);
    });

    it("handles fermentation souring failure roll consuming durability", () => {
        const still = AncientRunicBreweryDistilleryEngine.constructStill("brewer_03", "OAK_FERMENTATION_BARREL", 100000); // 85% success

        const sour = AncientRunicBreweryDistilleryEngine.distillBrew(
            still,
            "FROSTED_HOPS_ALE",
            ["WILD_HONEY_HOPS", "WILD_HONEY_HOPS"],
            0.95
        );

        expect(sour.success).toBe(false);
        expect(sour.reason).toContain("Fermentation spoiled");
        expect(still.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainStill based on DURABILITY_COST_PER_BREW threshold", () => {
        const still = AncientRunicBreweryDistilleryEngine.constructStill("brewer_04", "OAK_FERMENTATION_BARREL", 100000);
        still.currentDurability = 0;
        still.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicBreweryDistilleryEngine.maintainStill(still, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicBreweryDistilleryEngine.maintainStill(still, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported still models", () => {
        expect(() => AncientRunicBreweryDistilleryEngine.constructStill("b", "PLASTIC_JUG" as any)).toThrow(
            "Unsupported brewing still type"
        );

        const invalidStill: ActiveBrewingStill = {
            stillId: "bad",
            brewerPlayerId: "p",
            stillType: "JUG" as any,
            currentDurability: 50,
            maxDurability: 50,
            brewingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicBreweryDistilleryEngine.distillBrew(invalidStill, "FROSTED_HOPS_ALE", ["WILD_HONEY_HOPS", "WILD_HONEY_HOPS"]).success).toBe(false);
        expect(AncientRunicBreweryDistilleryEngine.distillBrew(null as any, "FROSTED_HOPS_ALE", []).success).toBe(false);
        expect(AncientRunicBreweryDistilleryEngine.maintainStill(null as any).success).toBe(false);
    });
});