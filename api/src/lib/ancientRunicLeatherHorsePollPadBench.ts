import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Poll Pad Bench, Mithril Cranial Plate Rig & Celestial Valkyrie Poll Pad Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian poll pad and crown cushion crafting benches (Elder Poll Pad Bench, Runic Oak Poll Pad Rig, Celestial Void Valkyrie Poll Pad Sanctum),
 * raw tanned bull poll cushions, tempered mithril cranial plates and astral poll fleeces,
 * novice expedition poll pads and sovereign aerial poll pad recipes,
 * independent steed cranial shock absorption ratings and poll pressure dispersion ratings,
 * calibrated clamped poll pad stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse poll pad bench maintenance routines.
 */

export type PollPadBenchType = "ELDER_POLL_PAD_BENCH" | "RUNIC_OAK_POLL_PAD_RIG" | "CELESTIAL_VOID_VALKYRIE_POLL_PAD_SANCTUM";
export type RawLeatherPollPadType = "TANNED_BULL_POLL_CUSHION" | "TEMPERED_MITHRIL_CRANIAL_PLATE" | "CELESTIAL_VOID_ASTRAL_POLL_FLEECE";
export type PollPadRecipeType = "NOVICE_EXPEDITION_POLL_PAD" | "WARMASTER_MITHRIL_REINFORCED_POLL_PAD" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POLL_PAD";

export interface PollPadBenchData {
    benchType: PollPadBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    pollPadStabilityBonusPercent: number;
}

export interface PollPadRecipeData {
    recipeType: PollPadRecipeType;
    requiredLeatherType: RawLeatherPollPadType;
    requiredLeatherCount: number;
    baseCranialShockAbsorptionPercent: number;
    basePollPressureDispersionPercent: number;
}

export interface ActivePollPadBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: PollPadBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorsePollPad {
    padId: string;
    recipeType: PollPadRecipeType;
    finalCranialShockAbsorptionPercent: number;
    finalPollPressureDispersionPercent: number;
    pollPadStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherPollPadType;
    remainingProvidedLeathers: RawLeatherPollPadType[];
    craftedEpochMs: number;
}

export const POLL_PAD_BENCH_CATALOG: Record<PollPadBenchType, PollPadBenchData> = {
    ELDER_POLL_PAD_BENCH: { benchType: "ELDER_POLL_PAD_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, pollPadStabilityBonusPercent: 14 },
    RUNIC_OAK_POLL_PAD_RIG: { benchType: "RUNIC_OAK_POLL_PAD_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, pollPadStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_POLL_PAD_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_POLL_PAD_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, pollPadStabilityBonusPercent: 40 },
};

export const POLL_PAD_RECIPE_CATALOG: Record<PollPadRecipeType, PollPadRecipeData> = {
    NOVICE_EXPEDITION_POLL_PAD: { recipeType: "NOVICE_EXPEDITION_POLL_PAD", requiredLeatherType: "TANNED_BULL_POLL_CUSHION", requiredLeatherCount: 2, baseCranialShockAbsorptionPercent: 24, basePollPressureDispersionPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_POLL_PAD: { recipeType: "WARMASTER_MITHRIL_REINFORCED_POLL_PAD", requiredLeatherType: "TEMPERED_MITHRIL_CRANIAL_PLATE", requiredLeatherCount: 2, baseCranialShockAbsorptionPercent: 50, basePollPressureDispersionPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POLL_PAD: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POLL_PAD", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_POLL_FLEECE", requiredLeatherCount: 2, baseCranialShockAbsorptionPercent: 84, basePollPressureDispersionPercent: 64 },
};

export class AncientRunicLeatherHorsePollPadBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(POLL_PAD_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(POLL_PAD_BENCH_CATALOG).map(b => b.pollPadStabilityBonusPercent));

    /**
     * Constructs an active horse poll pad bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: PollPadBenchType): ActivePollPadBench {
        const data = POLL_PAD_BENCH_CATALOG[benchType] ?? POLL_PAD_BENCH_CATALOG.ELDER_POLL_PAD_BENCH;
        return {
            benchId: `poll_pad_bench_${crypto.randomUUID()}`,
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
     * Crafts a horse poll pad cushion with upfront material deduction and immutable bench cloning.
     */
    public static craftPollPad(
        bench: ActivePollPadBench,
        recipeType: PollPadRecipeType,
        providedLeathers: RawLeatherPollPadType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; pollPad?: CraftedHorsePollPad; updatedBench?: ActivePollPadBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherPollPadType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse poll pad bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = POLL_PAD_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = POLL_PAD_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse poll pad recipe: ${String(recipeType)}` };
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
                reason: `Insufficient poll cushions/plates: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherPollPadType[] = [];
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
                reason: `Cranial stitch slipped during cushioning alignment (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.pollPadStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const pollPadStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (pollPadStabilityPercent / 100) * 0.4;
        const finalCranialShockAbsorptionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseCranialShockAbsorptionPercent * qualityMultiplier)));
        const finalPollPressureDispersionPercent = Math.min(100, Math.max(0, Math.round(recipe.basePollPressureDispersionPercent * qualityMultiplier)));

        const pollPad: CraftedHorsePollPad = {
            padId: `poll_pad_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalCranialShockAbsorptionPercent,
            finalPollPressureDispersionPercent,
            pollPadStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            pollPad,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse poll pad bench instance.
     */
    public static maintainBench(bench: ActivePollPadBench, repairAmount: number): ActivePollPadBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
