import crypto from "node:crypto";

/**
 * Ancient Runic Brewery Fermentation, Mash Distillation & Mead Aging Engine for OpenAO MMORPG.
 * Simulates brewing barrels and distillation stills (Oak Fermentation Barrel, Runic Copper Distillation Still, Celestial Void Aging Vat),
 * harvested mash ingredients (Wild Honey Hops, Astral Sun Malt, Void Star Blossom Yeast),
 * distilled beverages and elixirs (Frosted Hops Ale, Astral Golden Mead, Celestial Starfire Spirits),
 * independent beverage vintage ratings (0% to 100%), health regen and buff duration scaling,
 * mash inventory deduction, cached static catalog maxima, and still maintenance.
 */

export type BrewingStillType = "OAK_FERMENTATION_BARREL" | "RUNIC_COPPER_DISTILLATION_STILL" | "CELESTIAL_VOID_AGING_VAT";
export type MashIngredientType = "WILD_HONEY_HOPS" | "ASTRAL_SUN_MALT" | "VOID_STAR_BLOSSOM_YEAST";
export type DistilledBrewRecipeType = "FROSTED_HOPS_ALE" | "ASTRAL_GOLDEN_MEAD" | "CELESTIAL_STARFIRE_SPIRITS";

export interface BrewingStillData {
    stillType: BrewingStillType;
    maxDurability: number;
    brewingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    vintageBonusPercent: number;
}

export interface DistilledBrewRecipeData {
    recipeType: DistilledBrewRecipeType;
    requiredIngredientType: MashIngredientType;
    requiredIngredientCount: number;
    baseHealthRegenPerSec: number;
    baseBuffDurationSeconds: number;
}

export interface ActiveBrewingStill {
    stillId: string;
    brewerPlayerId: string;
    stillType: BrewingStillType;
    currentDurability: number;
    maxDurability: number;
    brewingPower: number;
    isFunctional: boolean;
}

export interface CraftedDistilledBrew {
    brewId: string;
    recipeType: DistilledBrewRecipeType;
    finalHealthRegenPerSec: number;
    finalBuffDurationSeconds: number;
    beverageVintagePercent: number; // 0 to 100
    consumedIngredientCount: number;
    consumedIngredientType: MashIngredientType;
    remainingProvidedIngredients: MashIngredientType[];
    brewedEpochMs: number;
}

export const STILL_CATALOG: Record<BrewingStillType, BrewingStillData> = {
    OAK_FERMENTATION_BARREL: { stillType: "OAK_FERMENTATION_BARREL", maxDurability: 75, brewingPower: 25, baseSuccessRatePercent: 85, vintageBonusPercent: 10 },
    RUNIC_COPPER_DISTILLATION_STILL: { stillType: "RUNIC_COPPER_DISTILLATION_STILL", maxDurability: 170, brewingPower: 65, baseSuccessRatePercent: 92, vintageBonusPercent: 20 },
    CELESTIAL_VOID_AGING_VAT: { stillType: "CELESTIAL_VOID_AGING_VAT", maxDurability: 310, brewingPower: 120, baseSuccessRatePercent: 99, vintageBonusPercent: 35 },
};

export const BREW_RECIPE_CATALOG: Record<DistilledBrewRecipeType, DistilledBrewRecipeData> = {
    FROSTED_HOPS_ALE: { recipeType: "FROSTED_HOPS_ALE", requiredIngredientType: "WILD_HONEY_HOPS", requiredIngredientCount: 2, baseHealthRegenPerSec: 25, baseBuffDurationSeconds: 900 },
    ASTRAL_GOLDEN_MEAD: { recipeType: "ASTRAL_GOLDEN_MEAD", requiredIngredientType: "ASTRAL_SUN_MALT", requiredIngredientCount: 2, baseHealthRegenPerSec: 60, baseBuffDurationSeconds: 1800 },
    CELESTIAL_STARFIRE_SPIRITS: { recipeType: "CELESTIAL_STARFIRE_SPIRITS", requiredIngredientType: "VOID_STAR_BLOSSOM_YEAST", requiredIngredientCount: 2, baseHealthRegenPerSec: 130, baseBuffDurationSeconds: 3600 },
};

export class AncientRunicBreweryDistilleryEngine {
    public static readonly DURABILITY_COST_PER_BREW = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(STILL_CATALOG).map(s => s.brewingPower), 1),
        maxBonus: Math.max(...Object.values(STILL_CATALOG).map(s => s.vintageBonusPercent), 1),
    };

    /**
     * Constructs and initializes a brewing still or aging vat.
     */
    public static constructStill(
        brewerPlayerId: string,
        stillType: BrewingStillType,
        currentEpochMs = Date.now()
    ): ActiveBrewingStill {
        const data = STILL_CATALOG[stillType];
        if (!data) {
            throw new Error(`Unsupported brewing still type: ${String(stillType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            stillId: `still_${stillType.toLowerCase()}_${uuid}`,
            brewerPlayerId,
            stillType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            brewingPower: data.brewingPower,
            isFunctional: true,
        };
    }

    /**
     * Ferments mash ingredients and distills ancient ales, meads, and starfire spirits.
     */
    public static distillBrew(
        still: ActiveBrewingStill,
        recipeType: DistilledBrewRecipeType,
        providedIngredients: MashIngredientType[],
        distillRoll = Math.random(),
        vintageRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; brew?: CraftedDistilledBrew; remainingDurability: number; reason?: string } {
        if (!still || !still.isFunctional || still.currentDurability < this.DURABILITY_COST_PER_BREW) {
            return {
                success: false,
                remainingDurability: still?.currentDurability ?? 0,
                reason: `Brewing still is leaky or lacks durability (requires ${this.DURABILITY_COST_PER_BREW}).`,
            };
        }

        const stillData = STILL_CATALOG[still.stillType];
        if (!stillData) {
            return { success: false, remainingDurability: still.currentDurability, reason: `Unknown still model: ${String(still.stillType)}` };
        }

        const recipe = BREW_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: still.currentDurability, reason: `Unknown brew recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedIngredients)) {
            return { success: false, remainingDurability: still.currentDurability, reason: "Invalid ingredients array." };
        }

        // Count matching ingredients
        const matchingCount = providedIngredients.filter(i => i === recipe.requiredIngredientType).length;
        if (matchingCount < recipe.requiredIngredientCount) {
            return {
                success: false,
                remainingDurability: still.currentDurability,
                reason: `Insufficient ingredients: requires ${recipe.requiredIngredientCount}x ${recipe.requiredIngredientType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        still.currentDurability -= this.DURABILITY_COST_PER_BREW;
        if (still.currentDurability < this.DURABILITY_COST_PER_BREW) {
            still.currentDurability = Math.max(0, still.currentDurability);
            still.isFunctional = false;
        }

        const safeRoll = Number.isFinite(distillRoll) ? Math.max(0, Math.min(1, distillRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > stillData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: still.currentDurability,
                reason: `Fermentation spoiled: wild bacteria soured mash vat, rolled ${rollPercent.toFixed(1)}, needed <= ${stillData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent vintage score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeVintageRoll = Number.isFinite(vintageRoll) ? Math.max(0, Math.min(1, vintageRoll)) : Math.random();
        const powerRatio = Math.min(1.0, still.brewingPower / maxPower);
        const bonusPoints = (stillData.vintageBonusPercent / maxBonus) * 20;
        const vintageScore = Math.max(0, Math.min(100, Math.round(
            (safeVintageRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((vintageScore / 100) * 0.4); // 0.8 to 1.2x

        const finalRegen = Math.round(recipe.baseHealthRegenPerSec * qualityMultiplier);
        const finalDuration = Math.round(recipe.baseBuffDurationSeconds * qualityMultiplier);

        // Splice consumed ingredients out of cloned array
        const remaining = [...providedIngredients];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredIngredientCount; i--) {
            if (remaining[i] === recipe.requiredIngredientType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const brew: CraftedDistilledBrew = {
            brewId: `brew_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalHealthRegenPerSec: finalRegen,
            finalBuffDurationSeconds: finalDuration,
            beverageVintagePercent: vintageScore,
            consumedIngredientCount: recipe.requiredIngredientCount,
            consumedIngredientType: recipe.requiredIngredientType,
            remainingProvidedIngredients: remaining,
            brewedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            brew,
            remainingDurability: still.currentDurability,
        };
    }

    /**
     * Cleans coils and maintains brewing still.
     */
    public static maintainStill(
        still: ActiveBrewingStill,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!still) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        still.currentDurability = Math.min(still.maxDurability, still.currentDurability + amt);
        still.isFunctional = still.currentDurability >= this.DURABILITY_COST_PER_BREW;

        return {
            success: true,
            newDurability: still.currentDurability,
            isFunctional: still.isFunctional,
        };
    }
}