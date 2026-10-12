import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Fetlock Boot Bench, Mithril Ankle Stud Rig & Celestial Valkyrie Fetlock Boot Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian fetlock boot and brushing ankle guard crafting benches (Elder Fetlock Boot Bench, Runic Oak Fetlock Boot Rig, Celestial Void Valkyrie Fetlock Boot Sanctum),
 * raw tanned bull fetlock shields, tempered mithril ankle studs and astral sesamoid linings,
 * novice expedition fetlock boots and sovereign aerial fetlock boot recipes,
 * independent steed brushing impact absorption ratings and joint hyperextension support ratings,
 * calibrated clamped fetlock boot stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse fetlock boot bench maintenance routines.
 */

export type FetlockBootBenchType = "ELDER_FETLOCK_BOOT_BENCH" | "RUNIC_OAK_FETLOCK_BOOT_RIG" | "CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM";
export type RawLeatherFetlockBootType = "TANNED_BULL_FETLOCK_SHIELD" | "TEMPERED_MITHRIL_ANKLE_STUD" | "CELESTIAL_VOID_ASTRAL_SESAMOID_LINING";
export type FetlockBootRecipeType = "NOVICE_EXPEDITION_FETLOCK_BOOT" | "WARMASTER_MITHRIL_REINFORCED_FETLOCK_BOOT" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOT";

export interface FetlockBootBenchData {
    benchType: FetlockBootBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    fetlockBootStabilityBonusPercent: number;
}

export interface FetlockBootRecipeData {
    recipeType: FetlockBootRecipeType;
    requiredLeatherType: RawLeatherFetlockBootType;
    requiredLeatherCount: number;
    baseBrushingImpactAbsorptionPercent: number;
    baseJointHyperextensionSupportPercent: number;
}

export interface ActiveFetlockBootBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: FetlockBootBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseFetlockBoot {
    bootId: string;
    recipeType: FetlockBootRecipeType;
    finalBrushingImpactAbsorptionPercent: number;
    finalJointHyperextensionSupportPercent: number;
    fetlockBootStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherFetlockBootType;
    remainingProvidedLeathers: RawLeatherFetlockBootType[];
    craftedEpochMs: number;
}

export const FETLOCK_BOOT_BENCH_CATALOG: Record<FetlockBootBenchType, FetlockBootBenchData> = {
    ELDER_FETLOCK_BOOT_BENCH: { benchType: "ELDER_FETLOCK_BOOT_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, fetlockBootStabilityBonusPercent: 14 },
    RUNIC_OAK_FETLOCK_BOOT_RIG: { benchType: "RUNIC_OAK_FETLOCK_BOOT_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, fetlockBootStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, fetlockBootStabilityBonusPercent: 40 },
};

export const FETLOCK_BOOT_RECIPE_CATALOG: Record<FetlockBootRecipeType, FetlockBootRecipeData> = {
    NOVICE_EXPEDITION_FETLOCK_BOOT: { recipeType: "NOVICE_EXPEDITION_FETLOCK_BOOT", requiredLeatherType: "TANNED_BULL_FETLOCK_SHIELD", requiredLeatherCount: 2, baseBrushingImpactAbsorptionPercent: 24, baseJointHyperextensionSupportPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_FETLOCK_BOOT: { recipeType: "WARMASTER_MITHRIL_REINFORCED_FETLOCK_BOOT", requiredLeatherType: "TEMPERED_MITHRIL_ANKLE_STUD", requiredLeatherCount: 2, baseBrushingImpactAbsorptionPercent: 50, baseJointHyperextensionSupportPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOT: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOT", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_SESAMOID_LINING", requiredLeatherCount: 2, baseBrushingImpactAbsorptionPercent: 84, baseJointHyperextensionSupportPercent: 64 },
};

export class AncientRunicLeatherHorseFetlockBootBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(FETLOCK_BOOT_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(FETLOCK_BOOT_BENCH_CATALOG).map(b => b.fetlockBootStabilityBonusPercent));

    /**
     * Constructs an active horse fetlock boot bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: FetlockBootBenchType): ActiveFetlockBootBench {
        const data = FETLOCK_BOOT_BENCH_CATALOG[benchType] ?? FETLOCK_BOOT_BENCH_CATALOG.ELDER_FETLOCK_BOOT_BENCH;
        return {
            benchId: `fetlock_boot_bench_${crypto.randomUUID()}`,
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
     * Crafts horse fetlock boots with upfront material deduction and immutable bench cloning.
     */
    public static craftFetlockBoot(
        bench: ActiveFetlockBootBench,
        recipeType: FetlockBootRecipeType,
        providedLeathers: RawLeatherFetlockBootType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; fetlockBoot?: CraftedHorseFetlockBoot; updatedBench?: ActiveFetlockBootBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherFetlockBootType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse fetlock boot bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = FETLOCK_BOOT_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = FETLOCK_BOOT_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse fetlock boot recipe: ${String(recipeType)}` };
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
                reason: `Insufficient fetlock shields/studs: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherFetlockBootType[] = [];
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
                reason: `Ankle contour slipped during stud riveting (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.fetlockBootStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const fetlockBootStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (fetlockBootStabilityPercent / 100) * 0.4;
        const finalBrushingImpactAbsorptionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseBrushingImpactAbsorptionPercent * qualityMultiplier)));
        const finalJointHyperextensionSupportPercent = Math.min(100, Math.max(0, Math.round(recipe.baseJointHyperextensionSupportPercent * qualityMultiplier)));

        const fetlockBoot: CraftedHorseFetlockBoot = {
            bootId: `fetlock_boot_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalBrushingImpactAbsorptionPercent,
            finalJointHyperextensionSupportPercent,
            fetlockBootStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            fetlockBoot,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse fetlock boot bench instance.
     */
    public static maintainBench(bench: ActiveFetlockBootBench, repairAmount: number): ActiveFetlockBootBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
