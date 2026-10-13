import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Browband Bench, Mithril Frontal Crest Rig & Celestial Valkyrie Browband Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian browband and frontal crest crafting benches (Elder Browband Bench, Runic Oak Browband Rig, Celestial Void Valkyrie Browband Sanctum),
 * raw tanned bull frontal straps, tempered mithril forehead crests and astral diadem pads,
 * novice expedition browbands and sovereign valkyrie browband recipes,
 * independent steed bridle lateral slip prevention ratings and frontal cranial protection ratings,
 * calibrated clamped browband stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse browband bench maintenance routines.
 */

export type BrowbandBenchType = "ELDER_BROWBAND_BENCH" | "RUNIC_OAK_BROWBAND_RIG" | "CELESTIAL_VOID_VALKYRIE_BROWBAND_SANCTUM";
export type RawLeatherBrowbandType = "TANNED_BULL_FRONTAL_STRAP" | "TEMPERED_MITHRIL_FOREHEAD_CREST" | "CELESTIAL_VOID_ASTRAL_DIADEM_PAD";
export type BrowbandRecipeType = "NOVICE_EXPEDITION_BROWBAND" | "WARMASTER_MITHRIL_REINFORCED_BROWBAND" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND";

export interface BrowbandBenchData {
    benchType: BrowbandBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    browbandStabilityBonusPercent: number;
}

export interface BrowbandRecipeData {
    recipeType: BrowbandRecipeType;
    requiredLeatherType: RawLeatherBrowbandType;
    requiredLeatherCount: number;
    baseBridleLateralSlipPreventionPercent: number;
    baseFrontalCranialProtectionPercent: number;
}

export interface ActiveBrowbandBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BrowbandBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseBrowband {
    browbandId: string;
    recipeType: BrowbandRecipeType;
    finalBridleLateralSlipPreventionPercent: number;
    finalFrontalCranialProtectionPercent: number;
    browbandStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBrowbandType;
    remainingProvidedLeathers: RawLeatherBrowbandType[];
    craftedEpochMs: number;
}

export const BROWBAND_BENCH_CATALOG: Record<BrowbandBenchType, BrowbandBenchData> = {
    ELDER_BROWBAND_BENCH: { benchType: "ELDER_BROWBAND_BENCH", maxDurability: 100, leathercraftPower: 35, baseSuccessRatePercent: 88, browbandStabilityBonusPercent: 15 },
    RUNIC_OAK_BROWBAND_RIG: { benchType: "RUNIC_OAK_BROWBAND_RIG", maxDurability: 220, leathercraftPower: 79, baseSuccessRatePercent: 95, browbandStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_BROWBAND_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_BROWBAND_SANCTUM", maxDurability: 380, leathercraftPower: 142, baseSuccessRatePercent: 99, browbandStabilityBonusPercent: 40 },
};

export const BROWBAND_RECIPE_CATALOG: Record<BrowbandRecipeType, BrowbandRecipeData> = {
    NOVICE_EXPEDITION_BROWBAND: { recipeType: "NOVICE_EXPEDITION_BROWBAND", requiredLeatherType: "TANNED_BULL_FRONTAL_STRAP", requiredLeatherCount: 2, baseBridleLateralSlipPreventionPercent: 28, baseFrontalCranialProtectionPercent: 18 },
    WARMASTER_MITHRIL_REINFORCED_BROWBAND: { recipeType: "WARMASTER_MITHRIL_REINFORCED_BROWBAND", requiredLeatherType: "TEMPERED_MITHRIL_FOREHEAD_CREST", requiredLeatherCount: 2, baseBridleLateralSlipPreventionPercent: 57, baseFrontalCranialProtectionPercent: 37 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_DIADEM_PAD", requiredLeatherCount: 2, baseBridleLateralSlipPreventionPercent: 88, baseFrontalCranialProtectionPercent: 68 },
};

export class AncientRunicLeatherHorseBrowbandBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(BROWBAND_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(BROWBAND_BENCH_CATALOG).map(b => b.browbandStabilityBonusPercent));

    /**
     * Constructs an active horse browband bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: BrowbandBenchType): ActiveBrowbandBench {
        const data = BROWBAND_BENCH_CATALOG[benchType] ?? BROWBAND_BENCH_CATALOG.ELDER_BROWBAND_BENCH;
        return {
            benchId: `browband_bench_${crypto.randomUUID()}`,
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
     * Crafts horse browbands with upfront material deduction and immutable bench cloning.
     */
    public static craftBrowband(
        bench: ActiveBrowbandBench,
        recipeType: BrowbandRecipeType,
        providedLeathers: RawLeatherBrowbandType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; browband?: CraftedHorseBrowband; updatedBench?: ActiveBrowbandBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBrowbandType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse browband bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BROWBAND_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BROWBAND_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse browband recipe: ${String(recipeType)}` };
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
                reason: `Insufficient frontal straps/crests: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherBrowbandType[] = [];
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
                reason: `Forehead crest buckle slipped during forehead centering (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.browbandStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const browbandStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (browbandStabilityPercent / 100) * 0.4;
        const finalBridleLateralSlipPreventionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseBridleLateralSlipPreventionPercent * qualityMultiplier)));
        const finalFrontalCranialProtectionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseFrontalCranialProtectionPercent * qualityMultiplier)));

        const browband: CraftedHorseBrowband = {
            browbandId: `browband_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalBridleLateralSlipPreventionPercent,
            finalFrontalCranialProtectionPercent,
            browbandStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            browband,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse browband bench instance.
     */
    public static maintainBench(bench: ActiveBrowbandBench, repairAmount: number): ActiveBrowbandBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
