import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Hock Boot Bench, Mithril Tarsal Hinge Rig & Celestial Valkyrie Hock Boot Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian hock boot and tarsal protector crafting benches (Elder Hock Boot Bench, Runic Oak Hock Boot Rig, Celestial Void Valkyrie Hock Boot Sanctum),
 * raw tanned bull hock cups, tempered mithril tarsal hinges and astral calcaneus pads,
 * novice expedition hock boots and sovereign aerial hock boot recipes,
 * independent steed tarsal impact absorption ratings and hock flexion support ratings,
 * calibrated clamped hock boot stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse hock boot bench maintenance routines.
 */

export type HockBootBenchType = "ELDER_HOCK_BOOT_BENCH" | "RUNIC_OAK_HOCK_BOOT_RIG" | "CELESTIAL_VOID_VALKYRIE_HOCK_BOOT_SANCTUM";
export type RawLeatherHockBootType = "TANNED_BULL_HOCK_CUP" | "TEMPERED_MITHRIL_TARSAL_HINGE" | "CELESTIAL_VOID_ASTRAL_CALCANEUS_PAD";
export type HockBootRecipeType = "NOVICE_EXPEDITION_HOCK_BOOT" | "WARMASTER_MITHRIL_REINFORCED_HOCK_BOOT" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HOCK_BOOT";

export interface HockBootBenchData {
    benchType: HockBootBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    hockBootStabilityBonusPercent: number;
}

export interface HockBootRecipeData {
    recipeType: HockBootRecipeType;
    requiredLeatherType: RawLeatherHockBootType;
    requiredLeatherCount: number;
    baseTarsalImpactAbsorptionPercent: number;
    baseHockFlexionSupportPercent: number;
}

export interface ActiveHockBootBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: HockBootBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseHockBoot {
    bootId: string;
    recipeType: HockBootRecipeType;
    finalTarsalImpactAbsorptionPercent: number;
    finalHockFlexionSupportPercent: number;
    hockBootStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherHockBootType;
    remainingProvidedLeathers: RawLeatherHockBootType[];
    craftedEpochMs: number;
}

export const HOCK_BOOT_BENCH_CATALOG: Record<HockBootBenchType, HockBootBenchData> = {
    ELDER_HOCK_BOOT_BENCH: { benchType: "ELDER_HOCK_BOOT_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, hockBootStabilityBonusPercent: 14 },
    RUNIC_OAK_HOCK_BOOT_RIG: { benchType: "RUNIC_OAK_HOCK_BOOT_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, hockBootStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_HOCK_BOOT_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_HOCK_BOOT_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, hockBootStabilityBonusPercent: 40 },
};

export const HOCK_BOOT_RECIPE_CATALOG: Record<HockBootRecipeType, HockBootRecipeData> = {
    NOVICE_EXPEDITION_HOCK_BOOT: { recipeType: "NOVICE_EXPEDITION_HOCK_BOOT", requiredLeatherType: "TANNED_BULL_HOCK_CUP", requiredLeatherCount: 2, baseTarsalImpactAbsorptionPercent: 24, baseHockFlexionSupportPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_HOCK_BOOT: { recipeType: "WARMASTER_MITHRIL_REINFORCED_HOCK_BOOT", requiredLeatherType: "TEMPERED_MITHRIL_TARSAL_HINGE", requiredLeatherCount: 2, baseTarsalImpactAbsorptionPercent: 50, baseHockFlexionSupportPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HOCK_BOOT: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HOCK_BOOT", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CALCANEUS_PAD", requiredLeatherCount: 2, baseTarsalImpactAbsorptionPercent: 84, baseHockFlexionSupportPercent: 64 },
};

export class AncientRunicLeatherHorseHockBootBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(HOCK_BOOT_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(HOCK_BOOT_BENCH_CATALOG).map(b => b.hockBootStabilityBonusPercent));

    /**
     * Constructs an active horse hock boot bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: HockBootBenchType): ActiveHockBootBench {
        const data = HOCK_BOOT_BENCH_CATALOG[benchType] ?? HOCK_BOOT_BENCH_CATALOG.ELDER_HOCK_BOOT_BENCH;
        return {
            benchId: `hock_boot_bench_${crypto.randomUUID()}`,
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
     * Crafts horse hock boots with upfront material deduction and immutable bench cloning.
     */
    public static craftHockBoot(
        bench: ActiveHockBootBench,
        recipeType: HockBootRecipeType,
        providedLeathers: RawLeatherHockBootType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; hockBoot?: CraftedHorseHockBoot; updatedBench?: ActiveHockBootBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherHockBootType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse hock boot bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = HOCK_BOOT_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = HOCK_BOOT_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse hock boot recipe: ${String(recipeType)}` };
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
                reason: `Insufficient hock cups/hinges: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherHockBootType[] = [];
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
                reason: `Tarsal hinge slipped during articulated riveting (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.hockBootStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const hockBootStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (hockBootStabilityPercent / 100) * 0.4;
        const finalTarsalImpactAbsorptionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseTarsalImpactAbsorptionPercent * qualityMultiplier)));
        const finalHockFlexionSupportPercent = Math.min(100, Math.max(0, Math.round(recipe.baseHockFlexionSupportPercent * qualityMultiplier)));

        const hockBoot: CraftedHorseHockBoot = {
            bootId: `hock_boot_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalTarsalImpactAbsorptionPercent,
            finalHockFlexionSupportPercent,
            hockBootStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            hockBoot,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse hock boot bench instance.
     */
    public static maintainBench(bench: ActiveHockBootBench, repairAmount: number): ActiveHockBootBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
