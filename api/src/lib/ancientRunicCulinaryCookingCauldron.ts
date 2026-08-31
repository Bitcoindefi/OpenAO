import crypto from "node:crypto";

/**
 * Ancient Runic Culinary Cauldron, Feast Hearth & Arcane Stewing Engine for OpenAO MMORPG.
 * Simulates cast iron cauldrons and banquet hearths (Cast Iron Hearth Cauldron, Runic Stone Stewing Station, Celestial Void Banquet Sanctum),
 * harvested game meats and cuts (Wild Boar Shank, Firecrest Phoenix Tenderloin, Celestial Void Kraken Fillet),
 * cooked broth and banquet recipes (Ranger Sustenance Broth, Phoenixfire Braised Steak, Celestial Void Kraken Banquet),
 * independent satiety ratings (0% to 100%), buff duration and stamina regen rate scaling,
 * upfront meat material deduction on all craft attempts, cached static catalog maxima, authoritative catalog power ratio, and cooking cauldron maintenance.
 */

export type CookingCauldronType = "CAST_IRON_HEARTH_CAULDRON" | "RUNIC_STONE_STEWING_STATION" | "CELESTIAL_VOID_BANQUET_SANCTUM";
export type RawGameMeatType = "WILD_BOAR_SHANK" | "FIRECREST_PHOENIX_TENDERLOIN" | "CELESTIAL_VOID_KRAKEN_FILLET";
export type CulinaryFeastRecipeType = "RANGER_SUSTENANCE_BROTH" | "PHOENIXFIRE_BRAISED_STEAK" | "CELESTIAL_VOID_KRAKEN_BANQUET";

export interface CookingCauldronData {
    cauldronType: CookingCauldronType;
    maxDurability: number;
    cookingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    satietyBonusPercent: number;
}

export interface CulinaryFeastRecipeData {
    recipeType: CulinaryFeastRecipeType;
    requiredMeatType: RawGameMeatType;
    requiredMeatCount: number;
    baseSatietyDurationSec: number;
    baseStaminaRegenPerSec: number;
}

export interface ActiveCookingCauldron {
    cauldronId: string;
    chefPlayerId: string;
    cauldronType: CookingCauldronType;
    currentDurability: number;
    maxDurability: number;
    cookingPower: number;
    isFunctional: boolean;
}

export interface CraftedCulinaryFeast {
    feastId: string;
    recipeType: CulinaryFeastRecipeType;
    finalSatietyDurationSec: number;
    finalStaminaRegenPerSec: number;
    satietyRatingPercent: number; // 0 to 100
    consumedMeatCount: number;
    consumedMeatType: RawGameMeatType;
    remainingProvidedMeats: RawGameMeatType[];
    craftedEpochMs: number;
}

export const CAULDRON_CATALOG: Record<CookingCauldronType, CookingCauldronData> = {
    CAST_IRON_HEARTH_CAULDRON: { cauldronType: "CAST_IRON_HEARTH_CAULDRON", maxDurability: 75, cookingPower: 25, baseSuccessRatePercent: 85, satietyBonusPercent: 10 },
    RUNIC_STONE_STEWING_STATION: { cauldronType: "RUNIC_STONE_STEWING_STATION", maxDurability: 170, cookingPower: 65, baseSuccessRatePercent: 92, satietyBonusPercent: 20 },
    CELESTIAL_VOID_BANQUET_SANCTUM: { cauldronType: "CELESTIAL_VOID_BANQUET_SANCTUM", maxDurability: 310, cookingPower: 120, baseSuccessRatePercent: 99, satietyBonusPercent: 35 },
};

export const FEAST_RECIPE_CATALOG: Record<CulinaryFeastRecipeType, CulinaryFeastRecipeData> = {
    RANGER_SUSTENANCE_BROTH: { recipeType: "RANGER_SUSTENANCE_BROTH", requiredMeatType: "WILD_BOAR_SHANK", requiredMeatCount: 2, baseSatietyDurationSec: 120, baseStaminaRegenPerSec: 8 },
    PHOENIXFIRE_BRAISED_STEAK: { recipeType: "PHOENIXFIRE_BRAISED_STEAK", requiredMeatType: "FIRECREST_PHOENIX_TENDERLOIN", requiredMeatCount: 2, baseSatietyDurationSec: 300, baseStaminaRegenPerSec: 25 },
    CELESTIAL_VOID_KRAKEN_BANQUET: { recipeType: "CELESTIAL_VOID_KRAKEN_BANQUET", requiredMeatType: "CELESTIAL_VOID_KRAKEN_FILLET", requiredMeatCount: 2, baseSatietyDurationSec: 720, baseStaminaRegenPerSec: 70 },
};

export class AncientRunicCulinaryCookingCauldronEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CAULDRON_CATALOG).map(c => c.cookingPower), 1),
        maxBonus: Math.max(...Object.values(CAULDRON_CATALOG).map(c => c.satietyBonusPercent), 1),
    };

    /**
     * Generates a crypto-secure UUID or 128-bit hex string using node:crypto.
     */
    private static generateSecureId(): string {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return crypto.randomBytes(16).toString("hex");
    }

    /**
     * Constructs and initializes a cooking cauldron or banquet hearth.
     */
    public static constructCauldron(
        chefPlayerId: string,
        cauldronType: CookingCauldronType
    ): ActiveCookingCauldron {
        const data = CAULDRON_CATALOG[cauldronType];
        if (!data) {
            throw new Error(`Unsupported cooking cauldron type: ${String(cauldronType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            cauldronId: `cauldron_${cauldronType.toLowerCase()}_${uuid}`,
            chefPlayerId,
            cauldronType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            cookingPower: data.cookingPower,
            isFunctional: true,
        };
    }

    /**
     * Simmers game meats and spices into sustenance broths, braised steaks, and kraken banquets.
     * Note: Mutates the passed `cauldron` in place and returns it as `updatedCauldron` for caller ergonomics.
     */
    public static cookFeast(
        cauldron: ActiveCookingCauldron,
        recipeType: CulinaryFeastRecipeType,
        providedMeats: RawGameMeatType[],
        craftRoll = Math.random(),
        satietyRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; feast?: CraftedCulinaryFeast; updatedCauldron?: ActiveCookingCauldron; remainingDurability: number; remainingProvidedMeats?: RawGameMeatType[]; reason?: string } {
        if (!cauldron || !cauldron.isFunctional || cauldron.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedCauldron: cauldron,
                remainingDurability: cauldron?.currentDurability ?? 0,
                reason: `Cooking cauldron is sooted or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const cauldronData = CAULDRON_CATALOG[cauldron.cauldronType];
        if (!cauldronData) {
            return { success: false, updatedCauldron: cauldron, remainingDurability: cauldron.currentDurability, reason: `Unknown cauldron model: ${String(cauldron.cauldronType)}` };
        }

        const recipe = FEAST_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedCauldron: cauldron, remainingDurability: cauldron.currentDurability, reason: `Unknown feast recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedMeats)) {
            return { success: false, updatedCauldron: cauldron, remainingDurability: cauldron.currentDurability, reason: "Invalid meats array." };
        }

        // Count matching meats
        const matchingCount = providedMeats.filter(m => m === recipe.requiredMeatType).length;
        if (matchingCount < recipe.requiredMeatCount) {
            return {
                success: false,
                updatedCauldron: cauldron,
                remainingDurability: cauldron.currentDurability,
                reason: `Insufficient meat: requires ${recipe.requiredMeatCount}x ${recipe.requiredMeatType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        cauldron.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (cauldron.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            cauldron.currentDurability = Math.max(0, cauldron.currentDurability);
            cauldron.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedMeats];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredMeatCount; i--) {
            if (remaining[i] === recipe.requiredMeatType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > cauldronData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedCauldron: cauldron,
                remainingDurability: cauldron.currentDurability,
                remainingProvidedMeats: remaining,
                reason: `Broth scorched: flame flare boiled away seasoning reduction, rolled ${rollPercent.toFixed(1)}, needed <= ${cauldronData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent satiety score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeSatietyRoll = Number.isFinite(satietyRoll) ? Math.max(0, Math.min(1, satietyRoll)) : Math.random();
        const powerRatio = Math.min(1.0, cauldronData.cookingPower / maxPower);
        const bonusPoints = (cauldronData.satietyBonusPercent / maxBonus) * 20;
        const satietyScore = Math.max(0, Math.min(100, Math.round(
            (safeSatietyRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((satietyScore / 100) * 0.4); // 0.8 to 1.2x

        const finalDuration = Math.round(recipe.baseSatietyDurationSec * qualityMultiplier);
        const finalRegen = Math.round(recipe.baseStaminaRegenPerSec * qualityMultiplier);

        const uuid = this.generateSecureId();

        const feast: CraftedCulinaryFeast = {
            feastId: `feast_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSatietyDurationSec: finalDuration,
            finalStaminaRegenPerSec: finalRegen,
            satietyRatingPercent: satietyScore,
            consumedMeatCount: recipe.requiredMeatCount,
            consumedMeatType: recipe.requiredMeatType,
            remainingProvidedMeats: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            feast,
            updatedCauldron: cauldron,
            remainingDurability: cauldron.currentDurability,
            remainingProvidedMeats: remaining,
        };
    }

    /**
     * Descales carbon soot and maintains cooking cauldron.
     */
    public static maintainCauldron(
        cauldron: ActiveCookingCauldron,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!cauldron) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        cauldron.currentDurability = Math.min(cauldron.maxDurability, cauldron.currentDurability + amt);
        cauldron.isFunctional = cauldron.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: cauldron.currentDurability,
            isFunctional: cauldron.isFunctional,
        };
    }
}