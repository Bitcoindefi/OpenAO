import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Noseband Bench, Mithril Nasal Bridge Splint Rig & Celestial Valkyrie Cavesson Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian noseband and cavesson crafting benches (Elder Noseband Bench, Runic Oak Noseband Rig, Celestial Void Valkyrie Noseband Sanctum),
 * raw tanned bull nasal straps, tempered mithril nasal bridge splints and astral cavesson pads,
 * novice expedition nosebands and sovereign valkyrie noseband recipes,
 * independent steed mandibular control bonus ratings and nasal impact cushioning ratings,
 * calibrated clamped noseband stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse noseband bench maintenance routines.
 */

export type NosebandBenchType = "ELDER_NOSEBAND_BENCH" | "RUNIC_OAK_NOSEBAND_RIG" | "CELESTIAL_VOID_VALKYRIE_NOSEBAND_SANCTUM";
export type RawLeatherNosebandType = "TANNED_BULL_NASAL_STRAP" | "TEMPERED_MITHRIL_NASAL_BRIDGE_SPLINT" | "CELESTIAL_VOID_ASTRAL_CAVESSON_PAD";
export type NosebandRecipeType = "NOVICE_EXPEDITION_NOSEBAND" | "WARMASTER_MITHRIL_REINFORCED_NOSEBAND" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND";

export interface NosebandBenchData {
    benchType: NosebandBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    nosebandStabilityBonusPercent: number;
}

export interface NosebandRecipeData {
    recipeType: NosebandRecipeType;
    requiredLeatherType: RawLeatherNosebandType;
    requiredLeatherCount: number;
    baseMandibularControlBonusPercent: number;
    baseNasalImpactCushioningPercent: number;
}

export interface ActiveNosebandBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: NosebandBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseNoseband {
    nosebandId: string;
    recipeType: NosebandRecipeType;
    finalMandibularControlBonusPercent: number;
    finalNasalImpactCushioningPercent: number;
    nosebandStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherNosebandType;
    remainingProvidedLeathers: RawLeatherNosebandType[];
    craftedEpochMs: number;
}

export const NOSEBAND_BENCH_CATALOG: Record<NosebandBenchType, NosebandBenchData> = {
    ELDER_NOSEBAND_BENCH: { benchType: "ELDER_NOSEBAND_BENCH", maxDurability: 100, leathercraftPower: 35, baseSuccessRatePercent: 88, nosebandStabilityBonusPercent: 15 },
    RUNIC_OAK_NOSEBAND_RIG: { benchType: "RUNIC_OAK_NOSEBAND_RIG", maxDurability: 218, leathercraftPower: 78, baseSuccessRatePercent: 95, nosebandStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_NOSEBAND_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_NOSEBAND_SANCTUM", maxDurability: 375, leathercraftPower: 140, baseSuccessRatePercent: 99, nosebandStabilityBonusPercent: 40 },
};

export const NOSEBAND_RECIPE_CATALOG: Record<NosebandRecipeType, NosebandRecipeData> = {
    NOVICE_EXPEDITION_NOSEBAND: { recipeType: "NOVICE_EXPEDITION_NOSEBAND", requiredLeatherType: "TANNED_BULL_NASAL_STRAP", requiredLeatherCount: 2, baseMandibularControlBonusPercent: 27, baseNasalImpactCushioningPercent: 17 },
    WARMASTER_MITHRIL_REINFORCED_NOSEBAND: { recipeType: "WARMASTER_MITHRIL_REINFORCED_NOSEBAND", requiredLeatherType: "TEMPERED_MITHRIL_NASAL_BRIDGE_SPLINT", requiredLeatherCount: 2, baseMandibularControlBonusPercent: 56, baseNasalImpactCushioningPercent: 36 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CAVESSON_PAD", requiredLeatherCount: 2, baseMandibularControlBonusPercent: 88, baseNasalImpactCushioningPercent: 68 },
};

export class AncientRunicLeatherHorseNosebandBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(NOSEBAND_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(NOSEBAND_BENCH_CATALOG).map(b => b.nosebandStabilityBonusPercent));

    /**
     * Constructs an active horse noseband bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: NosebandBenchType): ActiveNosebandBench {
        const data = NOSEBAND_BENCH_CATALOG[benchType] ?? NOSEBAND_BENCH_CATALOG.ELDER_NOSEBAND_BENCH;
        return {
            benchId: `noseband_bench_${crypto.randomUUID()}`,
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
     * Crafts horse nosebands with upfront material deduction and immutable bench cloning.
     */
    public static craftNoseband(
        bench: ActiveNosebandBench,
        recipeType: NosebandRecipeType,
        providedLeathers: RawLeatherNosebandType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; noseband?: CraftedHorseNoseband; updatedBench?: ActiveNosebandBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherNosebandType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse noseband bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = NOSEBAND_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = NOSEBAND_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse noseband recipe: ${String(recipeType)}` };
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
                reason: `Insufficient nasal straps/splints: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherNosebandType[] = [];
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
                reason: `Nasal bridge splint slipped during delicate cavesson stitching (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.nosebandStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const nosebandStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (nosebandStabilityPercent / 100) * 0.4;
        const finalMandibularControlBonusPercent = Math.min(100, Math.max(0, Math.round(recipe.baseMandibularControlBonusPercent * qualityMultiplier)));
        const finalNasalImpactCushioningPercent = Math.min(100, Math.max(0, Math.round(recipe.baseNasalImpactCushioningPercent * qualityMultiplier)));

        const noseband: CraftedHorseNoseband = {
            nosebandId: `noseband_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalMandibularControlBonusPercent,
            finalNasalImpactCushioningPercent,
            nosebandStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            noseband,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse noseband bench instance.
     */
    public static maintainBench(bench: ActiveNosebandBench, repairAmount: number): ActiveNosebandBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
