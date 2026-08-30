import crypto from "node:crypto";

/**
 * Ancient Runic Masonry Stonecarving, Chisel Mastery & Runestone Monument Engine for OpenAO MMORPG.
 * Simulates masonry chisels (Hardened Bronze Chisel, Runic Mithril Chisel, Celestial Void Carver),
 * quarried stone blocks (Granite Slab, Obsidian Monolith, Celestial Starstone Brick),
 * monument structures (Runic Obelisk of Power, Fortress Citadel Bastion, Celestial Astral Gateway),
 * independent stonecarving precision ratings (0% to 100%), structure durability scaling,
 * block inventory deduction, and chisel maintenance.
 */

export type MasonryChiselType = "HARDENED_BRONZE_CHISEL" | "RUNIC_MITHRIL_CHISEL" | "CELESTIAL_VOID_CARVER";
export type QuarriedStoneBlockType = "GRANITE_SLAB" | "OBSIDIAN_MONOLITH" | "CELESTIAL_STARSTONE_BRICK";
export type MonumentRecipeType = "RUNIC_OBELISK_OF_POWER" | "FORTRESS_CITADEL_BASTION" | "CELESTIAL_ASTRAL_GATEWAY";

export interface MasonryChiselData {
    chiselType: MasonryChiselType;
    maxDurability: number;
    chiselPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    precisionBonusPercent: number;
}

export interface MonumentRecipeData {
    recipeType: MonumentRecipeType;
    requiredBlockType: QuarriedStoneBlockType;
    requiredBlockCount: number;
    baseStructuralDurability: number;
    baseCastleDefenseBonus: number;
}

export interface ActiveMasonryChisel {
    chiselId: string;
    masonPlayerId: string;
    chiselType: MasonryChiselType;
    currentDurability: number;
    maxDurability: number;
    chiselPower: number;
    isFunctional: boolean;
}

export interface CarvedMonumentStructure {
    monumentId: string;
    recipeType: MonumentRecipeType;
    finalStructuralDurability: number;
    finalCastleDefenseBonus: number;
    carvingPrecisionPercent: number; // 0 to 100
    consumedBlockCount: number;
    consumedBlockType: QuarriedStoneBlockType;
    remainingProvidedBlocks: QuarriedStoneBlockType[];
    carvedEpochMs: number;
}

export const CHISEL_CATALOG: Record<MasonryChiselType, MasonryChiselData> = {
    HARDENED_BRONZE_CHISEL: { chiselType: "HARDENED_BRONZE_CHISEL", maxDurability: 75, chiselPower: 25, baseSuccessRatePercent: 85, precisionBonusPercent: 10 },
    RUNIC_MITHRIL_CHISEL: { chiselType: "RUNIC_MITHRIL_CHISEL", maxDurability: 170, chiselPower: 65, baseSuccessRatePercent: 92, precisionBonusPercent: 20 },
    CELESTIAL_VOID_CARVER: { chiselType: "CELESTIAL_VOID_CARVER", maxDurability: 310, chiselPower: 120, baseSuccessRatePercent: 99, precisionBonusPercent: 35 },
};

export const MONUMENT_CATALOG: Record<MonumentRecipeType, MonumentRecipeData> = {
    RUNIC_OBELISK_OF_POWER: { recipeType: "RUNIC_OBELISK_OF_POWER", requiredBlockType: "GRANITE_SLAB", requiredBlockCount: 2, baseStructuralDurability: 1500, baseCastleDefenseBonus: 25 },
    FORTRESS_CITADEL_BASTION: { recipeType: "FORTRESS_CITADEL_BASTION", requiredBlockType: "OBSIDIAN_MONOLITH", requiredBlockCount: 2, baseStructuralDurability: 3500, baseCastleDefenseBonus: 60 },
    CELESTIAL_ASTRAL_GATEWAY: { recipeType: "CELESTIAL_ASTRAL_GATEWAY", requiredBlockType: "CELESTIAL_STARSTONE_BRICK", requiredBlockCount: 2, baseStructuralDurability: 7000, baseCastleDefenseBonus: 120 },
};

export class AncientRunicMasonryStonecarvingEngine {
    public static readonly DURABILITY_COST_PER_CARVE = 10;

    /**
     * Constructs and initializes a masonry chisel.
     */
    public static forgeChisel(
        masonPlayerId: string,
        chiselType: MasonryChiselType,
        currentEpochMs = Date.now()
    ): ActiveMasonryChisel {
        const data = CHISEL_CATALOG[chiselType];
        if (!data) {
            throw new Error(`Unsupported masonry chisel type: ${String(chiselType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            chiselId: `chisel_${chiselType.toLowerCase()}_${uuid}`,
            masonPlayerId,
            chiselType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            chiselPower: data.chiselPower,
            isFunctional: true,
        };
    }

    /**
     * Carves a monument structure from quarried stone blocks.
     */
    public static carveMonument(
        chisel: ActiveMasonryChisel,
        recipeType: MonumentRecipeType,
        providedBlocks: QuarriedStoneBlockType[],
        carveRoll = Math.random(),
        precisionRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; monument?: CarvedMonumentStructure; remainingDurability: number; reason?: string } {
        if (!chisel || !chisel.isFunctional || chisel.currentDurability < this.DURABILITY_COST_PER_CARVE) {
            return {
                success: false,
                remainingDurability: chisel?.currentDurability ?? 0,
                reason: `Masonry chisel is blunted or lacks durability (requires ${this.DURABILITY_COST_PER_CARVE}).`,
            };
        }

        const chiselData = CHISEL_CATALOG[chisel.chiselType];
        if (!chiselData) {
            return { success: false, remainingDurability: chisel.currentDurability, reason: `Unknown chisel type: ${String(chisel.chiselType)}` };
        }

        const recipe = MONUMENT_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: chisel.currentDurability, reason: `Unknown monument recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedBlocks)) {
            return { success: false, remainingDurability: chisel.currentDurability, reason: "Invalid blocks array." };
        }

        // Count matching blocks
        const matchingCount = providedBlocks.filter(b => b === recipe.requiredBlockType).length;
        if (matchingCount < recipe.requiredBlockCount) {
            return {
                success: false,
                remainingDurability: chisel.currentDurability,
                reason: `Insufficient blocks: requires ${recipe.requiredBlockCount}x ${recipe.requiredBlockType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        chisel.currentDurability -= this.DURABILITY_COST_PER_CARVE;
        if (chisel.currentDurability < this.DURABILITY_COST_PER_CARVE) {
            chisel.currentDurability = Math.max(0, chisel.currentDurability);
            chisel.isFunctional = false;
        }

        const safeRoll = Number.isFinite(carveRoll) ? Math.max(0, Math.min(1, carveRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > chiselData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: chisel.currentDurability,
                reason: `Carving fractured: chisel chipped stone grain, rolled ${rollPercent.toFixed(1)}, needed <= ${chiselData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent precision score (0% to 100%)
        const safePrecisionRoll = Number.isFinite(precisionRoll) ? Math.max(0, Math.min(1, precisionRoll)) : Math.random();
        const powerRatio = Math.min(1.0, chisel.chiselPower / 120);
        // precisionBonus scaled so max tier (35) contributes exactly 20 points: (bonus / 35) * 20
        const bonusPoints = (chiselData.precisionBonusPercent / 35) * 20;
        const precisionScore = Math.max(0, Math.min(100, Math.round(
            (safePrecisionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const precisionMultiplier = 0.8 + ((precisionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalDurability = Math.round(recipe.baseStructuralDurability * precisionMultiplier);
        const finalDefense = Math.round(recipe.baseCastleDefenseBonus * precisionMultiplier);

        // Splice consumed blocks out of a cloned array
        const remaining = [...providedBlocks];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredBlockCount; i--) {
            if (remaining[i] === recipe.requiredBlockType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const monument: CarvedMonumentStructure = {
            monumentId: `monument_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalStructuralDurability: finalDurability,
            finalCastleDefenseBonus: finalDefense,
            carvingPrecisionPercent: precisionScore,
            consumedBlockCount: recipe.requiredBlockCount,
            consumedBlockType: recipe.requiredBlockType,
            remainingProvidedBlocks: remaining,
            carvedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            monument,
            remainingDurability: chisel.currentDurability,
        };
    }

    /**
     * Sharpens and hones masonry chisel.
     */
    public static sharpenChisel(
        chisel: ActiveMasonryChisel,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!chisel) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        chisel.currentDurability = Math.min(chisel.maxDurability, chisel.currentDurability + amt);
        chisel.isFunctional = chisel.currentDurability >= this.DURABILITY_COST_PER_CARVE;

        return {
            success: true,
            newDurability: chisel.currentDurability,
            isFunctional: chisel.isFunctional,
        };
    }
}