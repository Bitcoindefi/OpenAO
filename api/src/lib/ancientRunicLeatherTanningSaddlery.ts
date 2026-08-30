import crypto from "node:crypto";

/**
 * Ancient Runic Leather Tanning, Mount Saddlery & Beast Barding Engine for OpenAO MMORPG.
 * Simulates tanning vats (Novice Wood Tanning Vat, Runic Copper Steeper, Celestial Void Tanning Basin),
 * raw beast hides (Supple Deer Hide, Armored Basilisk Scale-Hide, Astral Behemoth Leather),
 * mount equipment recipes (Reinforced Cavalry Saddle, Drake-Scale War Barding, Celestial Vanguard Harness),
 * independent leather suppleness ratings (0% to 100%), mount speed and stamina scaling,
 * hide inventory deduction, and vat maintenance.
 */

export type TanningVatType = "NOVICE_WOOD_TANNING_VAT" | "RUNIC_COPPER_STEEPER" | "CELESTIAL_VOID_TANNING_BASIN";
export type RawBeastHideType = "SUPPLE_DEER_HIDE" | "ARMORED_BASILISK_SCALE_HIDE" | "ASTRAL_BEHEMOTH_LEATHER";
export type MountSaddleryRecipeType = "REINFORCED_CAVALRY_SADDLE" | "DRAKE_SCALE_WAR_BARDING" | "CELESTIAL_VANGUARD_HARNESS";

export interface TanningVatData {
    vatType: TanningVatType;
    maxDurability: number;
    tanningPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    suppleBonusPercent: number;
}

export interface MountSaddleryRecipeData {
    recipeType: MountSaddleryRecipeType;
    requiredHideType: RawBeastHideType;
    requiredHideCount: number;
    baseMountSpeedBonusPercent: number;
    baseMountStaminaBonus: number;
}

export interface ActiveTanningVat {
    vatId: string;
    leatherworkerPlayerId: string;
    vatType: TanningVatType;
    currentDurability: number;
    maxDurability: number;
    tanningPower: number;
    isFunctional: boolean;
}

export interface CraftedMountSaddlery {
    saddleryId: string;
    recipeType: MountSaddleryRecipeType;
    finalMountSpeedBonusPercent: number;
    finalMountStaminaBonus: number;
    leatherSupplenessPercent: number; // 0 to 100
    consumedHideCount: number;
    consumedHideType: RawBeastHideType;
    remainingProvidedHides: RawBeastHideType[];
    craftedEpochMs: number;
}

export const VAT_CATALOG: Record<TanningVatType, TanningVatData> = {
    NOVICE_WOOD_TANNING_VAT: { vatType: "NOVICE_WOOD_TANNING_VAT", maxDurability: 80, tanningPower: 25, baseSuccessRatePercent: 85, suppleBonusPercent: 10 },
    RUNIC_COPPER_STEEPER: { vatType: "RUNIC_COPPER_STEEPER", maxDurability: 180, tanningPower: 65, baseSuccessRatePercent: 92, suppleBonusPercent: 20 },
    CELESTIAL_VOID_TANNING_BASIN: { vatType: "CELESTIAL_VOID_TANNING_BASIN", maxDurability: 320, tanningPower: 120, baseSuccessRatePercent: 99, suppleBonusPercent: 35 },
};

export const SADDLERY_RECIPE_CATALOG: Record<MountSaddleryRecipeType, MountSaddleryRecipeData> = {
    REINFORCED_CAVALRY_SADDLE: { recipeType: "REINFORCED_CAVALRY_SADDLE", requiredHideType: "SUPPLE_DEER_HIDE", requiredHideCount: 2, baseMountSpeedBonusPercent: 20, baseMountStaminaBonus: 150 },
    DRAKE_SCALE_WAR_BARDING: { recipeType: "DRAKE_SCALE_WAR_BARDING", requiredHideType: "ARMORED_BASILISK_SCALE_HIDE", requiredHideCount: 2, baseMountSpeedBonusPercent: 35, baseMountStaminaBonus: 300 },
    CELESTIAL_VANGUARD_HARNESS: { recipeType: "CELESTIAL_VANGUARD_HARNESS", requiredHideType: "ASTRAL_BEHEMOTH_LEATHER", requiredHideCount: 2, baseMountSpeedBonusPercent: 60, baseMountStaminaBonus: 600 },
};

export class AncientRunicLeatherTanningSaddleryEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Constructs and initializes a leather tanning vat.
     */
    public static constructVat(
        leatherworkerPlayerId: string,
        vatType: TanningVatType,
        currentEpochMs = Date.now()
    ): ActiveTanningVat {
        const data = VAT_CATALOG[vatType];
        if (!data) {
            throw new Error(`Unsupported tanning vat type: ${String(vatType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            vatId: `vat_${vatType.toLowerCase()}_${uuid}`,
            leatherworkerPlayerId,
            vatType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            tanningPower: data.tanningPower,
            isFunctional: true,
        };
    }

    /**
     * Tans raw beast hides and crafts mount saddlery/barding gear.
     */
    public static craftSaddlery(
        vat: ActiveTanningVat,
        recipeType: MountSaddleryRecipeType,
        providedHides: RawBeastHideType[],
        craftRoll = Math.random(),
        suppleRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; saddlery?: CraftedMountSaddlery; remainingDurability: number; reason?: string } {
        if (!vat || !vat.isFunctional || vat.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                remainingDurability: vat?.currentDurability ?? 0,
                reason: `Tanning vat is contaminated or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const vatData = VAT_CATALOG[vat.vatType];
        if (!vatData) {
            return { success: false, remainingDurability: vat.currentDurability, reason: `Unknown tanning vat model: ${String(vat.vatType)}` };
        }

        const recipe = SADDLERY_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: vat.currentDurability, reason: `Unknown saddlery recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedHides)) {
            return { success: false, remainingDurability: vat.currentDurability, reason: "Invalid hides array." };
        }

        // Count matching hides
        const matchingCount = providedHides.filter(h => h === recipe.requiredHideType).length;
        if (matchingCount < recipe.requiredHideCount) {
            return {
                success: false,
                remainingDurability: vat.currentDurability,
                reason: `Insufficient hides: requires ${recipe.requiredHideCount}x ${recipe.requiredHideType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        vat.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (vat.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            vat.currentDurability = Math.max(0, vat.currentDurability);
            vat.isFunctional = false;
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > vatData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: vat.currentDurability,
                reason: `Leather spoiled: tanning acid over-soaked hide grain, rolled ${rollPercent.toFixed(1)}, needed <= ${vatData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent suppleness score (0% to 100%)
        const safeSuppleRoll = Number.isFinite(suppleRoll) ? Math.max(0, Math.min(1, suppleRoll)) : Math.random();
        const powerRatio = Math.min(1.0, vat.tanningPower / 120);
        const bonusPoints = (vatData.suppleBonusPercent / 35) * 20;
        const supplenessScore = Math.max(0, Math.min(100, Math.round(
            (safeSuppleRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((supplenessScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSpeed = Math.round(recipe.baseMountSpeedBonusPercent * qualityMultiplier);
        const finalStamina = Math.round(recipe.baseMountStaminaBonus * qualityMultiplier);

        // Splice consumed hides out of cloned array
        const remaining = [...providedHides];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredHideCount; i--) {
            if (remaining[i] === recipe.requiredHideType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const saddlery: CraftedMountSaddlery = {
            saddleryId: `saddlery_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalMountSpeedBonusPercent: finalSpeed,
            finalMountStaminaBonus: finalStamina,
            leatherSupplenessPercent: supplenessScore,
            consumedHideCount: recipe.requiredHideCount,
            consumedHideType: recipe.requiredHideType,
            remainingProvidedHides: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            saddlery,
            remainingDurability: vat.currentDurability,
        };
    }

    /**
     * Cleans and replenishes tanning tannins.
     */
    public static maintainVat(
        vat: ActiveTanningVat,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!vat) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        vat.currentDurability = Math.min(vat.maxDurability, vat.currentDurability + amt);
        vat.isFunctional = vat.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: vat.currentDurability,
            isFunctional: vat.isFunctional,
        };
    }
}