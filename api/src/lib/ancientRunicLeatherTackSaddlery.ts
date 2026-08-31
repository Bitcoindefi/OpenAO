import crypto from "node:crypto";

/**
 * Ancient Runic Beast Tack, Mount Barding & Saddlery Crafting Engine for OpenAO MMORPG.
 * Simulates saddler benches and stitching ponies (Oak Stitching Pony, Runic Iron Saddler Bench, Celestial Void Mount Barding Station),
 * cured beast leathers (Supple Direwolf Leather, Heavy Behemoth Hide, Celestial Dragonscale Leather),
 * mount tack & barding recipes (Cavalry Courier Saddle, Armored Warbeast Barding, Celestial Dragonlord Caparison),
 * independent craftsmanship ratings (0% to 100%), mounted speed and stamina drain reduction scaling,
 * upfront leather inventory deduction on all craft attempts, cached static catalog maxima, and saddler bench maintenance.
 */

export type SaddlerBenchType = "OAK_STITCHING_PONY" | "RUNIC_IRON_SADDLER_BENCH" | "CELESTIAL_VOID_MOUNT_BARDING_STATION";
export type CuredBeastLeatherType = "SUPPLE_DIREWOLF_LEATHER" | "HEAVY_BEHEMOTH_HIDE" | "CELESTIAL_DRAGONSCALE_LEATHER";
export type MountTackRecipeType = "CAVALRY_COURIER_SADDLE" | "ARMORED_WARBEAST_BARDING" | "CELESTIAL_DRAGONLORD_CAPARISON";

export interface SaddlerBenchData {
    benchType: SaddlerBenchType;
    maxDurability: number;
    saddleryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    mountBondBonusPercent: number;
}

export interface MountTackRecipeData {
    recipeType: MountTackRecipeType;
    requiredLeatherType: CuredBeastLeatherType;
    requiredLeatherCount: number;
    baseMountedSpeedPercent: number;
    baseStaminaDrainReductionPercent: number;
}

export interface ActiveSaddlerBench {
    benchId: string;
    saddlerPlayerId: string;
    benchType: SaddlerBenchType;
    currentDurability: number;
    maxDurability: number;
    saddleryPower: number;
    isFunctional: boolean;
}

export interface CraftedMountTack {
    tackId: string;
    recipeType: MountTackRecipeType;
    finalMountedSpeedPercent: number;
    finalStaminaDrainReductionPercent: number;
    craftsmanshipPercent: number; // 0 to 100
    consumedLeatherCount: number;
    consumedLeatherType: CuredBeastLeatherType;
    remainingProvidedLeathers: CuredBeastLeatherType[];
    craftedEpochMs: number;
}

export const SADDLER_CATALOG: Record<SaddlerBenchType, SaddlerBenchData> = {
    OAK_STITCHING_PONY: { benchType: "OAK_STITCHING_PONY", maxDurability: 75, saddleryPower: 25, baseSuccessRatePercent: 85, mountBondBonusPercent: 10 },
    RUNIC_IRON_SADDLER_BENCH: { benchType: "RUNIC_IRON_SADDLER_BENCH", maxDurability: 170, saddleryPower: 65, baseSuccessRatePercent: 92, mountBondBonusPercent: 20 },
    CELESTIAL_VOID_MOUNT_BARDING_STATION: { benchType: "CELESTIAL_VOID_MOUNT_BARDING_STATION", maxDurability: 310, saddleryPower: 120, baseSuccessRatePercent: 99, mountBondBonusPercent: 35 },
};

export const TACK_RECIPE_CATALOG: Record<MountTackRecipeType, MountTackRecipeData> = {
    CAVALRY_COURIER_SADDLE: { recipeType: "CAVALRY_COURIER_SADDLE", requiredLeatherType: "SUPPLE_DIREWOLF_LEATHER", requiredLeatherCount: 2, baseMountedSpeedPercent: 25, baseStaminaDrainReductionPercent: 10 },
    ARMORED_WARBEAST_BARDING: { recipeType: "ARMORED_WARBEAST_BARDING", requiredLeatherType: "HEAVY_BEHEMOTH_HIDE", requiredLeatherCount: 2, baseMountedSpeedPercent: 55, baseStaminaDrainReductionPercent: 25 },
    CELESTIAL_DRAGONLORD_CAPARISON: { recipeType: "CELESTIAL_DRAGONLORD_CAPARISON", requiredLeatherType: "CELESTIAL_DRAGONSCALE_LEATHER", requiredLeatherCount: 2, baseMountedSpeedPercent: 120, baseStaminaDrainReductionPercent: 50 },
};

export class AncientRunicLeatherTackSaddleryEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SADDLER_CATALOG).map(s => s.saddleryPower), 1),
        maxBonus: Math.max(...Object.values(SADDLER_CATALOG).map(s => s.mountBondBonusPercent), 1),
    };

    /**
     * Constructs and initializes a saddler bench or stitching pony.
     */
    public static constructBench(
        saddlerPlayerId: string,
        benchType: SaddlerBenchType,
        currentEpochMs = Date.now()
    ): ActiveSaddlerBench {
        const data = SADDLER_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported saddler bench type: ${String(benchType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            benchId: `saddler_${benchType.toLowerCase()}_${uuid}`,
            saddlerPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            saddleryPower: data.saddleryPower,
            isFunctional: true,
        };
    }

    /**
     * Stitches cured beast leathers into cavalry courier saddles, warbeast barding, and dragonlord caparisons.
     */
    public static craftMountTack(
        bench: ActiveSaddlerBench,
        recipeType: MountTackRecipeType,
        providedLeathers: CuredBeastLeatherType[],
        craftRoll = Math.random(),
        craftsmanshipRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; tack?: CraftedMountTack; remainingDurability: number; remainingProvidedLeathers?: CuredBeastLeatherType[]; reason?: string } {
        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                remainingDurability: bench?.currentDurability ?? 0,
                reason: `Saddler bench is loose or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SADDLER_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, remainingDurability: bench.currentDurability, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = TACK_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: bench.currentDurability, reason: `Unknown mount tack recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedLeathers)) {
            return { success: false, remainingDurability: bench.currentDurability, reason: "Invalid leathers array." };
        }

        // Count matching leathers
        const matchingCount = providedLeathers.filter(l => l === recipe.requiredLeatherType).length;
        if (matchingCount < recipe.requiredLeatherCount) {
            return {
                success: false,
                remainingDurability: bench.currentDurability,
                reason: `Insufficient leathers: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        bench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            bench.currentDurability = Math.max(0, bench.currentDurability);
            bench.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedLeathers];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredLeatherCount; i--) {
            if (remaining[i] === recipe.requiredLeatherType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > benchData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: remaining,
                reason: `Stitching thread snapped: heavy needle frayed saddle tree binding, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent craftsmanship score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeCraftsmanshipRoll = Number.isFinite(craftsmanshipRoll) ? Math.max(0, Math.min(1, craftsmanshipRoll)) : Math.random();
        const powerRatio = Math.min(1.0, bench.saddleryPower / maxPower);
        const bonusPoints = (benchData.mountBondBonusPercent / maxBonus) * 20;
        const craftsmanshipScore = Math.max(0, Math.min(100, Math.round(
            (safeCraftsmanshipRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((craftsmanshipScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSpeed = Math.round(recipe.baseMountedSpeedPercent * qualityMultiplier);
        const finalStamina = Math.round(recipe.baseStaminaDrainReductionPercent * qualityMultiplier);

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const tack: CraftedMountTack = {
            tackId: `tack_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalMountedSpeedPercent: finalSpeed,
            finalStaminaDrainReductionPercent: finalStamina,
            craftsmanshipPercent: craftsmanshipScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            tack,
            remainingDurability: bench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Rethers clamp jaws and maintains saddler bench.
     */
    public static maintainBench(
        bench: ActiveSaddlerBench,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!bench) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        bench.currentDurability = Math.min(bench.maxDurability, bench.currentDurability + amt);
        bench.isFunctional = bench.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: bench.currentDurability,
            isFunctional: bench.isFunctional,
        };
    }
}