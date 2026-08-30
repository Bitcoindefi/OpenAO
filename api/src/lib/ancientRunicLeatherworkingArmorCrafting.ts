import crypto from "node:crypto";

/**
 * Ancient Runic Leatherworking Armor Crafting, Beast Hide Tanning & Reinforcement Engine for OpenAO MMORPG.
 * Simulates tanning racks (Pine Frame, Ironwood Curing Vat, Astral Ether Vat),
 * beast hide materials (Wolf Pelt, Dragon Scale Hide, Void Drake Chitin),
 * masterwork stitching quality ratings (0% to 100%), armor defense calculations, and rack maintenance.
 */

export type TanningRackType = "PINE_TANNING_FRAME" | "IRONWOOD_CURING_VAT" | "ASTRAL_ETHER_VAT";
export type BeastHideType = "WOLF_PELT" | "DRAGON_SCALE_HIDE" | "VOID_DRAKE_CHITIN";
export type LeatherArmorRecipeType = "BEASTSTALKER_TUNIC" | "DRAGONSCALE_GREAVES" | "VOIDWEAVE_CLOAK";

export interface TanningRackData {
    rackType: TanningRackType;
    maxDurability: number;
    baseSuccessRatePercent: number; // 0 to 100
    stitchingQualityBonusPercent: number;
}

export interface LeatherArmorRecipeData {
    recipeType: LeatherArmorRecipeType;
    requiredHideType: BeastHideType;
    requiredHideCount: number;
    baseArmorDefense: number;
    secondaryStatName: string;
    baseSecondaryStatValue: number;
}

export interface ActiveTanningRack {
    rackId: string;
    leatherworkerPlayerId: string;
    rackType: TanningRackType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedLeatherArmor {
    armorId: string;
    recipeType: LeatherArmorRecipeType;
    finalArmorDefense: number;
    secondaryStatName: string;
    secondaryStatValue: number;
    stitchingQualityPercent: number; // 0 to 100
    craftedEpochMs: number;
}

export const RACK_CATALOG: Record<TanningRackType, TanningRackData> = {
    PINE_TANNING_FRAME: { rackType: "PINE_TANNING_FRAME", maxDurability: 100, baseSuccessRatePercent: 85, stitchingQualityBonusPercent: 10 },
    IRONWOOD_CURING_VAT: { rackType: "IRONWOOD_CURING_VAT", maxDurability: 160, baseSuccessRatePercent: 92, stitchingQualityBonusPercent: 20 },
    ASTRAL_ETHER_VAT: { rackType: "ASTRAL_ETHER_VAT", maxDurability: 260, baseSuccessRatePercent: 99, stitchingQualityBonusPercent: 35 },
};

export const RECIPE_CATALOG: Record<LeatherArmorRecipeType, LeatherArmorRecipeData> = {
    BEASTSTALKER_TUNIC: { recipeType: "BEASTSTALKER_TUNIC", requiredHideType: "WOLF_PELT", requiredHideCount: 2, baseArmorDefense: 35, secondaryStatName: "AGILITY", baseSecondaryStatValue: 20 },
    DRAGONSCALE_GREAVES: { recipeType: "DRAGONSCALE_GREAVES", requiredHideType: "DRAGON_SCALE_HIDE", requiredHideCount: 2, baseArmorDefense: 60, secondaryStatName: "FIRE_RESISTANCE", baseSecondaryStatValue: 15 },
    VOIDWEAVE_CLOAK: { recipeType: "VOIDWEAVE_CLOAK", requiredHideType: "VOID_DRAKE_CHITIN", requiredHideCount: 2, baseArmorDefense: 85, secondaryStatName: "MAGIC_RESISTANCE", baseSecondaryStatValue: 30 },
};

export class AncientRunicLeatherworkingArmorCraftingEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 15;

    /**
     * Constructs and initializes a tanning rack or curing vat.
     */
    public static constructRack(
        leatherworkerPlayerId: string,
        rackType: TanningRackType,
        currentEpochMs = Date.now()
    ): ActiveTanningRack {
        const data = RACK_CATALOG[rackType];
        if (!data) {
            throw new Error(`Unsupported tanning rack type: ${String(rackType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            rackId: `rack_${rackType.toLowerCase()}_${uuid}`,
            leatherworkerPlayerId,
            rackType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Crafts a piece of leather armor from raw hides.
     */
    public static craftArmor(
        rack: ActiveTanningRack,
        recipeType: LeatherArmorRecipeType,
        providedHides: BeastHideType[],
        craftRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; craftedArmor?: CraftedLeatherArmor; remainingDurability: number; reason?: string } {
        if (!rack || !rack.isFunctional || rack.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                remainingDurability: rack?.currentDurability ?? 0,
                reason: `Tanning rack is broken or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const recipe = RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: rack.currentDurability, reason: `Unknown armor recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedHides)) {
            return { success: false, remainingDurability: rack.currentDurability, reason: "Invalid hides material array." };
        }

        // Count matching hides
        const matchingCount = providedHides.filter(h => h === recipe.requiredHideType).length;
        if (matchingCount < recipe.requiredHideCount) {
            return {
                success: false,
                remainingDurability: rack.currentDurability,
                reason: `Insufficient hides: requires ${recipe.requiredHideCount}x ${recipe.requiredHideType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        rack.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (rack.currentDurability <= 0) {
            rack.currentDurability = Math.max(0, rack.currentDurability);
            rack.isFunctional = false;
        }

        const rackData = RACK_CATALOG[rack.rackType];
        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > rackData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: rack.currentDurability,
                reason: `Armor crafting ruined: rolled ${rollPercent.toFixed(1)}, needed <= ${rackData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate masterwork stitching quality using safeRoll clamped on both bounds
        const qualityScore = Math.max(0, Math.min(100, Math.round(50 + (safeRoll * 30) + rackData.stitchingQualityBonusPercent)));
        const qualityMultiplier = 0.8 + (qualityScore / 100 * 0.4); // 0.8 to 1.2x

        const finalDef = Math.round(recipe.baseArmorDefense * qualityMultiplier);
        const finalSec = Math.round(recipe.baseSecondaryStatValue * qualityMultiplier);

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const armor: CraftedLeatherArmor = {
            armorId: `armor_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalArmorDefense: finalDef,
            secondaryStatName: recipe.secondaryStatName,
            secondaryStatValue: finalSec,
            stitchingQualityPercent: qualityScore,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            craftedArmor: armor,
            remainingDurability: rack.currentDurability,
        };
    }

    /**
     * Repairs and maintains tanning rack durability.
     */
    public static repairRack(
        rack: ActiveTanningRack,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!rack) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        rack.currentDurability = Math.min(rack.maxDurability, rack.currentDurability + amt);
        rack.isFunctional = rack.currentDurability > 0;

        return {
            success: true,
            newDurability: rack.currentDurability,
            isFunctional: rack.isFunctional,
        };
    }
}