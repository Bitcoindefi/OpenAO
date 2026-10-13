import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Fetlock Boot Bench, Mithril Sesamoid Shell Rig & Celestial Valkyrie Fetlock Boot Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian fetlock boot, sesamoid bone and hind ankle impact protection crafting benches (Elder Fetlock Boot Bench, Runic Oak Fetlock Boot Rig, Celestial Void Valkyrie Fetlock Boot Sanctum),
 * raw tanned ram fetlock cuffs, tempered mithril sesamoid shells and celestial void astral ankle cores,
 * novice expedition, warmaster and sovereign valkyrie fetlock boot recipes,
 * steed fetlock joint impact absorption ratings and sesamoid bone shielding ratings,
 * calibrated clamped fetlock boot stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse fetlock boot bench maintenance routines.
 */

export type FetlockBootBenchType = "ELDER_FETLOCK_BOOT_BENCH" | "RUNIC_OAK_FETLOCK_BOOT_RIG" | "CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM";
export type RawLeatherFetlockBootType = "TANNED_RAM_FETLOCK_CUFF" | "TEMPERED_MITHRIL_SESAMOID_SHELL" | "CELESTIAL_VOID_ASTRAL_ANKLE_CORE";
export type FetlockBootRecipeType = "NOVICE_EXPEDITION_FETLOCK_BOOTS" | "WARMASTER_MITHRIL_FETLOCK_BOOTS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOTS";

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
    baseFetlockJointImpactAbsorptionPercent: number;
    baseSesamoidBoneShieldingPercent: number;
}

export interface ActiveFetlockBootBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: FetlockBootBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseFetlockBoots {
    bootId: string;
    recipeType: FetlockBootRecipeType;
    finalFetlockJointImpactAbsorptionPercent: number;
    finalSesamoidBoneShieldingPercent: number;
    bootStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherFetlockBootType;
    remainingProvidedLeathers: RawLeatherFetlockBootType[];
    craftedEpochMs: number;
}

export const FETLOCK_BOOT_BENCH_CATALOG: Record<FetlockBootBenchType, FetlockBootBenchData> = {
    ELDER_FETLOCK_BOOT_BENCH: { benchType: "ELDER_FETLOCK_BOOT_BENCH", maxDurability: 100, leathercraftPower: 35, baseSuccessRatePercent: 88, fetlockBootStabilityBonusPercent: 15 },
    RUNIC_OAK_FETLOCK_BOOT_RIG: { benchType: "RUNIC_OAK_FETLOCK_BOOT_RIG", maxDurability: 220, leathercraftPower: 80, baseSuccessRatePercent: 95, fetlockBootStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_FETLOCK_BOOT_SANCTUM", maxDurability: 380, leathercraftPower: 145, baseSuccessRatePercent: 99, fetlockBootStabilityBonusPercent: 40 },
};

export const FETLOCK_BOOT_RECIPE_CATALOG: Record<FetlockBootRecipeType, FetlockBootRecipeData> = {
    NOVICE_EXPEDITION_FETLOCK_BOOTS: { recipeType: "NOVICE_EXPEDITION_FETLOCK_BOOTS", requiredLeatherType: "TANNED_RAM_FETLOCK_CUFF", requiredLeatherCount: 2, baseFetlockJointImpactAbsorptionPercent: 28, baseSesamoidBoneShieldingPercent: 18 },
    WARMASTER_MITHRIL_FETLOCK_BOOTS: { recipeType: "WARMASTER_MITHRIL_FETLOCK_BOOTS", requiredLeatherType: "TEMPERED_MITHRIL_SESAMOID_SHELL", requiredLeatherCount: 2, baseFetlockJointImpactAbsorptionPercent: 58, baseSesamoidBoneShieldingPercent: 37 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOTS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FETLOCK_BOOTS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_ANKLE_CORE", requiredLeatherCount: 2, baseFetlockJointImpactAbsorptionPercent: 89, baseSesamoidBoneShieldingPercent: 68 },
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
    public static craftFetlockBoots(
        bench: ActiveFetlockBootBench,
        recipeType: FetlockBootRecipeType,
        providedLeathers: RawLeatherFetlockBootType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; boots?: CraftedHorseFetlockBoots; updatedBench?: ActiveFetlockBootBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherFetlockBootType[]; reason?: string } {
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
                reason: `Insufficient fetlock boot materials: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Sesamoid shell seam misaligned during pressure molding (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.fetlockBootStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const bootStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (bootStabilityPercent / 100) * 0.4;
        const finalFetlockJointImpactAbsorptionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseFetlockJointImpactAbsorptionPercent * qualityMultiplier)));
        const finalSesamoidBoneShieldingPercent = Math.min(100, Math.max(0, Math.round(recipe.baseSesamoidBoneShieldingPercent * qualityMultiplier)));

        const boots: CraftedHorseFetlockBoots = {
            bootId: `fetlock_boot_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalFetlockJointImpactAbsorptionPercent,
            finalSesamoidBoneShieldingPercent,
            bootStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            boots,
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
