import crypto from "node:crypto";

/**
 * Ancient Runic Cooking Feast, Campfire Hearth & Stat Buff Engine for OpenAO MMORPG.
 * Simulates cooking stations (Campfire Hearth, Iron Baking Oven, Celestial Void Spigot),
 * raw culinary ingredients (Boar Shank, Astral Truffle, Kraken Tentacle),
 * feast recipes (Braised Boar Ribs, Truffle Infused Stew, Kraken Chowder Feast),
 * culinary quality ratings (0% to 100%), well-fed combat stat buff duration scaling, material consumption, and hearth maintenance.
 */

export type CookingStationType = "CAMPFIRE_HEARTH" | "IRON_BAKING_OVEN" | "CELESTIAL_VOID_SPIGOT";
export type CulinaryIngredientType = "BOAR_SHANK" | "ASTRAL_TRUFFLE" | "KRAKEN_TENTACLE";
export type FeastRecipeType = "BRAISED_BOAR_RIBS" | "TRUFFLE_INFUSED_STEW" | "KRAKEN_CHOWDER_FEAST";

export interface CookingStationData {
    stationType: CookingStationType;
    maxDurability: number;
    heatRatingCelsius: number;
    baseSuccessRatePercent: number; // 0 to 100
    flavorBonusPercent: number;
}

export interface FeastRecipeData {
    recipeType: FeastRecipeType;
    requiredIngredientType: CulinaryIngredientType;
    requiredIngredientCount: number;
    buffStatName: "ATTACK_POWER" | "HEALTH_REGEN" | "MAGIC_DAMAGE";
    baseBuffValue: number;
    baseDurationSeconds: number;
}

export interface ActiveCookingStation {
    stationId: string;
    chefPlayerId: string;
    stationType: CookingStationType;
    currentDurability: number;
    maxDurability: number;
    isLit: boolean;
}

export interface PreparedCulinaryFeast {
    feastId: string;
    recipeType: FeastRecipeType;
    buffStatName: string;
    finalBuffValue: number;
    finalDurationSeconds: number;
    culinaryQualityPercent: number; // 0 to 100
    consumedIngredientCount: number;
    consumedIngredientType: CulinaryIngredientType;
    preparedEpochMs: number;
}

export const STATION_CATALOG: Record<CookingStationType, CookingStationData> = {
    CAMPFIRE_HEARTH: { stationType: "CAMPFIRE_HEARTH", maxDurability: 60, heatRatingCelsius: 150, baseSuccessRatePercent: 85, flavorBonusPercent: 10 },
    IRON_BAKING_OVEN: { stationType: "IRON_BAKING_OVEN", maxDurability: 150, heatRatingCelsius: 250, baseSuccessRatePercent: 92, flavorBonusPercent: 20 },
    CELESTIAL_VOID_SPIGOT: { stationType: "CELESTIAL_VOID_SPIGOT", maxDurability: 280, heatRatingCelsius: 400, baseSuccessRatePercent: 99, flavorBonusPercent: 35 },
};

export const RECIPE_CATALOG: Record<FeastRecipeType, FeastRecipeData> = {
    BRAISED_BOAR_RIBS: { recipeType: "BRAISED_BOAR_RIBS", requiredIngredientType: "BOAR_SHANK", requiredIngredientCount: 2, buffStatName: "ATTACK_POWER", baseBuffValue: 30, baseDurationSeconds: 1800 },
    TRUFFLE_INFUSED_STEW: { recipeType: "TRUFFLE_INFUSED_STEW", requiredIngredientType: "ASTRAL_TRUFFLE", requiredIngredientCount: 2, buffStatName: "HEALTH_REGEN", baseBuffValue: 50, baseDurationSeconds: 2400 },
    KRAKEN_CHOWDER_FEAST: { recipeType: "KRAKEN_CHOWDER_FEAST", requiredIngredientType: "KRAKEN_TENTACLE", requiredIngredientCount: 2, buffStatName: "MAGIC_DAMAGE", baseBuffValue: 80, baseDurationSeconds: 3600 },
};

export class AncientRunicCookingFeastEngine {
    public static readonly DURABILITY_COST_PER_COOK = 10;

    /**
     * Constructs and lights a cooking station or hearth.
     */
    public static igniteCookingStation(
        chefPlayerId: string,
        stationType: CookingStationType,
        currentEpochMs = Date.now()
    ): ActiveCookingStation {
        const data = STATION_CATALOG[stationType];
        if (!data) {
            throw new Error(`Unsupported cooking station type: ${String(stationType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            stationId: `station_${stationType.toLowerCase()}_${uuid}`,
            chefPlayerId,
            stationType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isLit: true,
        };
    }

    /**
     * Cooks a feast meal from raw culinary ingredients.
     */
    public static cookFeast(
        station: ActiveCookingStation,
        recipeType: FeastRecipeType,
        providedIngredients: CulinaryIngredientType[],
        cookRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; preparedFeast?: PreparedCulinaryFeast; remainingDurability: number; reason?: string } {
        if (!station || !station.isLit || station.currentDurability < this.DURABILITY_COST_PER_COOK) {
            return {
                success: false,
                remainingDurability: station?.currentDurability ?? 0,
                reason: `Cooking station is extinguished or lacks durability (requires ${this.DURABILITY_COST_PER_COOK}).`,
            };
        }

        const recipe = RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: station.currentDurability, reason: `Unknown feast recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedIngredients)) {
            return { success: false, remainingDurability: station.currentDurability, reason: "Invalid ingredients array." };
        }

        // Count matching ingredients
        const matchingCount = providedIngredients.filter(i => i === recipe.requiredIngredientType).length;
        if (matchingCount < recipe.requiredIngredientCount) {
            return {
                success: false,
                remainingDurability: station.currentDurability,
                reason: `Insufficient ingredients: requires ${recipe.requiredIngredientCount}x ${recipe.requiredIngredientType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        station.currentDurability -= this.DURABILITY_COST_PER_COOK;
        if (station.currentDurability <= 0) {
            station.currentDurability = Math.max(0, station.currentDurability);
            station.isLit = false;
        }

        const stationData = STATION_CATALOG[station.stationType];
        const safeRoll = Number.isFinite(cookRoll) ? Math.max(0, Math.min(1, cookRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > stationData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: station.currentDurability,
                reason: `Cooking burnt to ashes: rolled ${rollPercent.toFixed(1)}, needed <= ${stationData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate culinary flavor score (0% to 100%)
        const qualityScore = Math.max(0, Math.min(100, Math.round(50 + (safeRoll * 30) + stationData.flavorBonusPercent)));
        const qualityMultiplier = 0.8 + ((qualityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalBuff = Math.round(recipe.baseBuffValue * qualityMultiplier);
        const finalDur = Math.round(recipe.baseDurationSeconds * qualityMultiplier);

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const feast: PreparedCulinaryFeast = {
            feastId: `feast_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            buffStatName: recipe.buffStatName,
            finalBuffValue: finalBuff,
            finalDurationSeconds: finalDur,
            culinaryQualityPercent: qualityScore,
            consumedIngredientCount: recipe.requiredIngredientCount,
            consumedIngredientType: recipe.requiredIngredientType,
            preparedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            preparedFeast: feast,
            remainingDurability: station.currentDurability,
        };
    }

    /**
     * Stokes firewood and repairs cooking station durability.
     */
    public static maintainStation(
        station: ActiveCookingStation,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isLit: boolean } {
        if (!station) return { success: false, newDurability: 0, isLit: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        station.currentDurability = Math.min(station.maxDurability, station.currentDurability + amt);
        station.isLit = station.currentDurability > 0;

        return {
            success: true,
            newDurability: station.currentDurability,
            isLit: station.isLit,
        };
    }
}