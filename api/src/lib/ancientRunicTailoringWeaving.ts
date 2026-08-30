import crypto from "node:crypto";

/**
 * Ancient Runic Tailoring Cloth Weaving, Loom Spinning & Robe Imbuing Engine for OpenAO MMORPG.
 * Simulates tailoring looms (Wooden Drop Spindle, Runic Loom Frame, Astral Weaver Loom),
 * raw textile fibers (Silk Moth Cocoon, Void Spider Web, Celestial Stardust Thread),
 * mage robes (Arcanist Apprentice Vestment, Void Shadow Raiment, Stardust Astral Robe),
 * independent weaving quality ratings (0% to 100%), mana & armor stat scalings, remaining fiber inventory splicing, and loom maintenance.
 */

export type TailoringLoomType = "WOODEN_DROP_SPINDLE" | "RUNIC_LOOM_FRAME" | "ASTRAL_WEAVER_LOOM";
export type TextileFiberType = "SILK_MOTH_COCOON" | "VOID_SPIDER_WEB" | "CELESTIAL_STARDUST_THREAD";
export type TailoredRobeRecipeType = "ARCANIST_APPRENTICE_VESTMENT" | "VOID_SHADOW_RAIMENT" | "STARDUST_ASTRAL_ROBE";

export interface TailoringLoomData {
    loomType: TailoringLoomType;
    maxDurability: number;
    weavingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    stitchingBonusPercent: number;
}

export interface TailoredRobeRecipeData {
    recipeType: TailoredRobeRecipeType;
    requiredFiberType: TextileFiberType;
    requiredFiberCount: number;
    baseArmorRating: number;
    baseMaxManaBonus: number;
}

export interface ActiveTailoringLoom {
    loomId: string;
    tailorPlayerId: string;
    loomType: TailoringLoomType;
    currentDurability: number;
    maxDurability: number;
    weavingPower: number;
    isThreaded: boolean;
}

export interface InscribedTailoredRobe {
    robeId: string;
    recipeType: TailoredRobeRecipeType;
    finalArmorRating: number;
    finalMaxManaBonus: number;
    weavingQualityPercent: number; // 0 to 100
    consumedFiberCount: number;
    consumedFiberType: TextileFiberType;
    remainingProvidedFibers: TextileFiberType[];
    wovenEpochMs: number;
}

export const LOOM_CATALOG: Record<TailoringLoomType, TailoringLoomData> = {
    WOODEN_DROP_SPINDLE: { loomType: "WOODEN_DROP_SPINDLE", maxDurability: 70, weavingPower: 25, baseSuccessRatePercent: 85, stitchingBonusPercent: 10 },
    RUNIC_LOOM_FRAME: { loomType: "RUNIC_LOOM_FRAME", maxDurability: 160, weavingPower: 65, baseSuccessRatePercent: 92, stitchingBonusPercent: 20 },
    ASTRAL_WEAVER_LOOM: { loomType: "ASTRAL_WEAVER_LOOM", maxDurability: 300, weavingPower: 120, baseSuccessRatePercent: 99, stitchingBonusPercent: 35 },
};

export const ROBE_RECIPE_CATALOG: Record<TailoredRobeRecipeType, TailoredRobeRecipeData> = {
    ARCANIST_APPRENTICE_VESTMENT: { recipeType: "ARCANIST_APPRENTICE_VESTMENT", requiredFiberType: "SILK_MOTH_COCOON", requiredFiberCount: 2, baseArmorRating: 25, baseMaxManaBonus: 40 },
    VOID_SHADOW_RAIMENT: { recipeType: "VOID_SHADOW_RAIMENT", requiredFiberType: "VOID_SPIDER_WEB", requiredFiberCount: 2, baseArmorRating: 55, baseMaxManaBonus: 85 },
    STARDUST_ASTRAL_ROBE: { recipeType: "STARDUST_ASTRAL_ROBE", requiredFiberType: "CELESTIAL_STARDUST_THREAD", requiredFiberCount: 2, baseArmorRating: 90, baseMaxManaBonus: 150 },
};

export class AncientRunicTailoringWeavingEngine {
    public static readonly DURABILITY_COST_PER_WEAVE = 10;

    /**
     * Constructs and initializes a tailoring loom.
     */
    public static constructLoom(
        tailorPlayerId: string,
        loomType: TailoringLoomType,
        currentEpochMs = Date.now()
    ): ActiveTailoringLoom {
        const data = LOOM_CATALOG[loomType];
        if (!data) {
            throw new Error(`Unsupported tailoring loom type: ${String(loomType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            loomId: `loom_${loomType.toLowerCase()}_${uuid}`,
            tailorPlayerId,
            loomType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            weavingPower: data.weavingPower,
            isThreaded: true,
        };
    }

    /**
     * Weaves and tailors a mage robe from raw textile fibers with independent quality draw and fiber array consumption.
     */
    public static weaveRobe(
        loom: ActiveTailoringLoom,
        recipeType: TailoredRobeRecipeType,
        providedFibers: TextileFiberType[],
        weaveRoll = Math.random(),
        qualityRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; tailoredRobe?: InscribedTailoredRobe; remainingDurability: number; reason?: string } {
        if (!loom || !loom.isThreaded || loom.currentDurability < this.DURABILITY_COST_PER_WEAVE) {
            return {
                success: false,
                remainingDurability: loom?.currentDurability ?? 0,
                reason: `Loom is unthreaded or lacks durability (requires ${this.DURABILITY_COST_PER_WEAVE}).`,
            };
        }

        const recipe = ROBE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: loom.currentDurability, reason: `Unknown robe recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedFibers)) {
            return { success: false, remainingDurability: loom.currentDurability, reason: "Invalid fibers array." };
        }

        // Count matching fibers
        const matchingCount = providedFibers.filter(f => f === recipe.requiredFiberType).length;
        if (matchingCount < recipe.requiredFiberCount) {
            return {
                success: false,
                remainingDurability: loom.currentDurability,
                reason: `Insufficient fibers: requires ${recipe.requiredFiberCount}x ${recipe.requiredFiberType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        loom.currentDurability -= this.DURABILITY_COST_PER_WEAVE;
        if (loom.currentDurability <= 0) {
            loom.currentDurability = Math.max(0, loom.currentDurability);
            loom.isThreaded = false;
        }

        const loomData = LOOM_CATALOG[loom.loomType];
        const safeRoll = Number.isFinite(weaveRoll) ? Math.max(0, Math.min(1, weaveRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > loomData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: loom.currentDurability,
                reason: `Weaving snarled: threads snapped on spindle, rolled ${rollPercent.toFixed(1)}, needed <= ${loomData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent weaving quality score (0% to 100%)
        const safeQualityRoll = Number.isFinite(qualityRoll) ? Math.max(0, Math.min(1, qualityRoll)) : Math.random();
        const qualityScore = Math.max(0, Math.min(100, Math.round(50 + (safeQualityRoll * 30) + loomData.stitchingBonusPercent)));
        const qualityMultiplier = 0.8 + ((qualityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalArmor = Math.round(recipe.baseArmorRating * qualityMultiplier);
        const finalMana = Math.round(recipe.baseMaxManaBonus * qualityMultiplier);

        // Splice consumed fibers out of a cloned array
        const remainingFibers = [...providedFibers];
        let removed = 0;
        for (let i = remainingFibers.length - 1; i >= 0 && removed < recipe.requiredFiberCount; i--) {
            if (remainingFibers[i] === recipe.requiredFiberType) {
                remainingFibers.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const robe: InscribedTailoredRobe = {
            robeId: `robe_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalArmorRating: finalArmor,
            finalMaxManaBonus: finalMana,
            weavingQualityPercent: qualityScore,
            consumedFiberCount: recipe.requiredFiberCount,
            consumedFiberType: recipe.requiredFiberType,
            remainingProvidedFibers: remainingFibers,
            wovenEpochMs: currentEpochMs,
        };

        return {
            success: true,
            tailoredRobe: robe,
            remainingDurability: loom.currentDurability,
        };
    }

    /**
     * Threads and maintains loom tension.
     */
    public static maintainLoom(
        loom: ActiveTailoringLoom,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isThreaded: boolean } {
        if (!loom) return { success: false, newDurability: 0, isThreaded: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        loom.currentDurability = Math.min(loom.maxDurability, loom.currentDurability + amt);
        loom.isThreaded = loom.currentDurability > 0;

        return {
            success: true,
            newDurability: loom.currentDurability,
            isThreaded: loom.isThreaded,
        };
    }
}