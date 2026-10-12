import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Shin Guard Bench, Mithril Cannon Bone Splint Rig & Celestial Valkyrie Cannon Armor Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian shin guard and cannon bone protector crafting benches (Elder Shin Guard Bench, Runic Oak Shin Guard Rig, Celestial Void Valkyrie Shin Guard Sanctum),
 * raw tanned bull cannon straps, tempered mithril cannon bone splints and astral metacarpal pads,
 * novice expedition shin guards and sovereign valkyrie shin guard recipes,
 * independent steed cannon bone impact deflection ratings and flexor tendon shielding ratings,
 * calibrated clamped shin guard stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse shin guard bench maintenance routines.
 */

export type ShinGuardBenchType = "ELDER_SHIN_GUARD_BENCH" | "RUNIC_OAK_SHIN_GUARD_RIG" | "CELESTIAL_VOID_VALKYRIE_SHIN_GUARD_SANCTUM";
export type RawLeatherShinGuardType = "TANNED_BULL_CANNON_STRAP" | "TEMPERED_MITHRIL_CANNON_SPLINT" | "CELESTIAL_VOID_ASTRAL_METACARPAL_PAD";
export type ShinGuardRecipeType = "NOVICE_EXPEDITION_SHIN_GUARD" | "WARMASTER_MITHRIL_REINFORCED_SHIN_GUARD" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SHIN_GUARD";

export interface ShinGuardBenchData {
    benchType: ShinGuardBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    shinGuardStabilityBonusPercent: number;
}

export interface ShinGuardRecipeData {
    recipeType: ShinGuardRecipeType;
    requiredLeatherType: RawLeatherShinGuardType;
    requiredLeatherCount: number;
    baseCannonBoneImpactDeflectionPercent: number;
    baseFlexorTendonShieldingPercent: number;
}

export interface ActiveShinGuardBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: ShinGuardBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseShinGuard {
    shinGuardId: string;
    recipeType: ShinGuardRecipeType;
    finalCannonBoneImpactDeflectionPercent: number;
    finalFlexorTendonShieldingPercent: number;
    shinGuardStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherShinGuardType;
    remainingProvidedLeathers: RawLeatherShinGuardType[];
    craftedEpochMs: number;
}

export const SHIN_GUARD_BENCH_CATALOG: Record<ShinGuardBenchType, ShinGuardBenchData> = {
    ELDER_SHIN_GUARD_BENCH: { benchType: "ELDER_SHIN_GUARD_BENCH", maxDurability: 100, leathercraftPower: 34, baseSuccessRatePercent: 88, shinGuardStabilityBonusPercent: 15 },
    RUNIC_OAK_SHIN_GUARD_RIG: { benchType: "RUNIC_OAK_SHIN_GUARD_RIG", maxDurability: 215, leathercraftPower: 77, baseSuccessRatePercent: 95, shinGuardStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_SHIN_GUARD_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_SHIN_GUARD_SANCTUM", maxDurability: 370, leathercraftPower: 138, baseSuccessRatePercent: 99, shinGuardStabilityBonusPercent: 40 },
};

export const SHIN_GUARD_RECIPE_CATALOG: Record<ShinGuardRecipeType, ShinGuardRecipeData> = {
    NOVICE_EXPEDITION_SHIN_GUARD: { recipeType: "NOVICE_EXPEDITION_SHIN_GUARD", requiredLeatherType: "TANNED_BULL_CANNON_STRAP", requiredLeatherCount: 2, baseCannonBoneImpactDeflectionPercent: 27, baseFlexorTendonShieldingPercent: 17 },
    WARMASTER_MITHRIL_REINFORCED_SHIN_GUARD: { recipeType: "WARMASTER_MITHRIL_REINFORCED_SHIN_GUARD", requiredLeatherType: "TEMPERED_MITHRIL_CANNON_SPLINT", requiredLeatherCount: 2, baseCannonBoneImpactDeflectionPercent: 56, baseFlexorTendonShieldingPercent: 36 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SHIN_GUARD: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SHIN_GUARD", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_METACARPAL_PAD", requiredLeatherCount: 2, baseCannonBoneImpactDeflectionPercent: 87, baseFlexorTendonShieldingPercent: 67 },
};

export class AncientRunicLeatherHorseShinGuardBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(SHIN_GUARD_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(SHIN_GUARD_BENCH_CATALOG).map(b => b.shinGuardStabilityBonusPercent));

    /**
     * Constructs an active horse shin guard bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: ShinGuardBenchType): ActiveShinGuardBench {
        const data = SHIN_GUARD_BENCH_CATALOG[benchType] ?? SHIN_GUARD_BENCH_CATALOG.ELDER_SHIN_GUARD_BENCH;
        return {
            benchId: `shin_guard_bench_${crypto.randomUUID()}`,
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
     * Crafts horse shin guards with upfront material deduction and immutable bench cloning.
     */
    public static craftShinGuard(
        bench: ActiveShinGuardBench,
        recipeType: ShinGuardRecipeType,
        providedLeathers: RawLeatherShinGuardType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; shinGuard?: CraftedHorseShinGuard; updatedBench?: ActiveShinGuardBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherShinGuardType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse shin guard bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SHIN_GUARD_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SHIN_GUARD_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse shin guard recipe: ${String(recipeType)}` };
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
                reason: `Insufficient cannon straps/splints: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherShinGuardType[] = [];
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
                reason: `Cannon bone splint warped during high-heat tempering (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.shinGuardStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const shinGuardStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (shinGuardStabilityPercent / 100) * 0.4;
        const finalCannonBoneImpactDeflectionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseCannonBoneImpactDeflectionPercent * qualityMultiplier)));
        const finalFlexorTendonShieldingPercent = Math.min(100, Math.max(0, Math.round(recipe.baseFlexorTendonShieldingPercent * qualityMultiplier)));

        const shinGuard: CraftedHorseShinGuard = {
            shinGuardId: `shin_guard_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalCannonBoneImpactDeflectionPercent,
            finalFlexorTendonShieldingPercent,
            shinGuardStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            shinGuard,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse shin guard bench instance.
     */
    public static maintainBench(bench: ActiveShinGuardBench, repairAmount: number): ActiveShinGuardBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
