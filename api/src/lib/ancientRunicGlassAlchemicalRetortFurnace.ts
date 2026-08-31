import crypto from "node:crypto";

/**
 * Ancient Runic Glass Alchemical Retort Furnace, Alembic Condenser & Essence Distillation Engine for OpenAO MMORPG.
 * Simulates glassblowing retort furnaces and annealing lehrs (Cedar Glass Retort Furnace, Runic Borosilicate Annealing Lehr, Celestial Void Distillation Sanctum),
 * raw quartz silica batches and borax flux (Quartz Silica Sand Batch, Borax Flux Glass Batch, Celestial Void Luminescent Glass Batch),
 * alchemical condenser alembics and distillation crucibles (Alchemist Condenser Alembic, Arcane Distillation Retort, Celestial Void Philosopher Crucible),
 * independent thermal shock resistance ratings (0% to 100%), clamped potion brew potency and clamped elixir yield bonus scaling,
 * upfront batch material deduction on all craft attempts, consistent remainingProvidedBatches return shapes across all paths, cached static catalog maxima, authoritative catalog power ratio, and glassblowing furnace maintenance.
 */

export type RetortFurnaceType = "CEDAR_GLASS_RETORT_FURNACE" | "RUNIC_BOROSILICATE_ANNEALING_LEHR" | "CELESTIAL_VOID_DISTILLATION_SANCTUM";
export type RawGlassBatchType = "QUARTZ_SILICA_SAND_BATCH" | "BORAX_FLUX_GLASS_BATCH" | "CELESTIAL_VOID_LUMINESCENT_GLASS_BATCH";
export type AlchemicalGlasswareRecipeType = "ALCHEMIST_CONDENSER_ALEMBIC" | "ARCANE_DISTILLATION_RETORT" | "CELESTIAL_VOID_PHILOSOPHER_CRUCIBLE";

export interface RetortFurnaceData {
    furnaceType: RetortFurnaceType;
    maxDurability: number;
    glassblowingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    distillationBonusPercent: number;
}

export interface AlchemicalGlasswareRecipeData {
    recipeType: AlchemicalGlasswareRecipeType;
    requiredBatchType: RawGlassBatchType;
    requiredBatchCount: number;
    basePotionBrewPotencyPercent: number;
    baseElixirYieldBonusPercent: number;
}

export interface ActiveRetortFurnace {
    furnaceId: string;
    glassblowerPlayerId: string;
    furnaceType: RetortFurnaceType;
    currentDurability: number;
    maxDurability: number;
    glassblowingPower: number;
    isFunctional: boolean;
}

export interface CraftedAlchemicalGlassware {
    glasswareId: string;
    recipeType: AlchemicalGlasswareRecipeType;
    finalPotionBrewPotencyPercent: number;
    finalElixirYieldBonusPercent: number;
    thermalShockResistancePercent: number; // 0 to 100
    consumedBatchCount: number;
    consumedBatchType: RawGlassBatchType;
    remainingProvidedBatches: RawGlassBatchType[];
    craftedEpochMs: number;
}

export const RETORT_FURNACE_CATALOG: Record<RetortFurnaceType, RetortFurnaceData> = {
    CEDAR_GLASS_RETORT_FURNACE: { furnaceType: "CEDAR_GLASS_RETORT_FURNACE", maxDurability: 75, glassblowingPower: 25, baseSuccessRatePercent: 85, distillationBonusPercent: 10 },
    RUNIC_BOROSILICATE_ANNEALING_LEHR: { furnaceType: "RUNIC_BOROSILICATE_ANNEALING_LEHR", maxDurability: 170, glassblowingPower: 65, baseSuccessRatePercent: 92, distillationBonusPercent: 20 },
    CELESTIAL_VOID_DISTILLATION_SANCTUM: { furnaceType: "CELESTIAL_VOID_DISTILLATION_SANCTUM", maxDurability: 310, glassblowingPower: 120, baseSuccessRatePercent: 99, distillationBonusPercent: 35 },
};

export const GLASSWARE_RECIPE_CATALOG: Record<AlchemicalGlasswareRecipeType, AlchemicalGlasswareRecipeData> = {
    ALCHEMIST_CONDENSER_ALEMBIC: { recipeType: "ALCHEMIST_CONDENSER_ALEMBIC", requiredBatchType: "QUARTZ_SILICA_SAND_BATCH", requiredBatchCount: 2, basePotionBrewPotencyPercent: 20, baseElixirYieldBonusPercent: 10 },
    ARCANE_DISTILLATION_RETORT: { recipeType: "ARCANE_DISTILLATION_RETORT", requiredBatchType: "BORAX_FLUX_GLASS_BATCH", requiredBatchCount: 2, basePotionBrewPotencyPercent: 45, baseElixirYieldBonusPercent: 25 },
    CELESTIAL_VOID_PHILOSOPHER_CRUCIBLE: { recipeType: "CELESTIAL_VOID_PHILOSOPHER_CRUCIBLE", requiredBatchType: "CELESTIAL_VOID_LUMINESCENT_GLASS_BATCH", requiredBatchCount: 2, basePotionBrewPotencyPercent: 85, baseElixirYieldBonusPercent: 60 },
};

export class AncientRunicGlassAlchemicalRetortFurnaceEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(RETORT_FURNACE_CATALOG).map(f => f.glassblowingPower), 1),
        maxBonus: Math.max(...Object.values(RETORT_FURNACE_CATALOG).map(f => f.distillationBonusPercent), 1),
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
     * Constructs and initializes an alchemical retort furnace or annealing lehr.
     */
    public static constructFurnace(
        glassblowerPlayerId: string,
        furnaceType: RetortFurnaceType
    ): ActiveRetortFurnace {
        const data = RETORT_FURNACE_CATALOG[furnaceType];
        if (!data) {
            throw new Error(`Unsupported retort furnace type: ${String(furnaceType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            furnaceId: `furnace_${furnaceType.toLowerCase()}_${uuid}`,
            glassblowerPlayerId,
            furnaceType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            glassblowingPower: data.glassblowingPower,
            isFunctional: true,
        };
    }

    /**
     * Blows and anneals quartz silica batches into alchemical alembics and distillation crucibles.
     * Note: Mutates the passed `furnace` in place and returns it as `updatedFurnace` for caller ergonomics.
     */
    public static blowGlassware(
        furnace: ActiveRetortFurnace,
        recipeType: AlchemicalGlasswareRecipeType,
        providedBatches: RawGlassBatchType[],
        craftRoll = Math.random(),
        thermalRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; glassware?: CraftedAlchemicalGlassware; updatedFurnace?: ActiveRetortFurnace; remainingDurability: number; remainingProvidedBatches: RawGlassBatchType[]; reason?: string } {
        const fallbackBatches = Array.isArray(providedBatches) ? [...providedBatches] : [];

        if (!furnace || !furnace.isFunctional || furnace.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedFurnace: furnace,
                remainingDurability: furnace?.currentDurability ?? 0,
                remainingProvidedBatches: fallbackBatches,
                reason: `Retort furnace is cold or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const furnaceData = RETORT_FURNACE_CATALOG[furnace.furnaceType];
        if (!furnaceData) {
            return { success: false, updatedFurnace: furnace, remainingDurability: furnace.currentDurability, remainingProvidedBatches: fallbackBatches, reason: `Unknown furnace model: ${String(furnace.furnaceType)}` };
        }

        const recipe = GLASSWARE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedFurnace: furnace, remainingDurability: furnace.currentDurability, remainingProvidedBatches: fallbackBatches, reason: `Unknown glassware recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedBatches)) {
            return { success: false, updatedFurnace: furnace, remainingDurability: furnace.currentDurability, remainingProvidedBatches: [], reason: "Invalid batches array." };
        }

        // Count matching glass batches
        const matchingCount = providedBatches.filter(b => b === recipe.requiredBatchType).length;
        if (matchingCount < recipe.requiredBatchCount) {
            return {
                success: false,
                updatedFurnace: furnace,
                remainingDurability: furnace.currentDurability,
                remainingProvidedBatches: fallbackBatches,
                reason: `Insufficient glass batch: requires ${recipe.requiredBatchCount}x ${recipe.requiredBatchType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        furnace.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (furnace.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            furnace.currentDurability = Math.max(0, furnace.currentDurability);
            furnace.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedBatches];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredBatchCount; i--) {
            if (remaining[i] === recipe.requiredBatchType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > furnaceData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedFurnace: furnace,
                remainingDurability: furnace.currentDurability,
                remainingProvidedBatches: remaining,
                reason: `Retort cracked: thermal shock gradient fractured annealing neck, rolled ${rollPercent.toFixed(1)}, needed <= ${furnaceData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent thermal shock resistance score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeThermalRoll = Number.isFinite(thermalRoll) ? Math.max(0, Math.min(1, thermalRoll)) : Math.random();
        const powerRatio = Math.min(1.0, furnaceData.glassblowingPower / maxPower);
        const bonusPoints = (furnaceData.distillationBonusPercent / maxBonus) * 20;
        const thermalScore = Math.max(0, Math.min(100, Math.round(
            (safeThermalRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((thermalScore / 100) * 0.4); // 0.8 to 1.2x

        const finalPotency = Math.max(0, Math.min(100, Math.round(recipe.basePotionBrewPotencyPercent * qualityMultiplier)));
        const finalYield = Math.max(0, Math.min(100, Math.round(recipe.baseElixirYieldBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const glassware: CraftedAlchemicalGlassware = {
            glasswareId: `glassware_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPotionBrewPotencyPercent: finalPotency,
            finalElixirYieldBonusPercent: finalYield,
            thermalShockResistancePercent: thermalScore,
            consumedBatchCount: recipe.requiredBatchCount,
            consumedBatchType: recipe.requiredBatchType,
            remainingProvidedBatches: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            glassware,
            updatedFurnace: furnace,
            remainingDurability: furnace.currentDurability,
            remainingProvidedBatches: remaining,
        };
    }

    /**
     * Relines refractory muffle bricks and maintains retort furnace.
     */
    public static maintainFurnace(
        furnace: ActiveRetortFurnace,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!furnace) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        furnace.currentDurability = Math.min(furnace.maxDurability, furnace.currentDurability + amt);
        furnace.isFunctional = furnace.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: furnace.currentDurability,
            isFunctional: furnace.isFunctional,
        };
    }
}