import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Breastplate Bench, Mithril Withers Yoke Rig & Celestial Valkyrie Breastplate Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian breastplate and withers yoke crafting benches (Elder Breastplate Bench, Runic Oak Breastplate Rig, Celestial Void Valkyrie Breastplate Sanctum),
 * raw tanned bull pectoral harness straps, tempered mithril withers yokes and astral clavicular pads,
 * novice expedition breastplates and sovereign valkyrie breastplate recipes,
 * independent steed saddle backward slip prevention ratings and chest impact deflection ratings,
 * calibrated clamped breastplate stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse breastplate bench maintenance routines.
 */

export type BreastplateBenchType = "ELDER_BREASTPLATE_BENCH" | "RUNIC_OAK_BREASTPLATE_RIG" | "CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM";
export type RawLeatherBreastplateType = "TANNED_BULL_PECTORAL_HARNESS_STRAP" | "TEMPERED_MITHRIL_WITHERS_YOKE" | "CELESTIAL_VOID_ASTRAL_CLAVICULAR_PAD";
export type BreastplateRecipeType = "NOVICE_EXPEDITION_BREASTPLATE" | "WARMASTER_MITHRIL_REINFORCED_BREASTPLATE" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE";

export interface BreastplateBenchData {
    benchType: BreastplateBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    breastplateStabilityBonusPercent: number;
}

export interface BreastplateRecipeData {
    recipeType: BreastplateRecipeType;
    requiredLeatherType: RawLeatherBreastplateType;
    requiredLeatherCount: number;
    baseSaddleBackwardSlipPreventionPercent: number;
    baseChestImpactDeflectionPercent: number;
}

export interface ActiveBreastplateBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BreastplateBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseBreastplate {
    breastplateId: string;
    recipeType: BreastplateRecipeType;
    finalSaddleBackwardSlipPreventionPercent: number;
    finalChestImpactDeflectionPercent: number;
    breastplateStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBreastplateType;
    remainingProvidedLeathers: RawLeatherBreastplateType[];
    craftedEpochMs: number;
}

export const BREASTPLATE_BENCH_CATALOG: Record<BreastplateBenchType, BreastplateBenchData> = {
    ELDER_BREASTPLATE_BENCH: { benchType: "ELDER_BREASTPLATE_BENCH", maxDurability: 98, leathercraftPower: 33, baseSuccessRatePercent: 88, breastplateStabilityBonusPercent: 15 },
    RUNIC_OAK_BREASTPLATE_RIG: { benchType: "RUNIC_OAK_BREASTPLATE_RIG", maxDurability: 212, leathercraftPower: 76, baseSuccessRatePercent: 95, breastplateStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM", maxDurability: 365, leathercraftPower: 136, baseSuccessRatePercent: 99, breastplateStabilityBonusPercent: 40 },
};

export const BREASTPLATE_RECIPE_CATALOG: Record<BreastplateRecipeType, BreastplateRecipeData> = {
    NOVICE_EXPEDITION_BREASTPLATE: { recipeType: "NOVICE_EXPEDITION_BREASTPLATE", requiredLeatherType: "TANNED_BULL_PECTORAL_HARNESS_STRAP", requiredLeatherCount: 2, baseSaddleBackwardSlipPreventionPercent: 26, baseChestImpactDeflectionPercent: 16 },
    WARMASTER_MITHRIL_REINFORCED_BREASTPLATE: { recipeType: "WARMASTER_MITHRIL_REINFORCED_BREASTPLATE", requiredLeatherType: "TEMPERED_MITHRIL_WITHERS_YOKE", requiredLeatherCount: 2, baseSaddleBackwardSlipPreventionPercent: 55, baseChestImpactDeflectionPercent: 35 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CLAVICULAR_PAD", requiredLeatherCount: 2, baseSaddleBackwardSlipPreventionPercent: 86, baseChestImpactDeflectionPercent: 66 },
};

export class AncientRunicLeatherHorseBreastplateBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(BREASTPLATE_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(BREASTPLATE_BENCH_CATALOG).map(b => b.breastplateStabilityBonusPercent));

    /**
     * Constructs an active horse breastplate bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: BreastplateBenchType): ActiveBreastplateBench {
        const data = BREASTPLATE_BENCH_CATALOG[benchType] ?? BREASTPLATE_BENCH_CATALOG.ELDER_BREASTPLATE_BENCH;
        return {
            benchId: `breastplate_bench_${crypto.randomUUID()}`,
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
     * Crafts horse breastplates with upfront material deduction and immutable bench cloning.
     */
    public static craftBreastplate(
        bench: ActiveBreastplateBench,
        recipeType: BreastplateRecipeType,
        providedLeathers: RawLeatherBreastplateType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; breastplate?: CraftedHorseBreastplate; updatedBench?: ActiveBreastplateBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBreastplateType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse breastplate bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BREASTPLATE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BREASTPLATE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse breastplate recipe: ${String(recipeType)}` };
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
                reason: `Insufficient pectoral straps/yokes: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherBreastplateType[] = [];
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
                reason: `Withers yoke buckle slipped during cross-shoulder tensioning (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.breastplateStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const breastplateStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (breastplateStabilityPercent / 100) * 0.4;
        const finalSaddleBackwardSlipPreventionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseSaddleBackwardSlipPreventionPercent * qualityMultiplier)));
        const finalChestImpactDeflectionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseChestImpactDeflectionPercent * qualityMultiplier)));

        const breastplate: CraftedHorseBreastplate = {
            breastplateId: `breastplate_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalSaddleBackwardSlipPreventionPercent,
            finalChestImpactDeflectionPercent,
            breastplateStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            breastplate,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse breastplate bench instance.
     */
    public static maintainBench(bench: ActiveBreastplateBench, repairAmount: number): ActiveBreastplateBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
