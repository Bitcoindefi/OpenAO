import crypto from "node:crypto";

/**
 * Ancient Runic Siege Engine Engineering, Heavy Ballista & Trebuchet Calibration Engine for OpenAO MMORPG.
 * Simulates siege engineering workshops (Reinforced Timber Rig, Runic Steel Siege Crane, Celestial Void Heavy Trebuchet Forge),
 * engineered munitions & beams (Ironbound Timber Beams, Molten Brimstone Shell, Void Singularity Core),
 * siege artillery structures (Heavy Wallbreaker Ballista, Firestorm Mangonel Catapult, Celestial Void-Shatter Trebuchet),
 * independent destruction precision ratings (0% to 100%), castle breach damage scaling,
 * material inventory deduction, cached static catalog maxima, and siege rig maintenance.
 */

export type SiegeWorkshopType = "REINFORCED_TIMBER_RIG" | "RUNIC_STEEL_SIEGE_CRANE" | "CELESTIAL_VOID_HEAVY_TREBUCHET_FORGE";
export type EngineeredMunitionType = "IRONBOUND_TIMBER_BEAMS" | "MOLTEN_BRIMSTONE_SHELL" | "VOID_SINGULARITY_CORE";
export type SiegeArtilleryRecipeType = "HEAVY_WALLBREAKER_BALLISTA" | "FIRESTORM_MANGONEL_CATAPULT" | "CELESTIAL_VOID_SHATTER_TREBUCHET";

export interface SiegeWorkshopData {
    workshopType: SiegeWorkshopType;
    maxDurability: number;
    engineeringPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    breachBonusPercent: number;
}

export interface SiegeArtilleryRecipeData {
    recipeType: SiegeArtilleryRecipeType;
    requiredMunitionType: EngineeredMunitionType;
    requiredMunitionCount: number;
    baseWallBreachDamage: number;
    baseEffectiveRangeMeters: number;
}

export interface ActiveSiegeWorkshop {
    workshopId: string;
    engineerPlayerId: string;
    workshopType: SiegeWorkshopType;
    currentDurability: number;
    maxDurability: number;
    engineeringPower: number;
    isFunctional: boolean;
}

export interface ConstructedSiegeArtillery {
    artilleryId: string;
    recipeType: SiegeArtilleryRecipeType;
    finalWallBreachDamage: number;
    finalEffectiveRangeMeters: number;
    destructionPrecisionPercent: number; // 0 to 100
    consumedMunitionCount: number;
    consumedMunitionType: EngineeredMunitionType;
    remainingProvidedMunitions: EngineeredMunitionType[];
    constructedEpochMs: number;
}

export const WORKSHOP_CATALOG: Record<SiegeWorkshopType, SiegeWorkshopData> = {
    REINFORCED_TIMBER_RIG: { workshopType: "REINFORCED_TIMBER_RIG", maxDurability: 75, engineeringPower: 25, baseSuccessRatePercent: 85, breachBonusPercent: 10 },
    RUNIC_STEEL_SIEGE_CRANE: { workshopType: "RUNIC_STEEL_SIEGE_CRANE", maxDurability: 170, engineeringPower: 65, baseSuccessRatePercent: 92, breachBonusPercent: 20 },
    CELESTIAL_VOID_HEAVY_TREBUCHET_FORGE: { workshopType: "CELESTIAL_VOID_HEAVY_TREBUCHET_FORGE", maxDurability: 310, engineeringPower: 120, baseSuccessRatePercent: 99, breachBonusPercent: 35 },
};

export const ARTILLERY_RECIPE_CATALOG: Record<SiegeArtilleryRecipeType, SiegeArtilleryRecipeData> = {
    HEAVY_WALLBREAKER_BALLISTA: { recipeType: "HEAVY_WALLBREAKER_BALLISTA", requiredMunitionType: "IRONBOUND_TIMBER_BEAMS", requiredMunitionCount: 2, baseWallBreachDamage: 1200, baseEffectiveRangeMeters: 350 },
    FIRESTORM_MANGONEL_CATAPULT: { recipeType: "FIRESTORM_MANGONEL_CATAPULT", requiredMunitionType: "MOLTEN_BRIMSTONE_SHELL", requiredMunitionCount: 2, baseWallBreachDamage: 2800, baseEffectiveRangeMeters: 600 },
    CELESTIAL_VOID_SHATTER_TREBUCHET: { recipeType: "CELESTIAL_VOID_SHATTER_TREBUCHET", requiredMunitionType: "VOID_SINGULARITY_CORE", requiredMunitionCount: 2, baseWallBreachDamage: 6500, baseEffectiveRangeMeters: 1200 },
};

export class AncientRunicSiegeBallistaCatapultEngine {
    public static readonly DURABILITY_COST_PER_CONSTRUCTION = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(WORKSHOP_CATALOG).map(w => w.engineeringPower), 1),
        maxBonus: Math.max(...Object.values(WORKSHOP_CATALOG).map(w => w.breachBonusPercent), 1),
    };

    /**
     * Constructs and initializes a siege workshop rig or crane.
     */
    public static constructWorkshop(
        engineerPlayerId: string,
        workshopType: SiegeWorkshopType,
        currentEpochMs = Date.now()
    ): ActiveSiegeWorkshop {
        const data = WORKSHOP_CATALOG[workshopType];
        if (!data) {
            throw new Error(`Unsupported siege workshop type: ${String(workshopType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            workshopId: `siege_${workshopType.toLowerCase()}_${uuid}`,
            engineerPlayerId,
            workshopType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            engineeringPower: data.engineeringPower,
            isFunctional: true,
        };
    }

    /**
     * Assembles engineered munitions into heavy wallbreaker ballistas, catapults, and trebuchets.
     */
    public static constructArtillery(
        workshop: ActiveSiegeWorkshop,
        recipeType: SiegeArtilleryRecipeType,
        providedMunitions: EngineeredMunitionType[],
        constructRoll = Math.random(),
        precisionRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; artillery?: ConstructedSiegeArtillery; remainingDurability: number; reason?: string } {
        if (!workshop || !workshop.isFunctional || workshop.currentDurability < this.DURABILITY_COST_PER_CONSTRUCTION) {
            return {
                success: false,
                remainingDurability: workshop?.currentDurability ?? 0,
                reason: `Siege workshop rig is misaligned or lacks durability (requires ${this.DURABILITY_COST_PER_CONSTRUCTION}).`,
            };
        }

        const workshopData = WORKSHOP_CATALOG[workshop.workshopType];
        if (!workshopData) {
            return { success: false, remainingDurability: workshop.currentDurability, reason: `Unknown workshop model: ${String(workshop.workshopType)}` };
        }

        const recipe = ARTILLERY_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: workshop.currentDurability, reason: `Unknown artillery recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedMunitions)) {
            return { success: false, remainingDurability: workshop.currentDurability, reason: "Invalid munitions array." };
        }

        // Count matching munitions
        const matchingCount = providedMunitions.filter(m => m === recipe.requiredMunitionType).length;
        if (matchingCount < recipe.requiredMunitionCount) {
            return {
                success: false,
                remainingDurability: workshop.currentDurability,
                reason: `Insufficient munitions: requires ${recipe.requiredMunitionCount}x ${recipe.requiredMunitionType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        workshop.currentDurability -= this.DURABILITY_COST_PER_CONSTRUCTION;
        if (workshop.currentDurability < this.DURABILITY_COST_PER_CONSTRUCTION) {
            workshop.currentDurability = Math.max(0, workshop.currentDurability);
            workshop.isFunctional = false;
        }

        const safeRoll = Number.isFinite(constructRoll) ? Math.max(0, Math.min(1, constructRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > workshopData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: workshop.currentDurability,
                reason: `Assembly failed: winch cable snapped under torsion pressure, rolled ${rollPercent.toFixed(1)}, needed <= ${workshopData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent precision score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safePrecisionRoll = Number.isFinite(precisionRoll) ? Math.max(0, Math.min(1, precisionRoll)) : Math.random();
        const powerRatio = Math.min(1.0, workshop.engineeringPower / maxPower);
        const bonusPoints = (workshopData.breachBonusPercent / maxBonus) * 20;
        const precisionScore = Math.max(0, Math.min(100, Math.round(
            (safePrecisionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((precisionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalDamage = Math.round(recipe.baseWallBreachDamage * qualityMultiplier);
        const finalRange = Math.round(recipe.baseEffectiveRangeMeters * qualityMultiplier);

        // Splice consumed munitions out of cloned array
        const remaining = [...providedMunitions];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredMunitionCount; i--) {
            if (remaining[i] === recipe.requiredMunitionType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const artillery: ConstructedSiegeArtillery = {
            artilleryId: `siege_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalWallBreachDamage: finalDamage,
            finalEffectiveRangeMeters: finalRange,
            destructionPrecisionPercent: precisionScore,
            consumedMunitionCount: recipe.requiredMunitionCount,
            consumedMunitionType: recipe.requiredMunitionType,
            remainingProvidedMunitions: remaining,
            constructedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            artillery,
            remainingDurability: workshop.currentDurability,
        };
    }

    /**
     * Refits winch cables and maintains siege workshop rig.
     */
    public static maintainWorkshop(
        workshop: ActiveSiegeWorkshop,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!workshop) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        workshop.currentDurability = Math.min(workshop.maxDurability, workshop.currentDurability + amt);
        workshop.isFunctional = workshop.currentDurability >= this.DURABILITY_COST_PER_CONSTRUCTION;

        return {
            success: true,
            newDurability: workshop.currentDurability,
            isFunctional: workshop.isFunctional,
        };
    }
}