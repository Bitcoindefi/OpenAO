import { describe, it, expect } from "vitest";
import { AlchemyBrewingCauldronEngine } from "../lib/alchemyBrewingCauldron.js";

describe("AlchemyBrewingCauldronEngine Recipe Cooking & Purity Rating", () => {
    it("brews a PERFECT_ELIXIR under optimal stirring and temperature", () => {
        const session = AlchemyBrewingCauldronEngine.startSession("greater_mana_potion")!;
        expect(session).toBeDefined();

        AlchemyBrewingCauldronEngine.addIngredient(session, "moonflower_petal");
        AlchemyBrewingCauldronEngine.addIngredient(session, "silver_leaf");
        AlchemyBrewingCauldronEngine.addIngredient(session, "crystal_water");

        AlchemyBrewingCauldronEngine.adjustHeat(session, "OPTIMAL", 5);
        AlchemyBrewingCauldronEngine.stir(session, "CLOCKWISE", 3);

        const result = AlchemyBrewingCauldronEngine.finishBrew(session, 50);
        expect(result.success).toBe(true);
        expect(result.qualityTier).toBe("PERFECT_ELIXIR");
        expect(result.purityPercent).toBe(100);
        expect(result.resultItemTemplateId).toBe("potion_greater_mana");
    });

    it("ruins the brew into sludge if ingredients are missing or wrong", () => {
        const session = AlchemyBrewingCauldronEngine.startSession("greater_mana_potion")!;
        AlchemyBrewingCauldronEngine.addIngredient(session, "moonflower_petal");

        const result = AlchemyBrewingCauldronEngine.finishBrew(session, 50);
        expect(result.success).toBe(false);
        expect(result.qualityTier).toBe("RUINED_SLUDGE");
        expect(result.reason).toContain("Incorrect or missing ingredients");
    });

    it("rejects brewing when player lacks required alchemy skill", () => {
        const session = AlchemyBrewingCauldronEngine.startSession("elixir_of_strength")!; // Requires 60
        AlchemyBrewingCauldronEngine.addIngredient(session, "ogre_blood");
        AlchemyBrewingCauldronEngine.addIngredient(session, "mountain_sage");
        AlchemyBrewingCauldronEngine.addIngredient(session, "dragon_scale_dust");

        const result = AlchemyBrewingCauldronEngine.finishBrew(session, 30); // Skill only 30
        expect(result.success).toBe(false);
        expect(result.purityPercent).toBe(10);
        expect(result.reason).toContain("Insufficient Alchemy skill");
    });

    it("handles null session for unknown recipes and finishBrew invalid session", () => {
        const nullSession = AlchemyBrewingCauldronEngine.startSession("non_existent_recipe");
        expect(nullSession).toBeNull();

        const fakeSession = {
            recipeId: "unknown_id",
            addedIngredients: [],
            currentHeat: "UNDERHEATED" as const,
            completedStirCycles: 0,
            heatExposureTicks: { optimal: 0, underheated: 0, overheated: 0 },
        };
        const invalidRes = AlchemyBrewingCauldronEngine.finishBrew(fakeSession, 50);
        expect(invalidRes.success).toBe(false);
        expect(invalidRes.reason).toBe("Invalid recipe.");
    });

    it("brews elixir_of_strength with counter-clockwise stirring and optimal heat", () => {
        const session = AlchemyBrewingCauldronEngine.startSession("elixir_of_strength")!;
        AlchemyBrewingCauldronEngine.addIngredient(session, "ogre_blood");
        AlchemyBrewingCauldronEngine.addIngredient(session, "mountain_sage");
        AlchemyBrewingCauldronEngine.addIngredient(session, "dragon_scale_dust");

        AlchemyBrewingCauldronEngine.adjustHeat(session, "OPTIMAL", 3);
        AlchemyBrewingCauldronEngine.stir(session, "COUNTER_CLOCKWISE", 5);

        const result = AlchemyBrewingCauldronEngine.finishBrew(session, 80);
        expect(result.success).toBe(true);
        expect(result.qualityTier).toBe("PERFECT_ELIXIR");
        expect(result.resultItemTemplateId).toBe("potion_elixir_strength");
    });

    it("penalizes unheated cold brew even if stirring is correct", () => {
        const session = AlchemyBrewingCauldronEngine.startSession("greater_mana_potion")!;
        AlchemyBrewingCauldronEngine.addIngredient(session, "moonflower_petal");
        AlchemyBrewingCauldronEngine.addIngredient(session, "silver_leaf");
        AlchemyBrewingCauldronEngine.addIngredient(session, "crystal_water");

        // Stirred correctly but ZERO heat ever applied
        AlchemyBrewingCauldronEngine.stir(session, "CLOCKWISE", 3);

        const result = AlchemyBrewingCauldronEngine.finishBrew(session, 50);
        // Base 100 + 3 skill - 50 unheated penalty = 53% -> DILUTED_BREW (not perfect elixir!)
        expect(result.qualityTier).toBe("DILUTED_BREW");
        expect(result.purityPercent).toBe(53);
    });
});