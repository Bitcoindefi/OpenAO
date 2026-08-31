import crypto from "node:crypto";

/**
 * Ancient Runic Apiary Beekeeping, Honeycomb Harvest & Arcane Candle Synthesis Engine for OpenAO MMORPG.
 * Simulates apiary hives and smokers (Wild Cedar Beehive, Runic Amber Hive Box, Celestial Void Royal Apiary),
 * harvested honeycombs (Wild Blossom Comb, Astral Golden Comb, Void Royal Jelly Comb),
 * arcane ritual candle recipes (Votive Candle of Illumination, Ward of Warding Glow, Celestial Beacon of Transcendence),
 * independent ritual candle brilliance ratings (0% to 100%), aura radius and buff duration scaling,
 * material inventory deduction, cached static catalog maxima, and smoker maintenance.
 */

export type ApiaryHiveType = "WILD_CEDAR_BEEHIVE" | "RUNIC_AMBER_HIVE_BOX" | "CELESTIAL_VOID_ROYAL_APIARY";
export type HarvestedCombType = "WILD_BLOSSOM_COMB" | "ASTRAL_GOLDEN_COMB" | "VOID_ROYAL_JELLY_COMB";
export type ArcaneCandleRecipeType = "VOTIVE_CANDLE_OF_ILLUMINATION" | "WARD_OF_WARDING_GLOW" | "CELESTIAL_BEACON_OF_TRANSCENDENCE";

export interface ApiaryHiveData {
    hiveType: ApiaryHiveType;
    maxDurability: number;
    apiaryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    waxYieldBonusPercent: number;
}

export interface ArcaneCandleRecipeData {
    recipeType: ArcaneCandleRecipeType;
    requiredCombType: HarvestedCombType;
    requiredCombCount: number;
    baseAuraRadiusMeters: number;
    baseBuffDurationSeconds: number;
}

export interface ActiveApiaryHive {
    hiveId: string;
    beekeeperPlayerId: string;
    hiveType: ApiaryHiveType;
    currentDurability: number;
    maxDurability: number;
    apiaryPower: number;
    isFunctional: boolean;
}

export interface CraftedArcaneCandle {
    candleId: string;
    recipeType: ArcaneCandleRecipeType;
    finalAuraRadiusMeters: number;
    finalBuffDurationSeconds: number;
    candleBrilliancePercent: number; // 0 to 100
    consumedCombCount: number;
    consumedCombType: HarvestedCombType;
    remainingProvidedCombs: HarvestedCombType[];
    craftedEpochMs: number;
}

export const HIVE_CATALOG: Record<ApiaryHiveType, ApiaryHiveData> = {
    WILD_CEDAR_BEEHIVE: { hiveType: "WILD_CEDAR_BEEHIVE", maxDurability: 75, apiaryPower: 25, baseSuccessRatePercent: 85, waxYieldBonusPercent: 10 },
    RUNIC_AMBER_HIVE_BOX: { hiveType: "RUNIC_AMBER_HIVE_BOX", maxDurability: 170, apiaryPower: 65, baseSuccessRatePercent: 92, waxYieldBonusPercent: 20 },
    CELESTIAL_VOID_ROYAL_APIARY: { hiveType: "CELESTIAL_VOID_ROYAL_APIARY", maxDurability: 310, apiaryPower: 120, baseSuccessRatePercent: 99, waxYieldBonusPercent: 35 },
};

export const CANDLE_RECIPE_CATALOG: Record<ArcaneCandleRecipeType, ArcaneCandleRecipeData> = {
    VOTIVE_CANDLE_OF_ILLUMINATION: { recipeType: "VOTIVE_CANDLE_OF_ILLUMINATION", requiredCombType: "WILD_BLOSSOM_COMB", requiredCombCount: 2, baseAuraRadiusMeters: 15, baseBuffDurationSeconds: 900 },
    WARD_OF_WARDING_GLOW: { recipeType: "WARD_OF_WARDING_GLOW", requiredCombType: "ASTRAL_GOLDEN_COMB", requiredCombCount: 2, baseAuraRadiusMeters: 35, baseBuffDurationSeconds: 1800 },
    CELESTIAL_BEACON_OF_TRANSCENDENCE: { recipeType: "CELESTIAL_BEACON_OF_TRANSCENDENCE", requiredCombType: "VOID_ROYAL_JELLY_COMB", requiredCombCount: 2, baseAuraRadiusMeters: 75, baseBuffDurationSeconds: 3600 },
};

export class AncientRunicBeekeepingWaxCandleEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(HIVE_CATALOG).map(h => h.apiaryPower), 1),
        maxBonus: Math.max(...Object.values(HIVE_CATALOG).map(h => h.waxYieldBonusPercent), 1),
    };

    /**
     * Constructs and initializes an apiary hive or smoker setup.
     */
    public static constructHive(
        beekeeperPlayerId: string,
        hiveType: ApiaryHiveType,
        currentEpochMs = Date.now()
    ): ActiveApiaryHive {
        const data = HIVE_CATALOG[hiveType];
        if (!data) {
            throw new Error(`Unsupported apiary hive type: ${String(hiveType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            hiveId: `hive_${hiveType.toLowerCase()}_${uuid}`,
            beekeeperPlayerId,
            hiveType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            apiaryPower: data.apiaryPower,
            isFunctional: true,
        };
    }

    /**
     * Harvests honeycombs and crafts arcane ritual wax candles.
     */
    public static craftRitualCandle(
        hive: ActiveApiaryHive,
        recipeType: ArcaneCandleRecipeType,
        providedCombs: HarvestedCombType[],
        craftRoll = Math.random(),
        brillianceRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; candle?: CraftedArcaneCandle; remainingDurability: number; reason?: string } {
        if (!hive || !hive.isFunctional || hive.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                remainingDurability: hive?.currentDurability ?? 0,
                reason: `Apiary smoker is exhausted or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const hiveData = HIVE_CATALOG[hive.hiveType];
        if (!hiveData) {
            return { success: false, remainingDurability: hive.currentDurability, reason: `Unknown hive model: ${String(hive.hiveType)}` };
        }

        const recipe = CANDLE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: hive.currentDurability, reason: `Unknown candle recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedCombs)) {
            return { success: false, remainingDurability: hive.currentDurability, reason: "Invalid honeycombs array." };
        }

        // Count matching honeycombs
        const matchingCount = providedCombs.filter(c => c === recipe.requiredCombType).length;
        if (matchingCount < recipe.requiredCombCount) {
            return {
                success: false,
                remainingDurability: hive.currentDurability,
                reason: `Insufficient honeycombs: requires ${recipe.requiredCombCount}x ${recipe.requiredCombType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        hive.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (hive.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            hive.currentDurability = Math.max(0, hive.currentDurability);
            hive.isFunctional = false;
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > hiveData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: hive.currentDurability,
                reason: `Wax boiling scorched: flame flared during wax purification, rolled ${rollPercent.toFixed(1)}, needed <= ${hiveData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent brilliance score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeBrillianceRoll = Number.isFinite(brillianceRoll) ? Math.max(0, Math.min(1, brillianceRoll)) : Math.random();
        const powerRatio = Math.min(1.0, hive.apiaryPower / maxPower);
        const bonusPoints = (hiveData.waxYieldBonusPercent / maxBonus) * 20;
        const brillianceScore = Math.max(0, Math.min(100, Math.round(
            (safeBrillianceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((brillianceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalRadius = Math.round(recipe.baseAuraRadiusMeters * qualityMultiplier);
        const finalDuration = Math.round(recipe.baseBuffDurationSeconds * qualityMultiplier);

        // Splice consumed honeycombs out of cloned array
        const remaining = [...providedCombs];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredCombCount; i--) {
            if (remaining[i] === recipe.requiredCombType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const candle: CraftedArcaneCandle = {
            candleId: `candle_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalAuraRadiusMeters: finalRadius,
            finalBuffDurationSeconds: finalDuration,
            candleBrilliancePercent: brillianceScore,
            consumedCombCount: recipe.requiredCombCount,
            consumedCombType: recipe.requiredCombType,
            remainingProvidedCombs: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            candle,
            remainingDurability: hive.currentDurability,
        };
    }

    /**
     * Replenishes smoker fuel and maintains apiary hive.
     */
    public static maintainHive(
        hive: ActiveApiaryHive,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!hive) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        hive.currentDurability = Math.min(hive.maxDurability, hive.currentDurability + amt);
        hive.isFunctional = hive.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: hive.currentDurability,
            isFunctional: hive.isFunctional,
        };
    }
}