import crypto from "node:crypto";

/**
 * Ancient Runic Glassblowing, Alchemy Flask & Potion Phial Synthesis Engine for OpenAO MMORPG.
 * Simulates glassblowing pipes (Iron Blowpipe, Runic Mithril Pipe, Celestial Void Crucible Spout),
 * molten silica sand materials (Volcanic Quartz Sand, Astral Silica Flux, Void Darkglass Sand),
 * alchemy glassware recipes (Arcane Elixir Flask, Dragonfire Cauldron Vial, Celestial Ambrosia Phial),
 * independent glass purity ratings (0% to 100%), potion potency and duration scaling,
 * material inventory deduction, and blowpipe maintenance.
 */

export type GlassblowingPipeType = "IRON_BLOWPIPE" | "RUNIC_MITHRIL_PIPE" | "CELESTIAL_VOID_CRUCIBLE_SPOUT";
export type MoltenSilicaSandType = "VOLCANIC_QUARTZ_SAND" | "ASTRAL_SILICA_FLUX" | "VOID_DARKGLASS_SAND";
export type AlchemyGlasswareRecipeType = "ARCANE_ELIXIR_FLASK" | "DRAGONFIRE_CAULDRON_VIAL" | "CELESTIAL_AMBROSIA_PHIAL";

export interface GlassblowingPipeData {
    pipeType: GlassblowingPipeType;
    maxDurability: number;
    blowingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    purityBonusPercent: number;
}

export interface AlchemyGlasswareRecipeData {
    recipeType: AlchemyGlasswareRecipeType;
    requiredSandType: MoltenSilicaSandType;
    requiredSandCount: number;
    basePotionPotencyBonus: number;
    basePotionDurationSeconds: number;
}

export interface ActiveGlassblowingPipe {
    pipeId: string;
    artisanPlayerId: string;
    pipeType: GlassblowingPipeType;
    currentDurability: number;
    maxDurability: number;
    blowingPower: number;
    isFunctional: boolean;
}

export interface CraftedAlchemyGlassware {
    glasswareId: string;
    recipeType: AlchemyGlasswareRecipeType;
    finalPotionPotencyBonus: number;
    finalPotionDurationSeconds: number;
    glassPurityPercent: number; // 0 to 100
    consumedSandCount: number;
    consumedSandType: MoltenSilicaSandType;
    remainingProvidedSand: MoltenSilicaSandType[];
    craftedEpochMs: number;
}

export const PIPE_CATALOG: Record<GlassblowingPipeType, GlassblowingPipeData> = {
    IRON_BLOWPIPE: { pipeType: "IRON_BLOWPIPE", maxDurability: 70, blowingPower: 25, baseSuccessRatePercent: 85, purityBonusPercent: 10 },
    RUNIC_MITHRIL_PIPE: { pipeType: "RUNIC_MITHRIL_PIPE", maxDurability: 160, blowingPower: 65, baseSuccessRatePercent: 92, purityBonusPercent: 20 },
    CELESTIAL_VOID_CRUCIBLE_SPOUT: { pipeType: "CELESTIAL_VOID_CRUCIBLE_SPOUT", maxDurability: 300, blowingPower: 120, baseSuccessRatePercent: 99, purityBonusPercent: 35 },
};

export const GLASSWARE_RECIPE_CATALOG: Record<AlchemyGlasswareRecipeType, AlchemyGlasswareRecipeData> = {
    ARCANE_ELIXIR_FLASK: { recipeType: "ARCANE_ELIXIR_FLASK", requiredSandType: "VOLCANIC_QUARTZ_SAND", requiredSandCount: 2, basePotionPotencyBonus: 30, basePotionDurationSeconds: 1200 },
    DRAGONFIRE_CAULDRON_VIAL: { recipeType: "DRAGONFIRE_CAULDRON_VIAL", requiredSandType: "ASTRAL_SILICA_FLUX", requiredSandCount: 2, basePotionPotencyBonus: 65, basePotionDurationSeconds: 2400 },
    CELESTIAL_AMBROSIA_PHIAL: { recipeType: "CELESTIAL_AMBROSIA_PHIAL", requiredSandType: "VOID_DARKGLASS_SAND", requiredSandCount: 2, basePotionPotencyBonus: 110, basePotionDurationSeconds: 3600 },
};

export class AncientRunicGlassblowingAlchemyVialEngine {
    public static readonly DURABILITY_COST_PER_BLOW = 10;

    /**
     * Constructs and initializes a glassblowing blowpipe.
     */
    public static forgeBlowpipe(
        artisanPlayerId: string,
        pipeType: GlassblowingPipeType,
        currentEpochMs = Date.now()
    ): ActiveGlassblowingPipe {
        const data = PIPE_CATALOG[pipeType];
        if (!data) {
            throw new Error(`Unsupported glassblowing pipe type: ${String(pipeType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            pipeId: `pipe_${pipeType.toLowerCase()}_${uuid}`,
            artisanPlayerId,
            pipeType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            blowingPower: data.blowingPower,
            isFunctional: true,
        };
    }

    /**
     * Blows and crafts an alchemy flask/vial from molten silica sand materials.
     */
    public static blowGlassware(
        pipe: ActiveGlassblowingPipe,
        recipeType: AlchemyGlasswareRecipeType,
        providedSand: MoltenSilicaSandType[],
        blowRoll = Math.random(),
        purityRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; glassware?: CraftedAlchemyGlassware; remainingDurability: number; reason?: string } {
        if (!pipe || !pipe.isFunctional || pipe.currentDurability < this.DURABILITY_COST_PER_BLOW) {
            return {
                success: false,
                remainingDurability: pipe?.currentDurability ?? 0,
                reason: `Blowpipe is clogged or lacks durability (requires ${this.DURABILITY_COST_PER_BLOW}).`,
            };
        }

        const pipeData = PIPE_CATALOG[pipe.pipeType];
        if (!pipeData) {
            return { success: false, remainingDurability: pipe.currentDurability, reason: `Unknown blowpipe model: ${String(pipe.pipeType)}` };
        }

        const recipe = GLASSWARE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: pipe.currentDurability, reason: `Unknown glassware recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedSand)) {
            return { success: false, remainingDurability: pipe.currentDurability, reason: "Invalid sand array." };
        }

        // Count matching sand materials
        const matchingCount = providedSand.filter(s => s === recipe.requiredSandType).length;
        if (matchingCount < recipe.requiredSandCount) {
            return {
                success: false,
                remainingDurability: pipe.currentDurability,
                reason: `Insufficient materials: requires ${recipe.requiredSandCount}x ${recipe.requiredSandType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        pipe.currentDurability -= this.DURABILITY_COST_PER_BLOW;
        if (pipe.currentDurability < this.DURABILITY_COST_PER_BLOW) {
            pipe.currentDurability = Math.max(0, pipe.currentDurability);
            pipe.isFunctional = false;
        }

        const safeRoll = Number.isFinite(blowRoll) ? Math.max(0, Math.min(1, blowRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > pipeData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: pipe.currentDurability,
                reason: `Glass bubble shattered: molten flux cooled unevenly, rolled ${rollPercent.toFixed(1)}, needed <= ${pipeData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent purity score (0% to 100%)
        const safePurityRoll = Number.isFinite(purityRoll) ? Math.max(0, Math.min(1, purityRoll)) : Math.random();
        const powerRatio = Math.min(1.0, pipe.blowingPower / 120);
        // purityBonus scaled so max tier (35) contributes exactly 20 points
        const bonusPoints = (pipeData.purityBonusPercent / 35) * 20;
        const purityScore = Math.max(0, Math.min(100, Math.round(
            (safePurityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const purityMultiplier = 0.8 + ((purityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalPotency = Math.round(recipe.basePotionPotencyBonus * purityMultiplier);
        const finalDuration = Math.round(recipe.basePotionDurationSeconds * purityMultiplier);

        // Splice consumed sand out of cloned array
        const remaining = [...providedSand];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredSandCount; i--) {
            if (remaining[i] === recipe.requiredSandType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const glassware: CraftedAlchemyGlassware = {
            glasswareId: `glass_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPotionPotencyBonus: finalPotency,
            finalPotionDurationSeconds: finalDuration,
            glassPurityPercent: purityScore,
            consumedSandCount: recipe.requiredSandCount,
            consumedSandType: recipe.requiredSandType,
            remainingProvidedSand: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            glassware,
            remainingDurability: pipe.currentDurability,
        };
    }

    /**
     * Cleans and anneals glassblowing blowpipe.
     */
    public static annealBlowpipe(
        pipe: ActiveGlassblowingPipe,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!pipe) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        pipe.currentDurability = Math.min(pipe.maxDurability, pipe.currentDurability + amt);
        pipe.isFunctional = pipe.currentDurability >= this.DURABILITY_COST_PER_BLOW;

        return {
            success: true,
            newDurability: pipe.currentDurability,
            isFunctional: pipe.isFunctional,
        };
    }
}