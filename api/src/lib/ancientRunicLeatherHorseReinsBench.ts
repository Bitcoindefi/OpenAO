import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Reins Bench, Mithril Bit Coupling Rig & Celestial Valkyrie Reins Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian reins and bit coupling crafting benches (Elder Reins Bench, Runic Oak Reins Rig, Celestial Void Valkyrie Reins Sanctum),
 * raw tanned bull guide rein straps, tempered mithril bit couplings and astral snaffle pads,
 * novice expedition reins and sovereign valkyrie reins recipes,
 * independent steed steering response precision ratings and mouth jerk damping ratings,
 * calibrated clamped reins stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse reins bench maintenance routines.
 */

export type ReinsBenchType = "ELDER_REINS_BENCH" | "RUNIC_OAK_REINS_RIG" | "CELESTIAL_VOID_VALKYRIE_REINS_SANCTUM";
export type RawLeatherReinsType = "TANNED_BULL_GUIDE_REIN_STRAP" | "TEMPERED_MITHRIL_BIT_COUPLING" | "CELESTIAL_VOID_ASTRAL_SNAFFLE_PAD";
export type ReinsRecipeType = "NOVICE_EXPEDITION_REINS" | "WARMASTER_MITHRIL_REINFORCED_REINS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS";

export interface ReinsBenchData {
    benchType: ReinsBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    reinsStabilityBonusPercent: number;
}

export interface ReinsRecipeData {
    recipeType: ReinsRecipeType;
    requiredLeatherType: RawLeatherReinsType;
    requiredLeatherCount: number;
    baseSteeringResponsePrecisionPercent: number;
    baseMouthJerkDampingPercent: number;
}

export interface ActiveReinsBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: ReinsBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseReins {
    reinsId: string;
    recipeType: ReinsRecipeType;
    finalSteeringResponsePrecisionPercent: number;
    finalMouthJerkDampingPercent: number;
    reinsStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherReinsType;
    remainingProvidedLeathers: RawLeatherReinsType[];
    craftedEpochMs: number;
}

export const REINS_BENCH_CATALOG: Record<ReinsBenchType, ReinsBenchData> = {
    ELDER_REINS_BENCH: { benchType: "ELDER_REINS_BENCH", maxDurability: 100, leathercraftPower: 36, baseSuccessRatePercent: 88, reinsStabilityBonusPercent: 15 },
    RUNIC_OAK_REINS_RIG: { benchType: "RUNIC_OAK_REINS_RIG", maxDurability: 220, leathercraftPower: 80, baseSuccessRatePercent: 95, reinsStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_REINS_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_REINS_SANCTUM", maxDurability: 380, leathercraftPower: 144, baseSuccessRatePercent: 99, reinsStabilityBonusPercent: 40 },
};

export const REINS_RECIPE_CATALOG: Record<ReinsRecipeType, ReinsRecipeData> = {
    NOVICE_EXPEDITION_REINS: { recipeType: "NOVICE_EXPEDITION_REINS", requiredLeatherType: "TANNED_BULL_GUIDE_REIN_STRAP", requiredLeatherCount: 2, baseSteeringResponsePrecisionPercent: 28, baseMouthJerkDampingPercent: 18 },
    WARMASTER_MITHRIL_REINFORCED_REINS: { recipeType: "WARMASTER_MITHRIL_REINFORCED_REINS", requiredLeatherType: "TEMPERED_MITHRIL_BIT_COUPLING", requiredLeatherCount: 2, baseSteeringResponsePrecisionPercent: 57, baseMouthJerkDampingPercent: 37 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_SNAFFLE_PAD", requiredLeatherCount: 2, baseSteeringResponsePrecisionPercent: 88, baseMouthJerkDampingPercent: 68 },
};

export class AncientRunicLeatherHorseReinsBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(REINS_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(REINS_BENCH_CATALOG).map(b => b.reinsStabilityBonusPercent));

    /**
     * Constructs an active horse reins bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: ReinsBenchType): ActiveReinsBench {
        const data = REINS_BENCH_CATALOG[benchType] ?? REINS_BENCH_CATALOG.ELDER_REINS_BENCH;
        return {
            benchId: `reins_bench_${crypto.randomUUID()}`,
            leatherworkerPlayerId,
            benchType: data.benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Safely samples a crypto-secure pseudorandom float strictly in [0, 1).
     */
    public static sampleSecureUnitRoll(): number {
        return crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
    }

    /**
     * Crafts horse reins with upfront material deduction and immutable bench cloning.
     */
    public static craftReins(
        bench: ActiveReinsBench,
        recipeType: ReinsRecipeType,
        providedLeathers: RawLeatherReinsType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; reins?: CraftedHorseReins; updatedBench?: ActiveReinsBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherReinsType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse reins bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = REINS_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = REINS_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse reins recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedLeathers)) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: [], reason: "Invalid leathers array." };
        }

        // Count matching leather materials
        const matchingCount = providedLeathers.filter(l => l === recipe.requiredLeatherType).length;
        if (matchingCount < recipe.requiredLeatherCount) {
            return {
                success: false,
                updatedBench: { ...bench },
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Insufficient rein straps/couplings: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
            };
        }

        // Create updated bench clone
        const updatedBench = { ...bench };

        // Deduct durability on clone
        updatedBench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (updatedBench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            updatedBench.currentDurability = Math.max(0, updatedBench.currentDurability);
            updatedBench.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remainingProvidedLeathers: RawLeatherReinsType[] = [];
        let deducted = 0;
        for (const item of providedLeathers) {
            if (deducted < recipe.requiredLeatherCount && item === recipe.requiredLeatherType) {
                deducted++;
            } else {
                remainingProvidedLeathers.push(item);
            }
        }

        const safeCraftRoll = craftRoll !== undefined && Number.isFinite(craftRoll) ? Math.min(Math.max(craftRoll, 0), 1) : this.sampleSecureUnitRoll();
        const successThreshold = benchData.baseSuccessRatePercent / 100;

        if (safeCraftRoll > successThreshold) {
            return {
                success: false,
                updatedBench,
                remainingDurability: updatedBench.currentDurability,
                remainingProvidedLeathers,
                reason: `Bit coupling slipped during high-tensile reins stitching (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.reinsStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const reinsStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (reinsStabilityPercent / 100) * 0.4;
        const finalSteeringResponsePrecisionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseSteeringResponsePrecisionPercent * qualityMultiplier)));
        const finalMouthJerkDampingPercent = Math.min(100, Math.max(0, Math.round(recipe.baseMouthJerkDampingPercent * qualityMultiplier)));

        const reins: CraftedHorseReins = {
            reinsId: `reins_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalSteeringResponsePrecisionPercent,
            finalMouthJerkDampingPercent,
            reinsStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            reins,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse reins bench instance.
     */
    public static maintainBench(bench: ActiveReinsBench, repairAmount: number): ActiveReinsBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
