import crypto from "node:crypto";

/**
 * Ancient Runic Leather Cobbler Shoe Last, Wooden Form & Arcane Tread Engine for OpenAO MMORPG.
 * Simulates cobbler shoe lasts and wooden forming benches (Oak Cobbler Last Bench, Runic Ironwood Shoe Tree, Celestial Void Swift-Tread Sanctum),
 * raw tanned leather soles and reinforced wyrmhide vamps (Tanned Cowhide Sole Plate, Reinforced Wyrmhide Boot Vamp, Celestial Void Starlight Tread Leather),
 * scout moccasins and seraphic winged greaves recipes (Scout Swift-Stride Moccasin, Ranger Iron-Tread Marching Boot, Celestial Void Seraphic Winged Greave),
 * independent tread traction ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped movement speed and clamped terrain fatigue resistance scaling,
 * upfront sole material deduction on all craft attempts, consistent remainingProvidedSoles return shapes across all paths, cached static catalog maxima, authoritative catalog power ratio, and cobbler bench maintenance.
 */

export type CobblerLastType = "OAK_COBBLER_LAST_BENCH" | "RUNIC_IRONWOOD_SHOE_TREE" | "CELESTIAL_VOID_SWIFT_TREAD_SANCTUM";
export type RawLeatherSoleType = "TANNED_COWHIDE_SOLE_PLATE" | "REINFORCED_WYRMHIDE_BOOT_VAMP" | "CELESTIAL_VOID_STARLIGHT_TREAD_LEATHER";
export type CobblerFootwearRecipeType = "SCOUT_SWIFT_STRIDE_MOCCASIN" | "RANGER_IRON_TREAD_MARCHING_BOOT" | "CELESTIAL_VOID_SERAPHIC_WINGED_GREAVE";

export interface CobblerLastData {
    lastType: CobblerLastType;
    maxDurability: number;
    cobblingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    tractionBonusPercent: number;
}

export interface CobblerFootwearRecipeData {
    recipeType: CobblerFootwearRecipeType;
    requiredSoleType: RawLeatherSoleType;
    requiredSoleCount: number;
    baseMovementSpeedPercent: number;
    baseTerrainFatigueResistancePercent: number;
}

export interface ActiveCobblerLast {
    lastId: string;
    cobblerPlayerId: string;
    lastType: CobblerLastType;
    currentDurability: number;
    maxDurability: number;
    cobblingPower: number;
    isFunctional: boolean;
}

export interface CraftedCobblerFootwear {
    footwearId: string;
    recipeType: CobblerFootwearRecipeType;
    finalMovementSpeedPercent: number;
    finalTerrainFatigueResistancePercent: number;
    treadTractionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedSoleCount: number;
    consumedSoleType: RawLeatherSoleType;
    remainingProvidedSoles: RawLeatherSoleType[];
    craftedEpochMs: number;
}

export const COBBLER_LAST_CATALOG: Record<CobblerLastType, CobblerLastData> = {
    OAK_COBBLER_LAST_BENCH: { lastType: "OAK_COBBLER_LAST_BENCH", maxDurability: 75, cobblingPower: 25, baseSuccessRatePercent: 85, tractionBonusPercent: 10 },
    RUNIC_IRONWOOD_SHOE_TREE: { lastType: "RUNIC_IRONWOOD_SHOE_TREE", maxDurability: 170, cobblingPower: 65, baseSuccessRatePercent: 92, tractionBonusPercent: 20 },
    CELESTIAL_VOID_SWIFT_TREAD_SANCTUM: { lastType: "CELESTIAL_VOID_SWIFT_TREAD_SANCTUM", maxDurability: 310, cobblingPower: 120, baseSuccessRatePercent: 99, tractionBonusPercent: 35 },
};

export const COBBLER_RECIPE_CATALOG: Record<CobblerFootwearRecipeType, CobblerFootwearRecipeData> = {
    SCOUT_SWIFT_STRIDE_MOCCASIN: { recipeType: "SCOUT_SWIFT_STRIDE_MOCCASIN", requiredSoleType: "TANNED_COWHIDE_SOLE_PLATE", requiredSoleCount: 2, baseMovementSpeedPercent: 20, baseTerrainFatigueResistancePercent: 10 },
    RANGER_IRON_TREAD_MARCHING_BOOT: { recipeType: "RANGER_IRON_TREAD_MARCHING_BOOT", requiredSoleType: "REINFORCED_WYRMHIDE_BOOT_VAMP", requiredSoleCount: 2, baseMovementSpeedPercent: 45, baseTerrainFatigueResistancePercent: 25 },
    CELESTIAL_VOID_SERAPHIC_WINGED_GREAVE: { recipeType: "CELESTIAL_VOID_SERAPHIC_WINGED_GREAVE", requiredSoleType: "CELESTIAL_VOID_STARLIGHT_TREAD_LEATHER", requiredSoleCount: 2, baseMovementSpeedPercent: 80, baseTerrainFatigueResistancePercent: 60 },
};

export class AncientRunicLeatherCobblerShoeLastEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(COBBLER_LAST_CATALOG).map(l => l.cobblingPower), 1),
        maxBonus: Math.max(...Object.values(COBBLER_LAST_CATALOG).map(l => l.tractionBonusPercent), 1),
    };

    /**
     * Generates a crypto-secure UUID or 128-bit hex string using node:crypto.
     */
    private static generateSecureId(): string {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return crypto.randomBytes(16).toString("hex");
    }

    /**
     * Constructs and initializes a cobbler shoe last or wooden shoe tree.
     */
    public static constructLast(
        cobblerPlayerId: string,
        lastType: CobblerLastType
    ): ActiveCobblerLast {
        const data = COBBLER_LAST_CATALOG[lastType];
        if (!data) {
            throw new Error(`Unsupported cobbler last type: ${String(lastType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            lastId: `last_${lastType.toLowerCase()}_${uuid}`,
            cobblerPlayerId,
            lastType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            cobblingPower: data.cobblingPower,
            isFunctional: true,
        };
    }

    /**
     * Forms and stitches tanned leather soles into scout moccasins and seraphic greaves.
     * Note: Mutates the passed `last` in place and returns it as `updatedLast` for caller ergonomics.
     */
    public static cobbleFootwear(
        last: ActiveCobblerLast,
        recipeType: CobblerFootwearRecipeType,
        providedSoles: RawLeatherSoleType[],
        craftRoll = Math.random(),
        tractionRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; footwear?: CraftedCobblerFootwear; updatedLast?: ActiveCobblerLast; remainingDurability: number; remainingProvidedSoles: RawLeatherSoleType[]; reason?: string } {
        const fallbackSoles = Array.isArray(providedSoles) ? [...providedSoles] : [];

        if (!last || !last.isFunctional || last.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedLast: last,
                remainingDurability: last?.currentDurability ?? 0,
                remainingProvidedSoles: fallbackSoles,
                reason: `Cobbler shoe last is split or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const lastData = COBBLER_LAST_CATALOG[last.lastType];
        if (!lastData) {
            return { success: false, updatedLast: last, remainingDurability: last.currentDurability, remainingProvidedSoles: fallbackSoles, reason: `Unknown last model: ${String(last.lastType)}` };
        }

        const recipe = COBBLER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedLast: last, remainingDurability: last.currentDurability, remainingProvidedSoles: fallbackSoles, reason: `Unknown footwear recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedSoles)) {
            return { success: false, updatedLast: last, remainingDurability: last.currentDurability, remainingProvidedSoles: [], reason: "Invalid soles array." };
        }

        // Count matching leather soles
        const matchingCount = providedSoles.filter(s => s === recipe.requiredSoleType).length;
        if (matchingCount < recipe.requiredSoleCount) {
            return {
                success: false,
                updatedLast: last,
                remainingDurability: last.currentDurability,
                remainingProvidedSoles: fallbackSoles,
                reason: `Insufficient leather sole: requires ${recipe.requiredSoleCount}x ${recipe.requiredSoleType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        last.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (last.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            last.currentDurability = Math.max(0, last.currentDurability);
            last.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedSoles];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredSoleCount; i--) {
            if (remaining[i] === recipe.requiredSoleType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > lastData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedLast: last,
                remainingDurability: last.currentDurability,
                remainingProvidedSoles: remaining,
                reason: `Sole torn: awl slipped tearing welt stitching, rolled ${rollPercent.toFixed(1)}, needed <= ${lastData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent tread traction score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeTractionRoll = Number.isFinite(tractionRoll) ? Math.max(0, Math.min(1, tractionRoll)) : Math.random();
        const powerRatio = Math.min(1.0, lastData.cobblingPower / maxPower);
        const bonusPoints = (lastData.tractionBonusPercent / maxBonus) * 20;
        const tractionScore = Math.max(0, Math.min(100, Math.round(
            (safeTractionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((tractionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSpeed = Math.max(0, Math.min(100, Math.round(recipe.baseMovementSpeedPercent * qualityMultiplier)));
        const finalFatigue = Math.max(0, Math.min(100, Math.round(recipe.baseTerrainFatigueResistancePercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const footwear: CraftedCobblerFootwear = {
            footwearId: `footwear_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalMovementSpeedPercent: finalSpeed,
            finalTerrainFatigueResistancePercent: finalFatigue,
            treadTractionPercent: tractionScore,
            consumedSoleCount: recipe.requiredSoleCount,
            consumedSoleType: recipe.requiredSoleType,
            remainingProvidedSoles: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            footwear,
            updatedLast: last,
            remainingDurability: last.currentDurability,
            remainingProvidedSoles: remaining,
        };
    }

    /**
     * Re-waxes ironwood tree forms and maintains cobbler last.
     */
    public static maintainLast(
        last: ActiveCobblerLast,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!last) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        last.currentDurability = Math.min(last.maxDurability, last.currentDurability + amt);
        last.isFunctional = last.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: last.currentDurability,
            isFunctional: last.isFunctional,
        };
    }
}