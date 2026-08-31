import crypto from "node:crypto";

/**
 * Ancient Runic Tannery Drying Rack, Curing Frame & Softening Beam Engine for OpenAO MMORPG.
 * Simulates tanning drying racks and curing frames (Hickory Drying Rack, Runic Iron Curing Frame, Celestial Void Softening Sanctum),
 * raw beast pelts and hides (Rough Boar Pelt, Prime Wyvern Hide, Celestial Void Stalker Fur),
 * cured supple leather recipes (Tanned Ranger Hide, Wyrmscale Reinforced Leather, Celestial Void Softened Fleece),
 * independent suppleness ratings (0% to 100%), clamped durability resistance (0% to 100%) and clamped elemental warding (0% to 100%) scaling,
 * upfront pelt material deduction on all craft attempts, cached static catalog maxima, and drying rack maintenance.
 */

export type DryingRackType = "HICKORY_DRYING_RACK" | "RUNIC_IRON_CURING_FRAME" | "CELESTIAL_VOID_SOFTENING_SANCTUM";
export type RawPeltType = "ROUGH_BOAR_PELT" | "PRIME_WYVERN_HIDE" | "CELESTIAL_VOID_STALKER_FUR";
export type CuredLeatherRecipeType = "TANNED_RANGER_HIDE" | "WYRMSCALE_REINFORCED_LEATHER" | "CELESTIAL_VOID_SOFTENED_FLEECE";

export interface DryingRackData {
    rackType: DryingRackType;
    maxDurability: number;
    tanningPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    supplenessBonusPercent: number;
}

export interface CuredLeatherRecipeData {
    recipeType: CuredLeatherRecipeType;
    requiredPeltType: RawPeltType;
    requiredPeltCount: number;
    baseDurabilityResistancePercent: number;
    baseElementalWardPercent: number;
}

export interface ActiveDryingRack {
    rackId: string;
    tannerPlayerId: string;
    rackType: DryingRackType;
    currentDurability: number;
    maxDurability: number;
    tanningPower: number;
    isFunctional: boolean;
}

export interface CraftedSuppleLeather {
    leatherId: string;
    recipeType: CuredLeatherRecipeType;
    finalDurabilityResistancePercent: number;
    finalElementalWardPercent: number;
    supplenessPercent: number; // 0 to 100
    consumedPeltCount: number;
    consumedPeltType: RawPeltType;
    remainingProvidedPelts: RawPeltType[];
    craftedEpochMs: number;
}

export const TANNERY_CATALOG: Record<DryingRackType, DryingRackData> = {
    HICKORY_DRYING_RACK: { rackType: "HICKORY_DRYING_RACK", maxDurability: 75, tanningPower: 25, baseSuccessRatePercent: 85, supplenessBonusPercent: 10 },
    RUNIC_IRON_CURING_FRAME: { rackType: "RUNIC_IRON_CURING_FRAME", maxDurability: 170, tanningPower: 65, baseSuccessRatePercent: 92, supplenessBonusPercent: 20 },
    CELESTIAL_VOID_SOFTENING_SANCTUM: { rackType: "CELESTIAL_VOID_SOFTENING_SANCTUM", maxDurability: 310, tanningPower: 120, baseSuccessRatePercent: 99, supplenessBonusPercent: 35 },
};

export const LEATHER_RECIPE_CATALOG: Record<CuredLeatherRecipeType, CuredLeatherRecipeData> = {
    TANNED_RANGER_HIDE: { recipeType: "TANNED_RANGER_HIDE", requiredPeltType: "ROUGH_BOAR_PELT", requiredPeltCount: 2, baseDurabilityResistancePercent: 15, baseElementalWardPercent: 8 },
    WYRMSCALE_REINFORCED_LEATHER: { recipeType: "WYRMSCALE_REINFORCED_LEATHER", requiredPeltType: "PRIME_WYVERN_HIDE", requiredPeltCount: 2, baseDurabilityResistancePercent: 35, baseElementalWardPercent: 22 },
    CELESTIAL_VOID_SOFTENED_FLEECE: { recipeType: "CELESTIAL_VOID_SOFTENED_FLEECE", requiredPeltType: "CELESTIAL_VOID_STALKER_FUR", requiredPeltCount: 2, baseDurabilityResistancePercent: 80, baseElementalWardPercent: 55 },
};

export class AncientRunicLeatherTanneryDryingRackEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(TANNERY_CATALOG).map(t => t.tanningPower), 1),
        maxBonus: Math.max(...Object.values(TANNERY_CATALOG).map(t => t.supplenessBonusPercent), 1),
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
     * Constructs and initializes a drying rack or curing frame.
     */
    public static constructRack(
        tannerPlayerId: string,
        rackType: DryingRackType
    ): ActiveDryingRack {
        const data = TANNERY_CATALOG[rackType];
        if (!data) {
            throw new Error(`Unsupported drying rack type: ${String(rackType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            rackId: `rack_${rackType.toLowerCase()}_${uuid}`,
            tannerPlayerId,
            rackType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            tanningPower: data.tanningPower,
            isFunctional: true,
        };
    }

    /**
     * Cures and softenes raw beast pelts into supple leather and elemental fleece.
     * Note: Mutates the passed `rack` in place and returns it as `updatedRack` for caller ergonomics.
     */
    public static craftSuppleLeather(
        rack: ActiveDryingRack,
        recipeType: CuredLeatherRecipeType,
        providedPelts: RawPeltType[],
        craftRoll = Math.random(),
        supplenessRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; leather?: CraftedSuppleLeather; updatedRack?: ActiveDryingRack; remainingDurability: number; remainingProvidedPelts?: RawPeltType[]; reason?: string } {
        if (!rack || !rack.isFunctional || rack.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedRack: rack,
                remainingDurability: rack?.currentDurability ?? 0,
                reason: `Drying rack is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const rackData = TANNERY_CATALOG[rack.rackType];
        if (!rackData) {
            return { success: false, updatedRack: rack, remainingDurability: rack.currentDurability, reason: `Unknown rack model: ${String(rack.rackType)}` };
        }

        const recipe = LEATHER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedRack: rack, remainingDurability: rack.currentDurability, reason: `Unknown leather recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedPelts)) {
            return { success: false, updatedRack: rack, remainingDurability: rack.currentDurability, reason: "Invalid pelts array." };
        }

        // Count matching pelts
        const matchingCount = providedPelts.filter(p => p === recipe.requiredPeltType).length;
        if (matchingCount < recipe.requiredPeltCount) {
            return {
                success: false,
                updatedRack: rack,
                remainingDurability: rack.currentDurability,
                reason: `Insufficient pelts: requires ${recipe.requiredPeltCount}x ${recipe.requiredPeltType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        rack.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (rack.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            rack.currentDurability = Math.max(0, rack.currentDurability);
            rack.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedPelts];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredPeltCount; i--) {
            if (remaining[i] === recipe.requiredPeltType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > rackData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedRack: rack,
                remainingDurability: rack.currentDurability,
                remainingProvidedPelts: remaining,
                reason: `Hide scorched: uneven drying salt distribution cracked skin grain, rolled ${rollPercent.toFixed(1)}, needed <= ${rackData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent suppleness score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeSupplenessRoll = Number.isFinite(supplenessRoll) ? Math.max(0, Math.min(1, supplenessRoll)) : Math.random();
        const powerRatio = Math.min(1.0, rack.tanningPower / maxPower);
        const bonusPoints = (rackData.supplenessBonusPercent / maxBonus) * 20;
        const supplenessScore = Math.max(0, Math.min(100, Math.round(
            (safeSupplenessRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((supplenessScore / 100) * 0.4); // 0.8 to 1.2x

        const finalDurabilityRes = Math.max(0, Math.min(100, Math.round(recipe.baseDurabilityResistancePercent * qualityMultiplier)));
        const finalWard = Math.max(0, Math.min(100, Math.round(recipe.baseElementalWardPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const leather: CraftedSuppleLeather = {
            leatherId: `leather_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalDurabilityResistancePercent: finalDurabilityRes,
            finalElementalWardPercent: finalWard,
            supplenessPercent: supplenessScore,
            consumedPeltCount: recipe.requiredPeltCount,
            consumedPeltType: recipe.requiredPeltType,
            remainingProvidedPelts: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            leather,
            updatedRack: rack,
            remainingDurability: rack.currentDurability,
            remainingProvidedPelts: remaining,
        };
    }

    /**
     * Re-oils curing frame tensioners and maintains drying rack.
     */
    public static maintainRack(
        rack: ActiveDryingRack,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!rack) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        rack.currentDurability = Math.min(rack.maxDurability, rack.currentDurability + amt);
        rack.isFunctional = rack.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: rack.currentDurability,
            isFunctional: rack.isFunctional,
        };
    }
}