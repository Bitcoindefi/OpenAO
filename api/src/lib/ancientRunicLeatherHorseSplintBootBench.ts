import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Splint Boot Bench, Mithril Tendon Plate Rig & Celestial Valkyrie Splint Boot Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian splint boot, cannon bone and flexor tendon strike protection crafting benches (Elder Splint Boot Bench, Runic Oak Splint Boot Rig, Celestial Void Valkyrie Splint Boot Sanctum),
 * raw tanned elk cannon straps, tempered mithril tendon plates and celestial void astral splint cores,
 * novice expedition, warmaster and sovereign valkyrie splint boot recipes,
 * steed splint bone impact absorption ratings and flexor tendon shielding ratings,
 * calibrated clamped splint boot stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse splint boot bench maintenance routines.
 */

export type SplintBootBenchType = "ELDER_SPLINT_BOOT_BENCH" | "RUNIC_OAK_SPLINT_BOOT_RIG" | "CELESTIAL_VOID_VALKYRIE_SPLINT_BOOT_SANCTUM";
export type RawLeatherSplintBootType = "TANNED_ELK_CANNON_STRAP" | "TEMPERED_MITHRIL_TENDON_PLATE" | "CELESTIAL_VOID_ASTRAL_SPLINT_CORE";
export type SplintBootRecipeType = "NOVICE_EXPEDITION_SPLINT_BOOTS" | "WARMASTER_MITHRIL_SPLINT_BOOTS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SPLINT_BOOTS";

export interface SplintBootBenchData {
    benchType: SplintBootBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    splintBootStabilityBonusPercent: number;
}

export interface SplintBootRecipeData {
    recipeType: SplintBootRecipeType;
    requiredLeatherType: RawLeatherSplintBootType;
    requiredLeatherCount: number;
    baseSplintBoneImpactAbsorptionPercent: number;
    baseFlexorTendonShieldingPercent: number;
}

export interface ActiveSplintBootBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: SplintBootBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseSplintBoots {
    bootId: string;
    recipeType: SplintBootRecipeType;
    finalSplintBoneImpactAbsorptionPercent: number;
    finalFlexorTendonShieldingPercent: number;
    bootStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherSplintBootType;
    remainingProvidedLeathers: RawLeatherSplintBootType[];
    craftedEpochMs: number;
}

export const SPLINT_BOOT_BENCH_CATALOG: Record<SplintBootBenchType, SplintBootBenchData> = {
    ELDER_SPLINT_BOOT_BENCH: { benchType: "ELDER_SPLINT_BOOT_BENCH", maxDurability: 100, leathercraftPower: 35, baseSuccessRatePercent: 88, splintBootStabilityBonusPercent: 15 },
    RUNIC_OAK_SPLINT_BOOT_RIG: { benchType: "RUNIC_OAK_SPLINT_BOOT_RIG", maxDurability: 220, leathercraftPower: 80, baseSuccessRatePercent: 95, splintBootStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_SPLINT_BOOT_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_SPLINT_BOOT_SANCTUM", maxDurability: 380, leathercraftPower: 145, baseSuccessRatePercent: 99, splintBootStabilityBonusPercent: 40 },
};

export const SPLINT_BOOT_RECIPE_CATALOG: Record<SplintBootRecipeType, SplintBootRecipeData> = {
    NOVICE_EXPEDITION_SPLINT_BOOTS: { recipeType: "NOVICE_EXPEDITION_SPLINT_BOOTS", requiredLeatherType: "TANNED_ELK_CANNON_STRAP", requiredLeatherCount: 2, baseSplintBoneImpactAbsorptionPercent: 28, baseFlexorTendonShieldingPercent: 18 },
    WARMASTER_MITHRIL_SPLINT_BOOTS: { recipeType: "WARMASTER_MITHRIL_SPLINT_BOOTS", requiredLeatherType: "TEMPERED_MITHRIL_TENDON_PLATE", requiredLeatherCount: 2, baseSplintBoneImpactAbsorptionPercent: 58, baseFlexorTendonShieldingPercent: 37 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SPLINT_BOOTS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SPLINT_BOOTS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_SPLINT_CORE", requiredLeatherCount: 2, baseSplintBoneImpactAbsorptionPercent: 89, baseFlexorTendonShieldingPercent: 68 },
};

export class AncientRunicLeatherHorseSplintBootBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(SPLINT_BOOT_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(SPLINT_BOOT_BENCH_CATALOG).map(b => b.splintBootStabilityBonusPercent));

    /**
     * Constructs an active horse splint boot bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: SplintBootBenchType): ActiveSplintBootBench {
        const data = SPLINT_BOOT_BENCH_CATALOG[benchType] ?? SPLINT_BOOT_BENCH_CATALOG.ELDER_SPLINT_BOOT_BENCH;
        return {
            benchId: `splint_boot_bench_${crypto.randomUUID()}`,
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
     * Crafts horse splint boots with upfront material deduction and immutable bench cloning.
     */
    public static craftSplintBoots(
        bench: ActiveSplintBootBench,
        recipeType: SplintBootRecipeType,
        providedLeathers: RawLeatherSplintBootType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; boots?: CraftedHorseSplintBoots; updatedBench?: ActiveSplintBootBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherSplintBootType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse splint boot bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SPLINT_BOOT_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SPLINT_BOOT_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse splint boot recipe: ${String(recipeType)}` };
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
                reason: `Insufficient splint boot materials: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherSplintBootType[] = [];
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
                reason: `Tendon plate rivets sheared during high-tension strapping (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.splintBootStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const bootStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (bootStabilityPercent / 100) * 0.4;
        const finalSplintBoneImpactAbsorptionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseSplintBoneImpactAbsorptionPercent * qualityMultiplier)));
        const finalFlexorTendonShieldingPercent = Math.min(100, Math.max(0, Math.round(recipe.baseFlexorTendonShieldingPercent * qualityMultiplier)));

        const boots: CraftedHorseSplintBoots = {
            bootId: `splint_boot_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalSplintBoneImpactAbsorptionPercent,
            finalFlexorTendonShieldingPercent,
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
     * Maintains and repairs a horse splint boot bench instance.
     */
    public static maintainBench(bench: ActiveSplintBootBench, repairAmount: number): ActiveSplintBootBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
