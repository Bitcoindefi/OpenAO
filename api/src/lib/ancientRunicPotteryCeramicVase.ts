import crypto from "node:crypto";

/**
 * Ancient Runic Ceramic Pottery, Wheel-Thrown Urn & Arcane Amphora Engine for OpenAO MMORPG.
 * Simulates potter kickwheels and ceramic kilns (Clay Potter Kickwheel, Runic Stone Kiln, Celestial Void Kiln Sanctum),
 * refined elemental pottery clays (Terracotta River Clay, Glazed Arcane Kaolin, Celestial Void Ceramic Paste),
 * wheel-thrown urn and amphora recipes (Apothecary Herb Urn, Enchanted Elixir Amphora, Celestial Void Essence Reservoir),
 * independent vitrification ratings (0% to 100%), potion preservation duration and clamped decay mitigation (0% to 100%) scaling,
 * upfront clay material deduction on all craft attempts, cached static catalog maxima, and potter kickwheel maintenance.
 */

export type PotterWheelType = "CLAY_POTTER_KICKWHEEL" | "RUNIC_STONE_KILN" | "CELESTIAL_VOID_KILN_SANCTUM";
export type RefinedClayType = "TERRACOTTA_RIVER_CLAY" | "GLAZED_ARCANE_KAOLIN" | "CELESTIAL_VOID_CERAMIC_PASTE";
export type CeramicVesselRecipeType = "APOTHECARY_HERB_URN" | "ENCHANTED_ELIXIR_AMPHORA" | "CELESTIAL_VOID_ESSENCE_RESERVOIR";

export interface PotterWheelData {
    wheelType: PotterWheelType;
    maxDurability: number;
    potteryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    preservationBonusPercent: number;
}

export interface CeramicVesselRecipeData {
    recipeType: CeramicVesselRecipeType;
    requiredClayType: RefinedClayType;
    requiredClayCount: number;
    basePreservationDurationSec: number;
    baseDecayMitigationPercent: number;
}

export interface ActivePotterWheel {
    wheelId: string;
    potterPlayerId: string;
    wheelType: PotterWheelType;
    currentDurability: number;
    maxDurability: number;
    potteryPower: number;
    isFunctional: boolean;
}

export interface CraftedCeramicVessel {
    vesselId: string;
    recipeType: CeramicVesselRecipeType;
    finalPreservationDurationSec: number;
    finalDecayMitigationPercent: number;
    vitrificationPercent: number; // 0 to 100
    consumedClayCount: number;
    consumedClayType: RefinedClayType;
    remainingProvidedClays: RefinedClayType[];
    craftedEpochMs: number;
}

export const POTTER_CATALOG: Record<PotterWheelType, PotterWheelData> = {
    CLAY_POTTER_KICKWHEEL: { wheelType: "CLAY_POTTER_KICKWHEEL", maxDurability: 75, potteryPower: 25, baseSuccessRatePercent: 85, preservationBonusPercent: 10 },
    RUNIC_STONE_KILN: { wheelType: "RUNIC_STONE_KILN", maxDurability: 170, potteryPower: 65, baseSuccessRatePercent: 92, preservationBonusPercent: 20 },
    CELESTIAL_VOID_KILN_SANCTUM: { wheelType: "CELESTIAL_VOID_KILN_SANCTUM", maxDurability: 310, potteryPower: 120, baseSuccessRatePercent: 99, preservationBonusPercent: 35 },
};

export const VESSEL_RECIPE_CATALOG: Record<CeramicVesselRecipeType, CeramicVesselRecipeData> = {
    APOTHECARY_HERB_URN: { recipeType: "APOTHECARY_HERB_URN", requiredClayType: "TERRACOTTA_RIVER_CLAY", requiredClayCount: 2, basePreservationDurationSec: 120, baseDecayMitigationPercent: 15 },
    ENCHANTED_ELIXIR_AMPHORA: { recipeType: "ENCHANTED_ELIXIR_AMPHORA", requiredClayType: "GLAZED_ARCANE_KAOLIN", requiredClayCount: 2, basePreservationDurationSec: 300, baseDecayMitigationPercent: 35 },
    CELESTIAL_VOID_ESSENCE_RESERVOIR: { recipeType: "CELESTIAL_VOID_ESSENCE_RESERVOIR", requiredClayType: "CELESTIAL_VOID_CERAMIC_PASTE", requiredClayCount: 2, basePreservationDurationSec: 720, baseDecayMitigationPercent: 75 },
};

export class AncientRunicPotteryCeramicVaseEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(POTTER_CATALOG).map(p => p.potteryPower), 1),
        maxBonus: Math.max(...Object.values(POTTER_CATALOG).map(p => p.preservationBonusPercent), 1),
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
     * Constructs and initializes a potter kickwheel or ceramic kiln.
     */
    public static constructWheel(
        potterPlayerId: string,
        wheelType: PotterWheelType
    ): ActivePotterWheel {
        const data = POTTER_CATALOG[wheelType];
        if (!data) {
            throw new Error(`Unsupported potter wheel type: ${String(wheelType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            wheelId: `potter_${wheelType.toLowerCase()}_${uuid}`,
            potterPlayerId,
            wheelType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            potteryPower: data.potteryPower,
            isFunctional: true,
        };
    }

    /**
     * Throws and fires refined clays into apothecary urns, elixir amphoras, and void essence reservoirs.
     * Note: Mutates the passed `wheel` in place and returns it as `updatedWheel` for caller ergonomics.
     */
    public static craftVessel(
        wheel: ActivePotterWheel,
        recipeType: CeramicVesselRecipeType,
        providedClays: RefinedClayType[],
        craftRoll = Math.random(),
        vitrificationRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; vessel?: CraftedCeramicVessel; updatedWheel?: ActivePotterWheel; remainingDurability: number; remainingProvidedClays?: RefinedClayType[]; reason?: string } {
        if (!wheel || !wheel.isFunctional || wheel.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedWheel: wheel,
                remainingDurability: wheel?.currentDurability ?? 0,
                reason: `Potter wheel is uncalibrated or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const wheelData = POTTER_CATALOG[wheel.wheelType];
        if (!wheelData) {
            return { success: false, updatedWheel: wheel, remainingDurability: wheel.currentDurability, reason: `Unknown wheel model: ${String(wheel.wheelType)}` };
        }

        const recipe = VESSEL_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedWheel: wheel, remainingDurability: wheel.currentDurability, reason: `Unknown vessel recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedClays)) {
            return { success: false, updatedWheel: wheel, remainingDurability: wheel.currentDurability, reason: "Invalid clays array." };
        }

        // Count matching clays
        const matchingCount = providedClays.filter(c => c === recipe.requiredClayType).length;
        if (matchingCount < recipe.requiredClayCount) {
            return {
                success: false,
                updatedWheel: wheel,
                remainingDurability: wheel.currentDurability,
                reason: `Insufficient clay: requires ${recipe.requiredClayCount}x ${recipe.requiredClayType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        wheel.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (wheel.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            wheel.currentDurability = Math.max(0, wheel.currentDurability);
            wheel.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedClays];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredClayCount; i--) {
            if (remaining[i] === recipe.requiredClayType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > wheelData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedWheel: wheel,
                remainingDurability: wheel.currentDurability,
                remainingProvidedClays: remaining,
                reason: `Vessel collapsed: clay slumped during wheel throwing or kiln firing, rolled ${rollPercent.toFixed(1)}, needed <= ${wheelData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent vitrification score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeVitrificationRoll = Number.isFinite(vitrificationRoll) ? Math.max(0, Math.min(1, vitrificationRoll)) : Math.random();
        const powerRatio = Math.min(1.0, wheel.potteryPower / maxPower);
        const bonusPoints = (wheelData.preservationBonusPercent / maxBonus) * 20;
        const vitrificationScore = Math.max(0, Math.min(100, Math.round(
            (safeVitrificationRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((vitrificationScore / 100) * 0.4); // 0.8 to 1.2x

        const finalDuration = Math.round(recipe.basePreservationDurationSec * qualityMultiplier);
        const finalMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseDecayMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const vessel: CraftedCeramicVessel = {
            vesselId: `vessel_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPreservationDurationSec: finalDuration,
            finalDecayMitigationPercent: finalMitigation,
            vitrificationPercent: vitrificationScore,
            consumedClayCount: recipe.requiredClayCount,
            consumedClayType: recipe.requiredClayType,
            remainingProvidedClays: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            vessel,
            updatedWheel: wheel,
            remainingDurability: wheel.currentDurability,
            remainingProvidedClays: remaining,
        };
    }

    /**
     * Lubricates kickwheel axle and maintains potter wheel.
     */
    public static maintainWheel(
        wheel: ActivePotterWheel,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!wheel) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        wheel.currentDurability = Math.min(wheel.maxDurability, wheel.currentDurability + amt);
        wheel.isFunctional = wheel.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: wheel.currentDurability,
            isFunctional: wheel.isFunctional,
        };
    }
}