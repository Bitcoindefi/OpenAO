import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Shadow Blinders Bench, Mithril Cheek Plate Rig & Celestial Valkyrie Blinders Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian shadow blinders and winker cup crafting benches (Elder Blinders Bench, Runic Oak Blinders Rig, Celestial Void Valkyrie Blinders Sanctum),
 * raw tanned bull blinder cups, tempered mithril cheek plates and astral winker shrouds,
 * novice expedition blinders and sovereign aerial blinders recipes,
 * independent steed shadow focus ratings and peripheral ambush deflection ratings,
 * calibrated clamped gaze fixation stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse blinders bench maintenance routines.
 */

export type BlindersBenchType = "ELDER_BLINDERS_BENCH" | "RUNIC_OAK_BLINDERS_RIG" | "CELESTIAL_VOID_VALKYRIE_BLINDERS_SANCTUM";
export type RawLeatherBlindersType = "TANNED_BULL_BLINDER_CUP" | "TEMPERED_MITHRIL_CHEEK_PLATE" | "CELESTIAL_VOID_ASTRAL_WINKER_SHROUD";
export type BlindersRecipeType = "NOVICE_EXPEDITION_BLINDERS" | "WARMASTER_MITHRIL_REINFORCED_BLINDERS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BLINDERS";

export interface BlindersBenchData {
    benchType: BlindersBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    blindersStabilityBonusPercent: number;
}

export interface BlindersRecipeData {
    recipeType: BlindersRecipeType;
    requiredLeatherType: RawLeatherBlindersType;
    requiredLeatherCount: number;
    baseShadowFocusPercent: number;
    basePeripheralDeflectionPercent: number;
}

export interface ActiveBlindersBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BlindersBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseBlinders {
    blindersId: string;
    recipeType: BlindersRecipeType;
    finalShadowFocusPercent: number;
    finalPeripheralDeflectionPercent: number;
    blindersStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBlindersType;
    remainingProvidedLeathers: RawLeatherBlindersType[];
    craftedEpochMs: number;
}

export const BLINDERS_BENCH_CATALOG: Record<BlindersBenchType, BlindersBenchData> = {
    ELDER_BLINDERS_BENCH: { benchType: "ELDER_BLINDERS_BENCH", maxDurability: 90, leathercraftPower: 28, baseSuccessRatePercent: 86, blindersStabilityBonusPercent: 12 },
    RUNIC_OAK_BLINDERS_RIG: { benchType: "RUNIC_OAK_BLINDERS_RIG", maxDurability: 195, leathercraftPower: 70, baseSuccessRatePercent: 93, blindersStabilityBonusPercent: 22 },
    CELESTIAL_VOID_VALKYRIE_BLINDERS_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_BLINDERS_SANCTUM", maxDurability: 340, leathercraftPower: 125, baseSuccessRatePercent: 99, blindersStabilityBonusPercent: 38 },
};

export const BLINDERS_RECIPE_CATALOG: Record<BlindersRecipeType, BlindersRecipeData> = {
    NOVICE_EXPEDITION_BLINDERS: { recipeType: "NOVICE_EXPEDITION_BLINDERS", requiredLeatherType: "TANNED_BULL_BLINDER_CUP", requiredLeatherCount: 2, baseShadowFocusPercent: 22, basePeripheralDeflectionPercent: 12 },
    WARMASTER_MITHRIL_REINFORCED_BLINDERS: { recipeType: "WARMASTER_MITHRIL_REINFORCED_BLINDERS", requiredLeatherType: "TEMPERED_MITHRIL_CHEEK_PLATE", requiredLeatherCount: 2, baseShadowFocusPercent: 48, basePeripheralDeflectionPercent: 28 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BLINDERS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BLINDERS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_WINKER_SHROUD", requiredLeatherCount: 2, baseShadowFocusPercent: 82, basePeripheralDeflectionPercent: 62 },
};

export class AncientRunicLeatherHorseBlindersBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(BLINDERS_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(BLINDERS_BENCH_CATALOG).map(b => b.blindersStabilityBonusPercent));

    /**
     * Constructs an active horse blinders bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: BlindersBenchType): ActiveBlindersBench {
        const data = BLINDERS_BENCH_CATALOG[benchType] ?? BLINDERS_BENCH_CATALOG.ELDER_BLINDERS_BENCH;
        return {
            benchId: `blinders_bench_${crypto.randomUUID()}`,
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
     * Crafts horse shadow blinders with upfront material deduction and immutable bench cloning.
     */
    public static craftBlinders(
        bench: ActiveBlindersBench,
        recipeType: BlindersRecipeType,
        providedLeathers: RawLeatherBlindersType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; blinders?: CraftedHorseBlinders; updatedBench?: ActiveBlindersBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBlindersType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse blinders bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BLINDERS_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BLINDERS_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse blinders recipe: ${String(recipeType)}` };
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
                reason: `Insufficient blinder cups/cheek plates: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherBlindersType[] = [];
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
                reason: `Blinder stitch slipped during shaping (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.blindersStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const blindersStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (blindersStabilityPercent / 100) * 0.4;
        const finalShadowFocusPercent = Math.min(100, Math.max(0, Math.round(recipe.baseShadowFocusPercent * qualityMultiplier)));
        const finalPeripheralDeflectionPercent = Math.min(100, Math.max(0, Math.round(recipe.basePeripheralDeflectionPercent * qualityMultiplier)));

        const blinders: CraftedHorseBlinders = {
            blindersId: `blinders_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalShadowFocusPercent,
            finalPeripheralDeflectionPercent,
            blindersStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            blinders,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse blinders bench instance.
     */
    public static maintainBench(bench: ActiveBlindersBench, repairAmount: number): ActiveBlindersBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
