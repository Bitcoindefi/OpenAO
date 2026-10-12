import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Checkrein Bench, Mithril Bearing Hook Rig & Celestial Valkyrie Checkrein Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian checkrein and bearing rein crafting benches (Elder Checkrein Bench, Runic Oak Checkrein Rig, Celestial Void Valkyrie Checkrein Sanctum),
 * raw tanned bull checkrein straps, tempered mithril bearing hook fixtures and astral checkrein cords,
 * novice expedition checkreins and sovereign aerial checkrein recipes,
 * independent steed head elevation control ratings and neck fatigue mitigation ratings,
 * calibrated clamped checkrein stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse checkrein bench maintenance routines.
 */

export type CheckreinBenchType = "ELDER_CHECKREIN_BENCH" | "RUNIC_OAK_CHECKREIN_RIG" | "CELESTIAL_VOID_VALKYRIE_CHECKREIN_SANCTUM";
export type RawLeatherCheckreinType = "TANNED_BULL_CHECKREIN_STRAP" | "TEMPERED_MITHRIL_BEARING_HOOK" | "CELESTIAL_VOID_ASTRAL_CHECKREIN_CORD";
export type CheckreinRecipeType = "NOVICE_EXPEDITION_CHECKREIN" | "WARMASTER_MITHRIL_REINFORCED_CHECKREIN" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHECKREIN";

export interface CheckreinBenchData {
    benchType: CheckreinBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    checkreinStabilityBonusPercent: number;
}

export interface CheckreinRecipeData {
    recipeType: CheckreinRecipeType;
    requiredLeatherType: RawLeatherCheckreinType;
    requiredLeatherCount: number;
    baseHeadElevationControlPercent: number;
    baseNeckFatigueMitigationPercent: number;
}

export interface ActiveCheckreinBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CheckreinBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseCheckrein {
    checkreinId: string;
    recipeType: CheckreinRecipeType;
    finalHeadElevationControlPercent: number;
    finalNeckFatigueMitigationPercent: number;
    checkreinStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCheckreinType;
    remainingProvidedLeathers: RawLeatherCheckreinType[];
    craftedEpochMs: number;
}

export const CHECKREIN_BENCH_CATALOG: Record<CheckreinBenchType, CheckreinBenchData> = {
    ELDER_CHECKREIN_BENCH: { benchType: "ELDER_CHECKREIN_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, checkreinStabilityBonusPercent: 14 },
    RUNIC_OAK_CHECKREIN_RIG: { benchType: "RUNIC_OAK_CHECKREIN_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, checkreinStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CHECKREIN_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CHECKREIN_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, checkreinStabilityBonusPercent: 40 },
};

export const CHECKREIN_RECIPE_CATALOG: Record<CheckreinRecipeType, CheckreinRecipeData> = {
    NOVICE_EXPEDITION_CHECKREIN: { recipeType: "NOVICE_EXPEDITION_CHECKREIN", requiredLeatherType: "TANNED_BULL_CHECKREIN_STRAP", requiredLeatherCount: 2, baseHeadElevationControlPercent: 24, baseNeckFatigueMitigationPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_CHECKREIN: { recipeType: "WARMASTER_MITHRIL_REINFORCED_CHECKREIN", requiredLeatherType: "TEMPERED_MITHRIL_BEARING_HOOK", requiredLeatherCount: 2, baseHeadElevationControlPercent: 50, baseNeckFatigueMitigationPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHECKREIN: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHECKREIN", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CHECKREIN_CORD", requiredLeatherCount: 2, baseHeadElevationControlPercent: 84, baseNeckFatigueMitigationPercent: 64 },
};

export class AncientRunicLeatherHorseCheckreinBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(CHECKREIN_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(CHECKREIN_BENCH_CATALOG).map(b => b.checkreinStabilityBonusPercent));

    /**
     * Constructs an active horse checkrein bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: CheckreinBenchType): ActiveCheckreinBench {
        const data = CHECKREIN_BENCH_CATALOG[benchType] ?? CHECKREIN_BENCH_CATALOG.ELDER_CHECKREIN_BENCH;
        return {
            benchId: `checkrein_bench_${crypto.randomUUID()}`,
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
     * Crafts horse checkrein rigging with upfront material deduction and immutable bench cloning.
     */
    public static craftCheckrein(
        bench: ActiveCheckreinBench,
        recipeType: CheckreinRecipeType,
        providedLeathers: RawLeatherCheckreinType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; checkrein?: CraftedHorseCheckrein; updatedBench?: ActiveCheckreinBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCheckreinType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse checkrein bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CHECKREIN_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CHECKREIN_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse checkrein recipe: ${String(recipeType)}` };
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
                reason: `Insufficient checkrein straps/bearing hooks: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherCheckreinType[] = [];
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
                reason: `Bearing hook slipped during tensioning (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.checkreinStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const checkreinStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (checkreinStabilityPercent / 100) * 0.4;
        const finalHeadElevationControlPercent = Math.min(100, Math.max(0, Math.round(recipe.baseHeadElevationControlPercent * qualityMultiplier)));
        const finalNeckFatigueMitigationPercent = Math.min(100, Math.max(0, Math.round(recipe.baseNeckFatigueMitigationPercent * qualityMultiplier)));

        const checkrein: CraftedHorseCheckrein = {
            checkreinId: `checkrein_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalHeadElevationControlPercent,
            finalNeckFatigueMitigationPercent,
            checkreinStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            checkrein,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse checkrein bench instance.
     */
    public static maintainBench(bench: ActiveCheckreinBench, repairAmount: number): ActiveCheckreinBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
