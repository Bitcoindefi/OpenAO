import crypto from "node:crypto";

/**
 * Ancient Runic Lapidary Gem-Cutting, Faceting & Jewelry Engraving Engine for OpenAO MMORPG.
 * Simulates lapidary wheels and faceting benches (Hardened Copper Lapidary Wheel, Runic Diamond Cutting Bench, Celestial Void Lapidary Faceter),
 * rough uncut gemstones (Rough Sky Sapphire, Rough Sunstone Ruby, Celestial Void Diamond),
 * faceted engraved jewelry recipes (Brilliant Sky Sapphire Pendant, Radiant Sunstone Signet, Celestial Void Heart Cameo),
 * independent gem brilliance & facet ratings (0% to 100%), spell power and critical strike chance scaling,
 * gemstone inventory deduction, cached static catalog maxima, and lapidary wheel maintenance.
 */

export type LapidaryWheelType = "HARDENED_COPPER_LAPIDARY_WHEEL" | "RUNIC_DIAMOND_CUTTING_BENCH" | "CELESTIAL_VOID_LAPIDARY_FACETER";
export type RoughGemstoneType = "ROUGH_SKY_SAPPHIRE" | "ROUGH_SUNSTONE_RUBY" | "CELESTIAL_VOID_DIAMOND";
export type FacetedJewelryRecipeType = "BRILLIANT_SKY_SAPPHIRE_PENDANT" | "RADIANT_SUNSTONE_SIGNET" | "CELESTIAL_VOID_HEART_CAMEO";

export interface LapidaryWheelData {
    wheelType: LapidaryWheelType;
    maxDurability: number;
    lapidaryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    facetBonusPercent: number;
}

export interface FacetedJewelryRecipeData {
    recipeType: FacetedJewelryRecipeType;
    requiredGemType: RoughGemstoneType;
    requiredGemCount: number;
    baseSpellPower: number;
    baseCritChancePercent: number;
}

export interface ActiveLapidaryWheel {
    wheelId: string;
    lapidaryPlayerId: string;
    wheelType: LapidaryWheelType;
    currentDurability: number;
    maxDurability: number;
    lapidaryPower: number;
    isFunctional: boolean;
}

export interface CraftedFacetedJewelry {
    jewelryId: string;
    recipeType: FacetedJewelryRecipeType;
    finalSpellPower: number;
    finalCritChancePercent: number;
    gemBrilliancePercent: number; // 0 to 100
    consumedGemCount: number;
    consumedGemType: RoughGemstoneType;
    remainingProvidedGems: RoughGemstoneType[];
    craftedEpochMs: number;
}

export const WHEEL_CATALOG: Record<LapidaryWheelType, LapidaryWheelData> = {
    HARDENED_COPPER_LAPIDARY_WHEEL: { wheelType: "HARDENED_COPPER_LAPIDARY_WHEEL", maxDurability: 75, lapidaryPower: 25, baseSuccessRatePercent: 85, facetBonusPercent: 10 },
    RUNIC_DIAMOND_CUTTING_BENCH: { wheelType: "RUNIC_DIAMOND_CUTTING_BENCH", maxDurability: 170, lapidaryPower: 65, baseSuccessRatePercent: 92, facetBonusPercent: 20 },
    CELESTIAL_VOID_LAPIDARY_FACETER: { wheelType: "CELESTIAL_VOID_LAPIDARY_FACETER", maxDurability: 310, lapidaryPower: 120, baseSuccessRatePercent: 99, facetBonusPercent: 35 },
};

export const JEWELRY_RECIPE_CATALOG: Record<FacetedJewelryRecipeType, FacetedJewelryRecipeData> = {
    BRILLIANT_SKY_SAPPHIRE_PENDANT: { recipeType: "BRILLIANT_SKY_SAPPHIRE_PENDANT", requiredGemType: "ROUGH_SKY_SAPPHIRE", requiredGemCount: 2, baseSpellPower: 45, baseCritChancePercent: 5 },
    RADIANT_SUNSTONE_SIGNET: { recipeType: "RADIANT_SUNSTONE_SIGNET", requiredGemType: "ROUGH_SUNSTONE_RUBY", requiredGemCount: 2, baseSpellPower: 110, baseCritChancePercent: 12 },
    CELESTIAL_VOID_HEART_CAMEO: { recipeType: "CELESTIAL_VOID_HEART_CAMEO", requiredGemType: "CELESTIAL_VOID_DIAMOND", requiredGemCount: 2, baseSpellPower: 260, baseCritChancePercent: 28 },
};

export class AncientRunicJewelryEngravingGemCuttingEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(WHEEL_CATALOG).map(w => w.lapidaryPower), 1),
        maxBonus: Math.max(...Object.values(WHEEL_CATALOG).map(w => w.facetBonusPercent), 1),
    };

    /**
     * Constructs and initializes a lapidary wheel or cutting bench.
     */
    public static forgeWheel(
        lapidaryPlayerId: string,
        wheelType: LapidaryWheelType,
        currentEpochMs = Date.now()
    ): ActiveLapidaryWheel {
        const data = WHEEL_CATALOG[wheelType];
        if (!data) {
            throw new Error(`Unsupported lapidary wheel type: ${String(wheelType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            wheelId: `lapidary_${wheelType.toLowerCase()}_${uuid}`,
            lapidaryPlayerId,
            wheelType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            lapidaryPower: data.lapidaryPower,
            isFunctional: true,
        };
    }

    /**
     * Facets rough gems into pendants, signets, and cameo jewelry.
     */
    public static cutFacetedJewelry(
        wheel: ActiveLapidaryWheel,
        recipeType: FacetedJewelryRecipeType,
        providedGems: RoughGemstoneType[],
        craftRoll = Math.random(),
        brillianceRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; jewelry?: CraftedFacetedJewelry; remainingDurability: number; reason?: string } {
        if (!wheel || !wheel.isFunctional || wheel.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                remainingDurability: wheel?.currentDurability ?? 0,
                reason: `Lapidary wheel is blunted or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const wheelData = WHEEL_CATALOG[wheel.wheelType];
        if (!wheelData) {
            return { success: false, remainingDurability: wheel.currentDurability, reason: `Unknown wheel model: ${String(wheel.wheelType)}` };
        }

        const recipe = JEWELRY_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: wheel.currentDurability, reason: `Unknown jewelry recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedGems)) {
            return { success: false, remainingDurability: wheel.currentDurability, reason: "Invalid gemstones array." };
        }

        // Count matching gems
        const matchingCount = providedGems.filter(g => g === recipe.requiredGemType).length;
        if (matchingCount < recipe.requiredGemCount) {
            return {
                success: false,
                remainingDurability: wheel.currentDurability,
                reason: `Insufficient gemstones: requires ${recipe.requiredGemCount}x ${recipe.requiredGemType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        wheel.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (wheel.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            wheel.currentDurability = Math.max(0, wheel.currentDurability);
            wheel.isFunctional = false;
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > wheelData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: wheel.currentDurability,
                reason: `Gemstone fractured: cleavage plane shattered under pressure, rolled ${rollPercent.toFixed(1)}, needed <= ${wheelData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent brilliance score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeBrillianceRoll = Number.isFinite(brillianceRoll) ? Math.max(0, Math.min(1, brillianceRoll)) : Math.random();
        const powerRatio = Math.min(1.0, wheel.lapidaryPower / maxPower);
        const bonusPoints = (wheelData.facetBonusPercent / maxBonus) * 20;
        const brillianceScore = Math.max(0, Math.min(100, Math.round(
            (safeBrillianceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((brillianceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSpellPower = Math.round(recipe.baseSpellPower * qualityMultiplier);
        const finalCritChance = Math.round(recipe.baseCritChancePercent * qualityMultiplier);

        // Splice consumed gems out of cloned array
        const remaining = [...providedGems];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredGemCount; i--) {
            if (remaining[i] === recipe.requiredGemType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const jewelry: CraftedFacetedJewelry = {
            jewelryId: `jewel_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSpellPower,
            finalCritChancePercent: finalCritChance,
            gemBrilliancePercent: brillianceScore,
            consumedGemCount: recipe.requiredGemCount,
            consumedGemType: recipe.requiredGemType,
            remainingProvidedGems: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            jewelry,
            remainingDurability: wheel.currentDurability,
        };
    }

    /**
     * Resurfaces cutting wheel and repairs lapidary station.
     */
    public static maintainWheel(
        wheel: ActiveLapidaryWheel,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!wheel) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        wheel.currentDurability = Math.min(wheel.maxDurability, wheel.currentDurability + amt);
        wheel.isFunctional = wheel.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: wheel.currentDurability,
            isFunctional: wheel.isFunctional,
        };
    }
}