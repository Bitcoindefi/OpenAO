/**
 * Alchemy Brewing Cauldron & Potion Purity Simulation Engine for OpenAO MMORPG.
 * Simulates interactive reagent additions, heat control (Underheated, Optimal, Overheated),
 * stirring stabilization cycles, skill-scaled purity, and output potion quality tiering.
 */

export type HeatLevel = "UNDERHEATED" | "OPTIMAL" | "OVERHEATED";
export type StirDirection = "CLOCKWISE" | "COUNTER_CLOCKWISE";
export type PotionQualityTier = "PERFECT_ELIXIR" | "STANDARD_POTION" | "DILUTED_BREW" | "RUINED_SLUDGE";

export interface BrewingRecipe {
    recipeId: string;
    resultItemTemplateId: string;
    requiredIngredients: string[];
    targetHeat: HeatLevel;
    requiredStirCycles: number;
    requiredStirDirection: StirDirection;
    minAlchemySkill: number;
}

export interface CauldronSessionState {
    recipeId: string;
    addedIngredients: string[];
    currentHeat: HeatLevel;
    completedStirCycles: number;
    lastStirDirection?: StirDirection;
    heatExposureTicks: {
        optimal: number;
        underheated: number;
        overheated: number;
    };
}

export interface BrewCompletionResult {
    success: boolean;
    resultItemTemplateId?: string;
    qualityTier: PotionQualityTier;
    purityPercent: number; // 0 to 100
    reason?: string;
}

export const ALCHEMY_RECIPES: Record<string, BrewingRecipe> = {
    greater_mana_potion: {
        recipeId: "greater_mana_potion",
        resultItemTemplateId: "potion_greater_mana",
        requiredIngredients: ["moonflower_petal", "silver_leaf", "crystal_water"],
        targetHeat: "OPTIMAL",
        requiredStirCycles: 3,
        requiredStirDirection: "CLOCKWISE",
        minAlchemySkill: 35,
    },
    elixir_of_strength: {
        recipeId: "elixir_of_strength",
        resultItemTemplateId: "potion_elixir_strength",
        requiredIngredients: ["ogre_blood", "mountain_sage", "dragon_scale_dust"],
        targetHeat: "OPTIMAL",
        requiredStirCycles: 5,
        requiredStirDirection: "COUNTER_CLOCKWISE",
        minAlchemySkill: 60,
    },
};

export class AlchemyBrewingCauldronEngine {
    /**
     * Creates a new brewing cauldron session for a recipe.
     */
    public static startSession(recipeId: string): CauldronSessionState | null {
        if (!ALCHEMY_RECIPES[recipeId]) return null;
        return {
            recipeId,
            addedIngredients: [],
            currentHeat: "UNDERHEATED",
            completedStirCycles: 0,
            heatExposureTicks: { optimal: 0, underheated: 0, overheated: 0 },
        };
    }

    /**
     * Adds an ingredient into the cauldron.
     */
    public static addIngredient(session: CauldronSessionState, ingredientId: string): void {
        session.addedIngredients.push(ingredientId);
    }

    /**
     * Adjusts heat level and records tick exposure.
     */
    public static adjustHeat(session: CauldronSessionState, newHeat: HeatLevel, durationTicks = 1): void {
        session.currentHeat = newHeat;
        if (newHeat === "OPTIMAL") session.heatExposureTicks.optimal += durationTicks;
        else if (newHeat === "UNDERHEATED") session.heatExposureTicks.underheated += durationTicks;
        else session.heatExposureTicks.overheated += durationTicks;
    }

    /**
     * Performs a stirring action.
     */
    public static stir(session: CauldronSessionState, direction: StirDirection, cycles = 1): void {
        session.lastStirDirection = direction;
        session.completedStirCycles += cycles;
    }

    /**
     * Finalizes brewing and calculates output purity.
     */
    public static finishBrew(
        session: CauldronSessionState,
        playerAlchemySkill: number
    ): BrewCompletionResult {
        const recipe = ALCHEMY_RECIPES[session.recipeId];
        if (!recipe) {
            return {
                success: false,
                qualityTier: "RUINED_SLUDGE",
                purityPercent: 0,
                reason: "Invalid recipe.",
            };
        }

        const skill = Math.min(100, Math.max(1, playerAlchemySkill));
        if (skill < recipe.minAlchemySkill) {
            return {
                success: false,
                qualityTier: "RUINED_SLUDGE",
                purityPercent: 10,
                reason: `Insufficient Alchemy skill. Requires level ${recipe.minAlchemySkill}.`,
            };
        }

        // Check ingredients exact match (ignoring order)
        const sortedAdded = [...session.addedIngredients].sort();
        const sortedRequired = [...recipe.requiredIngredients].sort();
        const hasAllIngredients =
            sortedAdded.length === sortedRequired.length &&
            sortedAdded.every((item, idx) => item === sortedRequired[idx]);

        if (!hasAllIngredients) {
            return {
                success: false,
                qualityTier: "RUINED_SLUDGE",
                purityPercent: 0,
                reason: "Incorrect or missing ingredients in the cauldron.",
            };
        }

        // Calculate Purity score: Base starts with skill modifier
        // Skill gives up to +10 bonus purity for master alchemists (skill 100) vs novice
        const skillBonus = Math.floor((skill - recipe.minAlchemySkill) / 5);
        let purity = 100 + skillBonus;

        // Stirring accuracy penalty
        if (session.lastStirDirection !== recipe.requiredStirDirection) {
            purity -= 25;
        }
        const stirDiff = Math.abs(session.completedStirCycles - recipe.requiredStirCycles);
        purity -= stirDiff * 10;

        // Heat penalty: If optimal heat was NEVER applied, heavily penalize cold brew (-50)
        if (session.heatExposureTicks.optimal === 0) {
            purity -= 50;
        }

        const badHeatTicks = session.heatExposureTicks.overheated * 15 + session.heatExposureTicks.underheated * 5;
        purity -= badHeatTicks;

        purity = Math.min(100, Math.max(0, purity));

        let qualityTier: PotionQualityTier = "RUINED_SLUDGE";
        if (purity >= 90) qualityTier = "PERFECT_ELIXIR";
        else if (purity >= 70) qualityTier = "STANDARD_POTION";
        else if (purity >= 40) qualityTier = "DILUTED_BREW";

        return {
            success: purity >= 40,
            resultItemTemplateId: purity >= 40 ? recipe.resultItemTemplateId : undefined,
            qualityTier,
            purityPercent: purity,
        };
    }
}