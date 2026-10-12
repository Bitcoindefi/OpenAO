import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Girth Bench, Mithril Sternum Plate Rig & Celestial Valkyrie Girth Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian girth and saddle retention crafting benches (Elder Girth Bench, Runic Oak Girth Rig, Celestial Void Valkyrie Girth Sanctum),
 * raw tanned bull ventral straps, tempered mithril sternum plates and astral pectoral pads,
 * novice expedition girths and sovereign valkyrie girth recipes,
 * independent steed saddle stability retention ratings and thoracic compression relief ratings,
 * calibrated clamped girth stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse girth bench maintenance routines.
 */

export type GirthBenchType = "ELDER_GIRTH_BENCH" | "RUNIC_OAK_GIRTH_RIG" | "CELESTIAL_VOID_VALKYRIE_GIRTH_SANCTUM";
export type RawLeatherGirthType = "TANNED_BULL_VENTRAL_STRAP" | "TEMPERED_MITHRIL_STERNUM_PLATE" | "CELESTIAL_VOID_ASTRAL_PECTORAL_PAD";
export type GirthRecipeType = "NOVICE_EXPEDITION_GIRTH" | "WARMASTER_MITHRIL_REINFORCED_GIRTH" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH";

export interface GirthBenchData {
    benchType: GirthBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    girthStabilityBonusPercent: number;
}

export interface GirthRecipeData {
    recipeType: GirthRecipeType;
    requiredLeatherType: RawLeatherGirthType;
    requiredLeatherCount: number;
    baseSaddleStabilityRetentionPercent: number;
    baseThoracicCompressionReliefPercent: number;
}

export interface ActiveGirthBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: GirthBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseGirth {
    girthId: string;
    recipeType: GirthRecipeType;
    finalSaddleStabilityRetentionPercent: number;
    finalThoracicCompressionReliefPercent: number;
    girthStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherGirthType;
    remainingProvidedLeathers: RawLeatherGirthType[];
    craftedEpochMs: number;
}

export const GIRTH_BENCH_CATALOG: Record<GirthBenchType, GirthBenchData> = {
    ELDER_GIRTH_BENCH: { benchType: "ELDER_GIRTH_BENCH", maxDurability: 98, leathercraftPower: 32, baseSuccessRatePercent: 88, girthStabilityBonusPercent: 15 },
    RUNIC_OAK_GIRTH_RIG: { benchType: "RUNIC_OAK_GIRTH_RIG", maxDurability: 210, leathercraftPower: 75, baseSuccessRatePercent: 95, girthStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_GIRTH_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_GIRTH_SANCTUM", maxDurability: 360, leathercraftPower: 135, baseSuccessRatePercent: 99, girthStabilityBonusPercent: 40 },
};

export const GIRTH_RECIPE_CATALOG: Record<GirthRecipeType, GirthRecipeData> = {
    NOVICE_EXPEDITION_GIRTH: { recipeType: "NOVICE_EXPEDITION_GIRTH", requiredLeatherType: "TANNED_BULL_VENTRAL_STRAP", requiredLeatherCount: 2, baseSaddleStabilityRetentionPercent: 26, baseThoracicCompressionReliefPercent: 16 },
    WARMASTER_MITHRIL_REINFORCED_GIRTH: { recipeType: "WARMASTER_MITHRIL_REINFORCED_GIRTH", requiredLeatherType: "TEMPERED_MITHRIL_STERNUM_PLATE", requiredLeatherCount: 2, baseSaddleStabilityRetentionPercent: 54, baseThoracicCompressionReliefPercent: 34 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_PECTORAL_PAD", requiredLeatherCount: 2, baseSaddleStabilityRetentionPercent: 86, baseThoracicCompressionReliefPercent: 66 },
};

export class AncientRunicLeatherHorseGirthBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(GIRTH_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(GIRTH_BENCH_CATALOG).map(b => b.girthStabilityBonusPercent));

    /**
     * Constructs an active horse girth bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: GirthBenchType): ActiveGirthBench {
        const data = GIRTH_BENCH_CATALOG[benchType] ?? GIRTH_BENCH_CATALOG.ELDER_GIRTH_BENCH;
        return {
            benchId: `girth_bench_${crypto.randomUUID()}`,
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
     * Crafts horse girths with upfront material deduction and immutable bench cloning.
     */
    public static craftGirth(
        bench: ActiveGirthBench,
        recipeType: GirthRecipeType,
        providedLeathers: RawLeatherGirthType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; girth?: CraftedHorseGirth; updatedBench?: ActiveGirthBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherGirthType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse girth bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = GIRTH_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = GIRTH_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse girth recipe: ${String(recipeType)}` };
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
                reason: `Insufficient ventral straps/plates: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherGirthType[] = [];
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
                reason: `Sternum buckle slipped during heavy tensile cinch tensioning (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.girthStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const girthStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (girthStabilityPercent / 100) * 0.4;
        const finalSaddleStabilityRetentionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseSaddleStabilityRetentionPercent * qualityMultiplier)));
        const finalThoracicCompressionReliefPercent = Math.min(100, Math.max(0, Math.round(recipe.baseThoracicCompressionReliefPercent * qualityMultiplier)));

        const girth: CraftedHorseGirth = {
            girthId: `girth_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalSaddleStabilityRetentionPercent,
            finalThoracicCompressionReliefPercent,
            girthStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            girth,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse girth bench instance.
     */
    public static maintainBench(bench: ActiveGirthBench, repairAmount: number): ActiveGirthBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
