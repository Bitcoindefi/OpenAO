import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Throatlash Bench, Mithril Tracheal Arch Rig & Celestial Valkyrie Throatlatch Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian throatlash and gular arch crafting benches (Elder Throatlash Bench, Runic Oak Throatlash Rig, Celestial Void Valkyrie Throatlash Sanctum),
 * raw tanned bull gular straps, tempered mithril tracheal arches and astral throatlatch pads,
 * novice expedition throatlashes and sovereign valkyrie throatlash recipes,
 * independent steed bridle retention security ratings and gular choke relief ratings,
 * calibrated clamped throatlash stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse throatlash bench maintenance routines.
 */

export type ThroatlashBenchType = "ELDER_THROATLASH_BENCH" | "RUNIC_OAK_THROATLASH_RIG" | "CELESTIAL_VOID_VALKYRIE_THROATLASH_SANCTUM";
export type RawLeatherThroatlashType = "TANNED_BULL_GULAR_STRAP" | "TEMPERED_MITHRIL_TRACHEAL_ARCH" | "CELESTIAL_VOID_ASTRAL_THROATLATCH_PAD";
export type ThroatlashRecipeType = "NOVICE_EXPEDITION_THROATLASH" | "WARMASTER_MITHRIL_REINFORCED_THROATLASH" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLASH";

export interface ThroatlashBenchData {
    benchType: ThroatlashBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    throatlashStabilityBonusPercent: number;
}

export interface ThroatlashRecipeData {
    recipeType: ThroatlashRecipeType;
    requiredLeatherType: RawLeatherThroatlashType;
    requiredLeatherCount: number;
    baseBridleRetentionSecurityPercent: number;
    baseGularChokeReliefPercent: number;
}

export interface ActiveThroatlashBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: ThroatlashBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseThroatlash {
    throatlashId: string;
    recipeType: ThroatlashRecipeType;
    finalBridleRetentionSecurityPercent: number;
    finalGularChokeReliefPercent: number;
    throatlashStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherThroatlashType;
    remainingProvidedLeathers: RawLeatherThroatlashType[];
    craftedEpochMs: number;
}

export const THROATLASH_BENCH_CATALOG: Record<ThroatlashBenchType, ThroatlashBenchData> = {
    ELDER_THROATLASH_BENCH: { benchType: "ELDER_THROATLASH_BENCH", maxDurability: 100, leathercraftPower: 36, baseSuccessRatePercent: 88, throatlashStabilityBonusPercent: 15 },
    RUNIC_OAK_THROATLASH_RIG: { benchType: "RUNIC_OAK_THROATLASH_RIG", maxDurability: 220, leathercraftPower: 80, baseSuccessRatePercent: 95, throatlashStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_THROATLASH_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_THROATLASH_SANCTUM", maxDurability: 380, leathercraftPower: 144, baseSuccessRatePercent: 99, throatlashStabilityBonusPercent: 40 },
};

export const THROATLASH_RECIPE_CATALOG: Record<ThroatlashRecipeType, ThroatlashRecipeData> = {
    NOVICE_EXPEDITION_THROATLASH: { recipeType: "NOVICE_EXPEDITION_THROATLASH", requiredLeatherType: "TANNED_BULL_GULAR_STRAP", requiredLeatherCount: 2, baseBridleRetentionSecurityPercent: 28, baseGularChokeReliefPercent: 18 },
    WARMASTER_MITHRIL_REINFORCED_THROATLASH: { recipeType: "WARMASTER_MITHRIL_REINFORCED_THROATLASH", requiredLeatherType: "TEMPERED_MITHRIL_TRACHEAL_ARCH", requiredLeatherCount: 2, baseBridleRetentionSecurityPercent: 57, baseGularChokeReliefPercent: 37 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLASH: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLASH", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_THROATLATCH_PAD", requiredLeatherCount: 2, baseBridleRetentionSecurityPercent: 88, baseGularChokeReliefPercent: 68 },
};

export class AncientRunicLeatherHorseThroatlashBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(THROATLASH_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(THROATLASH_BENCH_CATALOG).map(b => b.throatlashStabilityBonusPercent));

    /**
     * Constructs an active horse throatlash bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: ThroatlashBenchType): ActiveThroatlashBench {
        const data = THROATLASH_BENCH_CATALOG[benchType] ?? THROATLASH_BENCH_CATALOG.ELDER_THROATLASH_BENCH;
        return {
            benchId: `throatlash_bench_${crypto.randomUUID()}`,
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
     * Crafts horse throatlashes with upfront material deduction and immutable bench cloning.
     */
    public static craftThroatlash(
        bench: ActiveThroatlashBench,
        recipeType: ThroatlashRecipeType,
        providedLeathers: RawLeatherThroatlashType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; throatlash?: CraftedHorseThroatlash; updatedBench?: ActiveThroatlashBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherThroatlashType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse throatlash bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = THROATLASH_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = THROATLASH_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse throatlash recipe: ${String(recipeType)}` };
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
                reason: `Insufficient gular straps/arches: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherThroatlashType[] = [];
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
                reason: `Tracheal arch buckle slipped during jawline tensioning (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.throatlashStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const throatlashStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (throatlashStabilityPercent / 100) * 0.4;
        const finalBridleRetentionSecurityPercent = Math.min(100, Math.max(0, Math.round(recipe.baseBridleRetentionSecurityPercent * qualityMultiplier)));
        const finalGularChokeReliefPercent = Math.min(100, Math.max(0, Math.round(recipe.baseGularChokeReliefPercent * qualityMultiplier)));

        const throatlash: CraftedHorseThroatlash = {
            throatlashId: `throatlash_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalBridleRetentionSecurityPercent,
            finalGularChokeReliefPercent,
            throatlashStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            throatlash,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse throatlash bench instance.
     */
    public static maintainBench(bench: ActiveThroatlashBench, repairAmount: number): ActiveThroatlashBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
