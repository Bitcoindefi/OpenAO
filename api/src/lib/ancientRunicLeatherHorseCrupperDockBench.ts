import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Crupper Dock Bench, Mithril Dock Buckle Rig & Celestial Valkyrie Crupper Dock Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian crupper dock crafting benches (Elder Crupper Dock Bench, Runic Oak Crupper Dock Rig, Celestial Void Valkyrie Crupper Dock Sanctum),
 * raw tanned bull dock rolls, tempered mithril dock buckle sets and astral dock fleeces,
 * novice expedition crupper docks and sovereign aerial crupper dock recipes,
 * independent steed tail chafing resistance ratings and saddle forward-slip prevention ratings,
 * calibrated clamped crupper dock stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse crupper dock bench maintenance routines.
 */

export type CrupperDockBenchType = "ELDER_CRUPPER_DOCK_BENCH" | "RUNIC_OAK_CRUPPER_DOCK_RIG" | "CELESTIAL_VOID_VALKYRIE_CRUPPER_DOCK_SANCTUM";
export type RawLeatherCrupperDockType = "TANNED_BULL_DOCK_ROLL" | "TEMPERED_MITHRIL_DOCK_BUCKLE" | "CELESTIAL_VOID_ASTRAL_DOCK_FLEECE";
export type CrupperDockRecipeType = "NOVICE_EXPEDITION_CRUPPER_DOCK" | "WARMASTER_MITHRIL_REINFORCED_CRUPPER_DOCK" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER_DOCK";

export interface CrupperDockBenchData {
    benchType: CrupperDockBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    crupperDockStabilityBonusPercent: number;
}

export interface CrupperDockRecipeData {
    recipeType: CrupperDockRecipeType;
    requiredLeatherType: RawLeatherCrupperDockType;
    requiredLeatherCount: number;
    baseTailChafingResistancePercent: number;
    baseSaddleForwardSlipPreventionPercent: number;
}

export interface ActiveCrupperDockBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CrupperDockBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseCrupperDock {
    dockId: string;
    recipeType: CrupperDockRecipeType;
    finalTailChafingResistancePercent: number;
    finalSaddleForwardSlipPreventionPercent: number;
    crupperDockStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCrupperDockType;
    remainingProvidedLeathers: RawLeatherCrupperDockType[];
    craftedEpochMs: number;
}

export const CRUPPER_DOCK_BENCH_CATALOG: Record<CrupperDockBenchType, CrupperDockBenchData> = {
    ELDER_CRUPPER_DOCK_BENCH: { benchType: "ELDER_CRUPPER_DOCK_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, crupperDockStabilityBonusPercent: 14 },
    RUNIC_OAK_CRUPPER_DOCK_RIG: { benchType: "RUNIC_OAK_CRUPPER_DOCK_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, crupperDockStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CRUPPER_DOCK_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CRUPPER_DOCK_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, crupperDockStabilityBonusPercent: 40 },
};

export const CRUPPER_DOCK_RECIPE_CATALOG: Record<CrupperDockRecipeType, CrupperDockRecipeData> = {
    NOVICE_EXPEDITION_CRUPPER_DOCK: { recipeType: "NOVICE_EXPEDITION_CRUPPER_DOCK", requiredLeatherType: "TANNED_BULL_DOCK_ROLL", requiredLeatherCount: 2, baseTailChafingResistancePercent: 24, baseSaddleForwardSlipPreventionPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_CRUPPER_DOCK: { recipeType: "WARMASTER_MITHRIL_REINFORCED_CRUPPER_DOCK", requiredLeatherType: "TEMPERED_MITHRIL_DOCK_BUCKLE", requiredLeatherCount: 2, baseTailChafingResistancePercent: 50, baseSaddleForwardSlipPreventionPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER_DOCK: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER_DOCK", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_DOCK_FLEECE", requiredLeatherCount: 2, baseTailChafingResistancePercent: 84, baseSaddleForwardSlipPreventionPercent: 64 },
};

export class AncientRunicLeatherHorseCrupperDockBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(CRUPPER_DOCK_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(CRUPPER_DOCK_BENCH_CATALOG).map(b => b.crupperDockStabilityBonusPercent));

    /**
     * Constructs an active horse crupper dock bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: CrupperDockBenchType): ActiveCrupperDockBench {
        const data = CRUPPER_DOCK_BENCH_CATALOG[benchType] ?? CRUPPER_DOCK_BENCH_CATALOG.ELDER_CRUPPER_DOCK_BENCH;
        return {
            benchId: `crupper_dock_bench_${crypto.randomUUID()}`,
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
     * Crafts a padded horse crupper dock with upfront material deduction and immutable bench cloning.
     */
    public static craftCrupperDock(
        bench: ActiveCrupperDockBench,
        recipeType: CrupperDockRecipeType,
        providedLeathers: RawLeatherCrupperDockType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; crupperDock?: CraftedHorseCrupperDock; updatedBench?: ActiveCrupperDockBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCrupperDockType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse crupper dock bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CRUPPER_DOCK_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CRUPPER_DOCK_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse crupper dock recipe: ${String(recipeType)}` };
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
                reason: `Insufficient dock rolls/buckles: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
        const remainingProvidedLeathers: RawLeatherCrupperDockType[] = [];
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
                reason: `Dock stitch slipped during padding insertion (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.crupperDockStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const crupperDockStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (crupperDockStabilityPercent / 100) * 0.4;
        const finalTailChafingResistancePercent = Math.min(100, Math.max(0, Math.round(recipe.baseTailChafingResistancePercent * qualityMultiplier)));
        const finalSaddleForwardSlipPreventionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseSaddleForwardSlipPreventionPercent * qualityMultiplier)));

        const crupperDock: CraftedHorseCrupperDock = {
            dockId: `crupper_dock_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalTailChafingResistancePercent,
            finalSaddleForwardSlipPreventionPercent,
            crupperDockStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            crupperDock,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse crupper dock bench instance.
     */
    public static maintainBench(bench: ActiveCrupperDockBench, repairAmount: number): ActiveCrupperDockBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}
