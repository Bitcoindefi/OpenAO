import crypto from "node:crypto";

/**
 * Ancient Runic Jewelry Gem Setting, Ring & Amulet Imbuing Engine for OpenAO MMORPG.
 * Simulates jeweler benches (Novice Goldsmith Anvil, Runic Mithril Jeweler Bench, Celestial Void Lapidary Altar),
 * cut gemstones (Flawless Ruby, Astral Sapphire, Void Star Diamond),
 * precious jewelry recipes (Ring of Pyroclastic Might, Amulet of Prismatic Barrier, Celestial Ring of Transcendence),
 * independent gem setting brilliance ratings (0% to 100%), attribute stat scaling,
 * gemstone inventory deduction, and bench maintenance.
 */

export type JewelerBenchType = "NOVICE_GOLDSMITH_ANVIL" | "RUNIC_MITHRIL_JEWELER_BENCH" | "CELESTIAL_VOID_LAPIDARY_ALTAR";
export type CutGemstoneType = "FLAWLESS_RUBY" | "ASTRAL_SAPPHIRE" | "VOID_STAR_DIAMOND";
export type PreciousJewelryRecipeType = "RING_OF_PYROCLASTIC_MIGHT" | "AMULET_OF_PRISMATIC_BARRIER" | "CELESTIAL_RING_OF_TRANSCENDENCE";

export interface JewelerBenchData {
    benchType: JewelerBenchType;
    maxDurability: number;
    jewelerPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    brillianceBonusPercent: number;
}

export interface PreciousJewelryRecipeData {
    recipeType: PreciousJewelryRecipeType;
    requiredGemType: CutGemstoneType;
    requiredGemCount: number;
    basePrimaryStatBonus: number;
    baseSecondaryStatBonus: number;
}

export interface ActiveJewelerBench {
    benchId: string;
    jewelerPlayerId: string;
    benchType: JewelerBenchType;
    currentDurability: number;
    maxDurability: number;
    jewelerPower: number;
    isFunctional: boolean;
}

export interface CraftedPreciousJewelry {
    jewelryId: string;
    recipeType: PreciousJewelryRecipeType;
    finalPrimaryStatBonus: number;
    finalSecondaryStatBonus: number;
    gemBrilliancePercent: number; // 0 to 100
    consumedGemCount: number;
    consumedGemType: CutGemstoneType;
    remainingProvidedGems: CutGemstoneType[];
    craftedEpochMs: number;
}

export const BENCH_CATALOG: Record<JewelerBenchType, JewelerBenchData> = {
    NOVICE_GOLDSMITH_ANVIL: { benchType: "NOVICE_GOLDSMITH_ANVIL", maxDurability: 75, jewelerPower: 25, baseSuccessRatePercent: 85, brillianceBonusPercent: 10 },
    RUNIC_MITHRIL_JEWELER_BENCH: { benchType: "RUNIC_MITHRIL_JEWELER_BENCH", maxDurability: 170, jewelerPower: 65, baseSuccessRatePercent: 92, brillianceBonusPercent: 20 },
    CELESTIAL_VOID_LAPIDARY_ALTAR: { benchType: "CELESTIAL_VOID_LAPIDARY_ALTAR", maxDurability: 310, jewelerPower: 120, baseSuccessRatePercent: 99, brillianceBonusPercent: 35 },
};

export const JEWELRY_RECIPE_CATALOG: Record<PreciousJewelryRecipeType, PreciousJewelryRecipeData> = {
    RING_OF_PYROCLASTIC_MIGHT: { recipeType: "RING_OF_PYROCLASTIC_MIGHT", requiredGemType: "FLAWLESS_RUBY", requiredGemCount: 2, basePrimaryStatBonus: 35, baseSecondaryStatBonus: 10 },
    AMULET_OF_PRISMATIC_BARRIER: { recipeType: "AMULET_OF_PRISMATIC_BARRIER", requiredGemType: "ASTRAL_SAPPHIRE", requiredGemCount: 2, basePrimaryStatBonus: 80, baseSecondaryStatBonus: 30 },
    CELESTIAL_RING_OF_TRANSCENDENCE: { recipeType: "CELESTIAL_RING_OF_TRANSCENDENCE", requiredGemType: "VOID_STAR_DIAMOND", requiredGemCount: 2, basePrimaryStatBonus: 150, baseSecondaryStatBonus: 50 },
};

export class AncientRunicJewelryAmuletRingEngine {
    public static readonly DURABILITY_COST_PER_SETTING = 10;

    /**
     * Constructs and initializes a jeweler bench.
     */
    public static forgeBench(
        jewelerPlayerId: string,
        benchType: JewelerBenchType,
        currentEpochMs = Date.now()
    ): ActiveJewelerBench {
        const data = BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported jeweler bench type: ${String(benchType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            benchId: `bench_${benchType.toLowerCase()}_${uuid}`,
            jewelerPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            jewelerPower: data.jewelerPower,
            isFunctional: true,
        };
    }

    /**
     * Sets cut gemstones and crafts precious rings and amulets.
     */
    public static craftJewelry(
        bench: ActiveJewelerBench,
        recipeType: PreciousJewelryRecipeType,
        providedGems: CutGemstoneType[],
        craftRoll = Math.random(),
        brillianceRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; jewelry?: CraftedPreciousJewelry; remainingDurability: number; reason?: string } {
        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_SETTING) {
            return {
                success: false,
                remainingDurability: bench?.currentDurability ?? 0,
                reason: `Jeweler bench is out of alignment or lacks durability (requires ${this.DURABILITY_COST_PER_SETTING}).`,
            };
        }

        const benchData = BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, remainingDurability: bench.currentDurability, reason: `Unknown jeweler bench model: ${String(bench.benchType)}` };
        }

        const recipe = JEWELRY_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: bench.currentDurability, reason: `Unknown jewelry recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedGems)) {
            return { success: false, remainingDurability: bench.currentDurability, reason: "Invalid gems array." };
        }

        // Count matching gems
        const matchingCount = providedGems.filter(g => g === recipe.requiredGemType).length;
        if (matchingCount < recipe.requiredGemCount) {
            return {
                success: false,
                remainingDurability: bench.currentDurability,
                reason: `Insufficient gemstones: requires ${recipe.requiredGemCount}x ${recipe.requiredGemType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        bench.currentDurability -= this.DURABILITY_COST_PER_SETTING;
        if (bench.currentDurability < this.DURABILITY_COST_PER_SETTING) {
            bench.currentDurability = Math.max(0, bench.currentDurability);
            bench.isFunctional = false;
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > benchData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: bench.currentDurability,
                reason: `Gem setting fractured: bezel prong pinched gemstone, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent brilliance score (0% to 100%)
        const safeBrillianceRoll = Number.isFinite(brillianceRoll) ? Math.max(0, Math.min(1, brillianceRoll)) : Math.random();
        const powerRatio = Math.min(1.0, bench.jewelerPower / 120);
        const bonusPoints = (benchData.brillianceBonusPercent / 35) * 20;
        const brillianceScore = Math.max(0, Math.min(100, Math.round(
            (safeBrillianceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((brillianceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalPrimary = Math.round(recipe.basePrimaryStatBonus * qualityMultiplier);
        const finalSecondary = Math.round(recipe.baseSecondaryStatBonus * qualityMultiplier);

        // Splice consumed gems out of cloned array
        const remaining = [...providedGems];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredGemCount; i--) {
            if (remaining[i] === recipe.requiredGemType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const jewelry: CraftedPreciousJewelry = {
            jewelryId: `jewel_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPrimaryStatBonus: finalPrimary,
            finalSecondaryStatBonus: finalSecondary,
            gemBrilliancePercent: brillianceScore,
            consumedGemCount: recipe.requiredGemCount,
            consumedGemType: recipe.requiredGemType,
            remainingProvidedGems: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            jewelry,
            remainingDurability: bench.currentDurability,
        };
    }

    /**
     * Calibrates and polishes jeweler bench.
     */
    public static maintainBench(
        bench: ActiveJewelerBench,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!bench) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        bench.currentDurability = Math.min(bench.maxDurability, bench.currentDurability + amt);
        bench.isFunctional = bench.currentDurability >= this.DURABILITY_COST_PER_SETTING;

        return {
            success: true,
            newDurability: bench.currentDurability,
            isFunctional: bench.isFunctional,
        };
    }
}