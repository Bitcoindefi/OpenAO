import crypto from "node:crypto";

/**
 * Ancient Runic Glass Hourglass Sand Caster, Chronomantic Crucible & Temporal Flow Engine for OpenAO MMORPG.
 * Simulates hourglass caster hearths and chronomantic calibration stands (Cedar Hourglass Caster Stand, Runic Brass Chronomantic Gimbal, Celestial Void Chronos Flow Sanctum),
 * raw fused quartz bulbs and chronomantic sand phials (Fused Quartz Glass Bulb, Chronomantic Gold Sand Phial, Celestial Void Temporal Stardust Ampoule),
 * temporal tether hourglasses and epoch clepsydra recipes (Wanderer Chrono-Tether Hourglass, Time-Warp Spell-Haste Sandglass, Celestial Void Chronos Epoch Clepsydra),
 * independent temporal precision ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped cooldown reduction aura and clamped haste flow duration scaling,
 * upfront bulb material deduction on all craft attempts, consistent remainingProvidedBulbs return shapes across all paths, cached static catalog maxima, authoritative catalog power ratio without dead instance fields, and hourglass stand maintenance.
 */

export type HourglassStandType = "CEDAR_HOURGLASS_CASTER_STAND" | "RUNIC_BRASS_CHRONOMANTIC_GIMBAL" | "CELESTIAL_VOID_CHRONOS_FLOW_SANCTUM";
export type RawHourglassBulbType = "FUSED_QUARTZ_GLASS_BULB" | "CHRONOMANTIC_GOLD_SAND_PHIAL" | "CELESTIAL_VOID_TEMPORAL_STARDUST_AMPOULE";
export type TemporalHourglassRecipeType = "WANDERER_CHRONO_TETHER_HOURGLASS" | "TIME_WARP_SPELL_HASTE_SANDGLASS" | "CELESTIAL_VOID_CHRONOS_EPOCH_CLEPSYDRA";

export interface HourglassStandData {
    standType: HourglassStandType;
    maxDurability: number;
    chronomanticPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    temporalBonusPercent: number;
}

export interface TemporalHourglassRecipeData {
    recipeType: TemporalHourglassRecipeType;
    requiredBulbType: RawHourglassBulbType;
    requiredBulbCount: number;
    baseCooldownReductionPercent: number;
    baseHasteFlowDurationPercent: number;
}

export interface ActiveHourglassStand {
    standId: string;
    casterPlayerId: string;
    standType: HourglassStandType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedTemporalHourglass {
    hourglassId: string;
    recipeType: TemporalHourglassRecipeType;
    finalCooldownReductionPercent: number;
    finalHasteFlowDurationPercent: number;
    temporalPrecisionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog stand baselines ~14% to 100%)
    consumedBulbCount: number;
    consumedBulbType: RawHourglassBulbType;
    remainingProvidedBulbs: RawHourglassBulbType[];
    craftedEpochMs: number;
}

export const HOURGLASS_STAND_CATALOG: Record<HourglassStandType, HourglassStandData> = {
    CEDAR_HOURGLASS_CASTER_STAND: { standType: "CEDAR_HOURGLASS_CASTER_STAND", maxDurability: 75, chronomanticPower: 25, baseSuccessRatePercent: 85, temporalBonusPercent: 10 },
    RUNIC_BRASS_CHRONOMANTIC_GIMBAL: { standType: "RUNIC_BRASS_CHRONOMANTIC_GIMBAL", maxDurability: 170, chronomanticPower: 65, baseSuccessRatePercent: 92, temporalBonusPercent: 20 },
    CELESTIAL_VOID_CHRONOS_FLOW_SANCTUM: { standType: "CELESTIAL_VOID_CHRONOS_FLOW_SANCTUM", maxDurability: 310, chronomanticPower: 120, baseSuccessRatePercent: 99, temporalBonusPercent: 35 },
};

export const HOURGLASS_RECIPE_CATALOG: Record<TemporalHourglassRecipeType, TemporalHourglassRecipeData> = {
    WANDERER_CHRONO_TETHER_HOURGLASS: { recipeType: "WANDERER_CHRONO_TETHER_HOURGLASS", requiredBulbType: "FUSED_QUARTZ_GLASS_BULB", requiredBulbCount: 2, baseCooldownReductionPercent: 20, baseHasteFlowDurationPercent: 10 },
    TIME_WARP_SPELL_HASTE_SANDGLASS: { recipeType: "TIME_WARP_SPELL_HASTE_SANDGLASS", requiredBulbType: "CHRONOMANTIC_GOLD_SAND_PHIAL", requiredBulbCount: 2, baseCooldownReductionPercent: 45, baseHasteFlowDurationPercent: 25 },
    CELESTIAL_VOID_CHRONOS_EPOCH_CLEPSYDRA: { recipeType: "CELESTIAL_VOID_CHRONOS_EPOCH_CLEPSYDRA", requiredBulbType: "CELESTIAL_VOID_TEMPORAL_STARDUST_AMPOULE", requiredBulbCount: 2, baseCooldownReductionPercent: 80, baseHasteFlowDurationPercent: 60 },
};

export class AncientRunicGlassHourglassSandCasterEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(HOURGLASS_STAND_CATALOG).map(s => s.chronomanticPower), 1),
        maxBonus: Math.max(...Object.values(HOURGLASS_STAND_CATALOG).map(s => s.temporalBonusPercent), 1),
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
     * Constructs and initializes an hourglass sand caster stand or chronomantic gimbal.
     */
    public static constructStand(
        casterPlayerId: string,
        standType: HourglassStandType
    ): ActiveHourglassStand {
        const data = HOURGLASS_STAND_CATALOG[standType];
        if (!data) {
            throw new Error(`Unsupported hourglass stand type: ${String(standType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            standId: `stand_${standType.toLowerCase()}_${uuid}`,
            casterPlayerId,
            standType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Fills and seals quartz bulbs with chronomantic sand into temporal sandglasses and epoch clepsydras.
     * Note: Mutates the passed `stand` in place and returns it as `updatedStand` for caller ergonomics.
     */
    public static castHourglass(
        stand: ActiveHourglassStand,
        recipeType: TemporalHourglassRecipeType,
        providedBulbs: RawHourglassBulbType[],
        craftRoll = Math.random(),
        precisionRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; hourglass?: CraftedTemporalHourglass; updatedStand?: ActiveHourglassStand; remainingDurability: number; remainingProvidedBulbs: RawHourglassBulbType[]; reason?: string } {
        const fallbackBulbs = Array.isArray(providedBulbs) ? [...providedBulbs] : [];

        if (!stand || !stand.isFunctional || stand.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedStand: stand,
                remainingDurability: stand?.currentDurability ?? 0,
                remainingProvidedBulbs: fallbackBulbs,
                reason: `Hourglass stand is misaligned or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const standData = HOURGLASS_STAND_CATALOG[stand.standType];
        if (!standData) {
            return { success: false, updatedStand: stand, remainingDurability: stand.currentDurability, remainingProvidedBulbs: fallbackBulbs, reason: `Unknown stand model: ${String(stand.standType)}` };
        }

        const recipe = HOURGLASS_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedStand: stand, remainingDurability: stand.currentDurability, remainingProvidedBulbs: fallbackBulbs, reason: `Unknown hourglass recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedBulbs)) {
            return { success: false, updatedStand: stand, remainingDurability: stand.currentDurability, remainingProvidedBulbs: [], reason: "Invalid bulbs array." };
        }

        // Count matching glass bulbs
        const matchingCount = providedBulbs.filter(b => b === recipe.requiredBulbType).length;
        if (matchingCount < recipe.requiredBulbCount) {
            return {
                success: false,
                updatedStand: stand,
                remainingDurability: stand.currentDurability,
                remainingProvidedBulbs: fallbackBulbs,
                reason: `Insufficient glass bulb: requires ${recipe.requiredBulbCount}x ${recipe.requiredBulbType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        stand.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (stand.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            stand.currentDurability = Math.max(0, stand.currentDurability);
            stand.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedBulbs];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredBulbCount; i--) {
            if (remaining[i] === recipe.requiredBulbType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > standData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedStand: stand,
                remainingDurability: stand.currentDurability,
                remainingProvidedBulbs: remaining,
                reason: `Hourglass cracked: thermal stress cleaved waist neck, rolled ${rollPercent.toFixed(1)}, needed <= ${standData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent temporal precision score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safePrecisionRoll = Number.isFinite(precisionRoll) ? Math.max(0, Math.min(1, precisionRoll)) : Math.random();
        const powerRatio = Math.min(1.0, standData.chronomanticPower / maxPower);
        const bonusPoints = (standData.temporalBonusPercent / maxBonus) * 20;
        const precisionScore = Math.max(0, Math.min(100, Math.round(
            (safePrecisionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((precisionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalCooldown = Math.max(0, Math.min(100, Math.round(recipe.baseCooldownReductionPercent * qualityMultiplier)));
        const finalHaste = Math.max(0, Math.min(100, Math.round(recipe.baseHasteFlowDurationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const hourglass: CraftedTemporalHourglass = {
            hourglassId: `hourglass_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalCooldownReductionPercent: finalCooldown,
            finalHasteFlowDurationPercent: finalHaste,
            temporalPrecisionPercent: precisionScore,
            consumedBulbCount: recipe.requiredBulbCount,
            consumedBulbType: recipe.requiredBulbType,
            remainingProvidedBulbs: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            hourglass,
            updatedStand: stand,
            remainingDurability: stand.currentDurability,
            remainingProvidedBulbs: remaining,
        };
    }

    /**
     * Re-levels chronomantic gimbals and maintains hourglass caster stand.
     */
    public static maintainStand(
        stand: ActiveHourglassStand,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!stand) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        stand.currentDurability = Math.min(stand.maxDurability, stand.currentDurability + amt);
        stand.isFunctional = stand.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: stand.currentDurability,
            isFunctional: stand.isFunctional,
        };
    }
}