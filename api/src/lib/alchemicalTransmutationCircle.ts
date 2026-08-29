import crypto from "node:crypto";

/**
 * Alchemical Transmutation Circle, Philosopher's Catalyst & Matter Conversion Engine for OpenAO MMORPG.
 * Simulates drawing arcane transmutation circles (Lead to Gold, Iron to Mithril, Ash to Phoenix Feather),
 * blending catalysts (Philosopher's Mercury, Vitriol, Quintessence), and managing arcane backlash risks.
 */

export type TransmutationRecipe = "LEAD_TO_GOLD" | "IRON_TO_MITHRIL" | "ASH_TO_PHOENIX_FEATHER";
export type CatalystReagentType = "PHILOSOPHERS_MERCURY" | "VITRIOL_OIL" | "QUINTESSENCE";

export interface TransmutationCircleState {
    circleId: string;
    alchemistPlayerId: string;
    recipe: TransmutationRecipe;
    isActivated: boolean;
    requiredReagentName: string;
    requiredReagentQuantity: number;
    baseOutputQuantity: number;
    outputItemName: string;
}

export interface CatalystReagent {
    catalystType: CatalystReagentType;
    yieldBonusPercent: number; // 0 to 100
    backlashRiskPercent: number; // 0 to 100
}

export const TRANSMUTATION_RECIPE_CATALOG: Record<TransmutationRecipe, { reagent: string; reqQty: number; outputName: string; baseYield: number }> = {
    LEAD_TO_GOLD: { reagent: "Lead Ore", reqQty: 20, outputName: "Pure Gold Ingot", baseYield: 5 },
    IRON_TO_MITHRIL: { reagent: "Iron Bar", reqQty: 30, outputName: "Mithril Ingot", baseYield: 8 },
    ASH_TO_PHOENIX_FEATHER: { reagent: "Sacred Ash", reqQty: 50, outputName: "Phoenix Pinion", baseYield: 2 },
};

export const CATALYST_CATALOG: Record<CatalystReagentType, CatalystReagent> = {
    PHILOSOPHERS_MERCURY: { catalystType: "PHILOSOPHERS_MERCURY", yieldBonusPercent: 30, backlashRiskPercent: 20 },
    VITRIOL_OIL: { catalystType: "VITRIOL_OIL", yieldBonusPercent: 15, backlashRiskPercent: 10 },
    QUINTESSENCE: { catalystType: "QUINTESSENCE", yieldBonusPercent: 50, backlashRiskPercent: 0 },
};

export class AlchemicalTransmutationCircleEngine {
    /**
     * Inscribes a new alchemical transmutation circle.
     */
    public static inscribeCircle(
        alchemistPlayerId: string,
        recipe: TransmutationRecipe,
        currentEpochMs = Date.now()
    ): TransmutationCircleState {
        const recipeData = TRANSMUTATION_RECIPE_CATALOG[recipe];
        if (!recipeData) {
            throw new Error(`Unsupported transmutation recipe: ${String(recipe)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            circleId: `transmute_${recipe.toLowerCase()}_${uuid}`,
            alchemistPlayerId,
            recipe,
            isActivated: false,
            requiredReagentName: recipeData.reagent,
            requiredReagentQuantity: recipeData.reqQty,
            baseOutputQuantity: recipeData.baseYield,
            outputItemName: recipeData.outputName,
        };
    }

    /**
     * Transmutes matter through the inscribed circle using catalyst reagents.
     */
    public static executeTransmutation(
        circle: TransmutationCircleState,
        suppliedReagentQuantity: number,
        catalyst?: CatalystReagentType,
        catalystPurityPercent = 100,
        rng: () => number = Math.random
    ): { success: boolean; outputQuantity: number; outputItemName: string; backlashDamageTaken: number; reason?: string } {
        if (!circle || circle.isActivated) {
            return { success: false, outputQuantity: 0, outputItemName: circle?.outputItemName ?? "None", backlashDamageTaken: 0, reason: "Transmutation circle is already consumed or invalid." };
        }

        const qty = Number.isFinite(suppliedReagentQuantity) ? suppliedReagentQuantity : 0;
        if (qty < circle.requiredReagentQuantity) {
            return { success: false, outputQuantity: 0, outputItemName: circle.outputItemName, backlashDamageTaken: 0, reason: `Insufficient ${circle.requiredReagentName}. Required: ${circle.requiredReagentQuantity}, Provided: ${qty}.` };
        }

        let bonusPercent = 0;
        let riskPercent = 0;

        if (catalyst) {
            if (!Number.isFinite(catalystPurityPercent) || catalystPurityPercent <= 0) {
                return { success: false, outputQuantity: 0, outputItemName: circle.outputItemName, backlashDamageTaken: 0, reason: "Catalyst purity must be greater than 0%." };
            }

            const catData = CATALYST_CATALOG[catalyst];
            if (catData) {
                const purityRatio = Math.max(0.01, Math.min(1.0, catalystPurityPercent / 100));
                bonusPercent = catData.yieldBonusPercent * purityRatio;
                // Lower purity increases backlash risk
                riskPercent = Math.min(90, catData.backlashRiskPercent * (2 - purityRatio));
            }
        }

        // Check for arcane backlash explosion
        if (riskPercent > 0 && rng() * 100 < riskPercent) {
            circle.isActivated = true; // Circle destroyed in explosion
            return {
                success: false,
                outputQuantity: 0,
                outputItemName: circle.outputItemName,
                backlashDamageTaken: 250,
                reason: "Arcane Transmutation Backlash! The circle exploded in chaotic elemental discharge.",
            };
        }

        circle.isActivated = true;
        const totalYield = Math.max(1, Math.round(circle.baseOutputQuantity * (1 + bonusPercent / 100)));

        return {
            success: true,
            outputQuantity: totalYield,
            outputItemName: circle.outputItemName,
            backlashDamageTaken: 0,
        };
    }
}