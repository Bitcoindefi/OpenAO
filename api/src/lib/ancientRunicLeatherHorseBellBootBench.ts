import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Bell Boot Bench, Mithril Bell Shell Rig & Celestial Valkyrie Bell Boot Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian bell boot and hoof bulb overreach protection crafting benches (Elder Bell Boot Bench, Runic Oak Bell Boot Rig, Celestial Void Valkyrie Bell Boot Sanctum),
 * raw tanned buffalo hoof collars, tempered mithril bell shells and celestial void astral impact rings,
 * novice expedition, warmaster and sovereign valkyrie bell boot recipes,
 * steed overreach impact deflection ratings and coronet bulb shielding ratings,
 * calibrated clamped bell boot stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse bell boot bench maintenance routines.
 */

export type BellBootBenchType = "ELDER_BELL_BOOT_BENCH" | "RUNIC_OAK_BELL_BOOT_RIG" | "CELESTIAL_VOID_VALKYRIE_BELL_BOOT_SANCTUM";
export type RawLeatherBellBootType = "TANNED_BUFFALO_HOOF_COLLAR" | "TEMPERED_MITHRIL_BELL_SHELL" | "CELESTIAL_VOID_ASTRAL_IMPACT_RING";
export type BellBootRecipeType = "NOVICE_EXPEDITION_BELL_BOOTS" | "WARMASTER_MITHRIL_BELL_BOOTS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BELL_BOOTS";

export interface BellBootBenchData {
    benchType: BellBootBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    bellBootStabilityBonusPercent: number;
}

export interface BellBootRecipeData {
    recipeType: BellBootRecipeType;
    requiredLeatherType: RawLeatherBellBootType;
    requiredLeatherCount: number;
    baseOverreachImpactDeflectionPercent: number;
    baseCoronetBulbShieldingPercent: number;
}

export interface ActiveBellBootBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BellBootBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseBellBoots {
    bootId: string;
    recipeType: BellBootRecipeType;
    finalOverreachImpactDeflectionPercent: number;
    finalCoronetBulbShieldingPercent: number;
    bootStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBellBootType;
    remainingProvidedLeathers: RawLeatherBellBootType[];
    craftedEpochMs: number;
}

export const BELL_BOOT_BENCH_CATALOG: Record<BellBootBenchType, BellBootBenchData> = {
    ELDER_BELL_BOOT_BENCH: { benchType: "ELDER_BELL_BOOT_BENCH", maxDurability: 100, leathercraftPower: 35, baseSuccessRatePercent: 88, bellBootStabilityBonusPercent: 15 },
    RUNIC_OAK_BELL_BOOT_RIG: { benchType: "RUNIC_OAK_BELL_BOOT_RIG", maxDurability: 220, leathercraftPower: 80, baseSuccessRatePercent: 95, bellBootStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_BELL_BOOT_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_BELL_BOOT_SANCTUM", maxDurability: 380, leathercraftPower: 145, baseSuccessRatePercent: 99, bellBootStabilityBonusPercent: 40 },
};

export const BELL_BOOT_RECIPE_CATALOG: Record<BellBootRecipeType, BellBootRecipeData> = {
    NOVICE_EXPEDITION_BELL_BOOTS: { recipeType: "NOVICE_EXPEDITION_BELL_BOOTS", requiredLeatherType: "TANNED_BUFFALO_HOOF_COLLAR", requiredLeatherCount: 2, baseOverreachImpactDeflectionPercent: 28, baseCoronetBulbShieldingPercent: 18 },
    WARMASTER_MITHRIL_BELL_BOOTS: { recipeType: "WARMASTER_MITHRIL_BELL_BOOTS", requiredLeatherType: "TEMPERED_MITHRIL_BELL_SHELL", requiredLeatherCount: 2, baseOverreachImpactDeflectionPercent: 58, baseCoronetBulbShieldingPercent: 37 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BELL_BOOTS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BELL_BOOTS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_IMPACT_RING", requiredLeatherCount: 2, baseOverreachImpactDeflectionPercent: 89, baseCoronetBulbShieldingPercent: 68 },
};

export class AncientRunicLeatherHorseBellBootBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(BELL_BOOT_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(BELL_BOOT_BENCH_CATALOG).map(b => b.bellBootStabilityBonusPercent));

    /**
     * Constructs an active horse bell boot bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: BellBootBenchType): ActiveBellBootBench {
        const data = BELL_BOOT_BENCH_CATALOG[benchType] ?? BELL_BOOT_BENCH_CATALOG.ELDER_BELL_BOOT_BENCH;
        return {
            benchId: `bell_boot_bench_${crypto.randomUUID()}`,
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
     * Crafts horse bell boots with upfront material deduction and immutable bench cloning.
     */
    public static craftBellBoots(
        bench: ActiveBellBootBench,
        recipeType: BellBootRecipeType,
        providedLeathers: RawLeatherBellBootType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; boots?: CraftedHorseBellBoots; updatedBench?: ActiveBellBootBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBellBootType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse bell boot bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BELL_BOOT_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BELL_BOOT_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse bell boot recipe: ${String(recipeType)}` };
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
                reason: `Insufficient bell boot materials: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherBellBootType[] = [];
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
                reason: `Hoof collar seam split during reinforced stitching (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.bellBootStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const bootStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (bootStabilityPercent / 100) * 0.4;
        const finalOverreachImpactDeflectionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseOverreachImpactDeflectionPercent * qualityMultiplier)));
        const finalCoronetBulbShieldingPercent = Math.min(100, Math.max(0, Math.round(recipe.baseCoronetBulbShieldingPercent * qualityMultiplier)));

        const boots: CraftedHorseBellBoots = {
            bootId: `bell_boot_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalOverreachImpactDeflectionPercent,
            finalCoronetBulbShieldingPercent,
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
     * Maintains and repairs a horse bell boot bench instance.
     */
    public static maintainBench(bench: ActiveBellBootBench, repairAmount: number): ActiveBellBootBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
