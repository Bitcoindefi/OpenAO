import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Bit Guard Bench, Mithril Rimmed Guard Rig & Celestial Valkyrie Bit Guard Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian bit guard and mouth corner chafing protection crafting benches (Elder Bit Guard Bench, Runic Oak Bit Guard Rig, Celestial Void Valkyrie Bit Guard Sanctum),
 * raw tanned calf cheek discs, tempered mithril-rimmed guards and celestial void astral gel guards,
 * novice expedition, warmaster and sovereign valkyrie bit guard recipes,
 * steed cheek chafing mitigation ratings and bit stability ratings,
 * calibrated clamped bit guard stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse bit guard bench maintenance routines.
 */

export type BitGuardBenchType = "ELDER_BIT_GUARD_BENCH" | "RUNIC_OAK_BIT_GUARD_RIG" | "CELESTIAL_VOID_VALKYRIE_BIT_GUARD_SANCTUM";
export type RawLeatherBitGuardType = "TANNED_CALF_CHEEK_DISC" | "TEMPERED_MITHRIL_RIMMED_GUARD" | "CELESTIAL_VOID_ASTRAL_GEL_GUARD";
export type BitGuardRecipeType = "NOVICE_EXPEDITION_BIT_GUARDS" | "WARMASTER_MITHRIL_RIMMED_BIT_GUARDS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BIT_GUARDS";

export interface BitGuardBenchData {
    benchType: BitGuardBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    bitGuardStabilityBonusPercent: number;
}

export interface BitGuardRecipeData {
    recipeType: BitGuardRecipeType;
    requiredLeatherType: RawLeatherBitGuardType;
    requiredLeatherCount: number;
    baseCheekChafingMitigationPercent: number;
    baseBitStabilityPercent: number;
}

export interface ActiveBitGuardBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BitGuardBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseBitGuards {
    guardId: string;
    recipeType: BitGuardRecipeType;
    finalCheekChafingMitigationPercent: number;
    finalBitStabilityPercent: number;
    guardStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBitGuardType;
    remainingProvidedLeathers: RawLeatherBitGuardType[];
    craftedEpochMs: number;
}

export const BIT_GUARD_BENCH_CATALOG: Record<BitGuardBenchType, BitGuardBenchData> = {
    ELDER_BIT_GUARD_BENCH: { benchType: "ELDER_BIT_GUARD_BENCH", maxDurability: 100, leathercraftPower: 35, baseSuccessRatePercent: 88, bitGuardStabilityBonusPercent: 15 },
    RUNIC_OAK_BIT_GUARD_RIG: { benchType: "RUNIC_OAK_BIT_GUARD_RIG", maxDurability: 220, leathercraftPower: 80, baseSuccessRatePercent: 95, bitGuardStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_BIT_GUARD_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_BIT_GUARD_SANCTUM", maxDurability: 380, leathercraftPower: 145, baseSuccessRatePercent: 99, bitGuardStabilityBonusPercent: 40 },
};

export const BIT_GUARD_RECIPE_CATALOG: Record<BitGuardRecipeType, BitGuardRecipeData> = {
    NOVICE_EXPEDITION_BIT_GUARDS: { recipeType: "NOVICE_EXPEDITION_BIT_GUARDS", requiredLeatherType: "TANNED_CALF_CHEEK_DISC", requiredLeatherCount: 2, baseCheekChafingMitigationPercent: 27, baseBitStabilityPercent: 17 },
    WARMASTER_MITHRIL_RIMMED_BIT_GUARDS: { recipeType: "WARMASTER_MITHRIL_RIMMED_BIT_GUARDS", requiredLeatherType: "TEMPERED_MITHRIL_RIMMED_GUARD", requiredLeatherCount: 2, baseCheekChafingMitigationPercent: 58, baseBitStabilityPercent: 36 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BIT_GUARDS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BIT_GUARDS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_GEL_GUARD", requiredLeatherCount: 2, baseCheekChafingMitigationPercent: 89, baseBitStabilityPercent: 67 },
};

export class AncientRunicLeatherHorseBitGuardBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(BIT_GUARD_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(BIT_GUARD_BENCH_CATALOG).map(b => b.bitGuardStabilityBonusPercent));

    /**
     * Constructs an active horse bit guard bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: BitGuardBenchType): ActiveBitGuardBench {
        const data = BIT_GUARD_BENCH_CATALOG[benchType] ?? BIT_GUARD_BENCH_CATALOG.ELDER_BIT_GUARD_BENCH;
        return {
            benchId: `bit_guard_bench_${crypto.randomUUID()}`,
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
     * Crafts horse bit guards with upfront material deduction and immutable bench cloning.
     */
    public static craftBitGuards(
        bench: ActiveBitGuardBench,
        recipeType: BitGuardRecipeType,
        providedLeathers: RawLeatherBitGuardType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; guards?: CraftedHorseBitGuards; updatedBench?: ActiveBitGuardBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBitGuardType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse bit guard bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BIT_GUARD_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BIT_GUARD_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse bit guard recipe: ${String(recipeType)}` };
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
                reason: `Insufficient guard discs/pads: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherBitGuardType[] = [];
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
                reason: `Cheek disc edge curled during heat tempering (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.bitGuardStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const guardStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (guardStabilityPercent / 100) * 0.4;
        const finalCheekChafingMitigationPercent = Math.min(100, Math.max(0, Math.round(recipe.baseCheekChafingMitigationPercent * qualityMultiplier)));
        const finalBitStabilityPercent = Math.min(100, Math.max(0, Math.round(recipe.baseBitStabilityPercent * qualityMultiplier)));

        const guards: CraftedHorseBitGuards = {
            guardId: `guard_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalCheekChafingMitigationPercent,
            finalBitStabilityPercent,
            guardStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            guards,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse bit guard bench instance.
     */
    public static maintainBench(bench: ActiveBitGuardBench, repairAmount: number): ActiveBitGuardBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
