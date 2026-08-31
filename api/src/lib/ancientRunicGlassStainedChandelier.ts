import crypto from "node:crypto";

/**
 * Ancient Runic Glass Stained Chandelier, Iron Armature Assembly & Cathedral Radiance Engine for OpenAO MMORPG.
 * Simulates chandelier assembly hoists and brazing hearths (Cedar Chandelier Assembly Hoist, Runic Wrought Iron Armature Bench, Celestial Void Cathedral Corona Sanctum),
 * raw blown glass cupolas and faceted lead crystal pendants (Cathedral Amber Glass Cupola, Faceted Lead Crystal Pendant, Celestial Void Starfire Corona Glass),
 * sanctuary vesper chandeliers and cathedral corona recipes (Sanctuary Vesper Chandelier, High Altar Iron Corona Chandelier, Celestial Void Seraphic Cathedral Chandelier),
 * independent illuminance radiance ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped holy aura radius and clamped mana recharge aura scaling,
 * upfront cupola material deduction on all craft attempts, consistent remainingProvidedCupolas return shapes across all paths, cached static catalog maxima, authoritative catalog power ratio, and chandelier hoist maintenance.
 */

export type ChandelierHoistType = "CEDAR_CHANDELIER_ASSEMBLY_HOIST" | "RUNIC_WROUGHT_IRON_ARMATURE_BENCH" | "CELESTIAL_VOID_CATHEDRAL_CORONA_SANCTUM";
export type RawGlassCupolaType = "CATHEDRAL_AMBER_GLASS_CUPOLA" | "FACETED_LEAD_CRYSTAL_PENDANT" | "CELESTIAL_VOID_STARFIRE_CORONA_GLASS";
export type SacredChandelierRecipeType = "SANCTUARY_VESPER_CHANDELIER" | "HIGH_ALTAR_IRON_CORONA_CHANDELIER" | "CELESTIAL_VOID_SERAPHIC_CATHEDRAL_CHANDELIER";

export interface ChandelierHoistData {
    hoistType: ChandelierHoistType;
    maxDurability: number;
    glazieryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    radianceBonusPercent: number;
}

export interface SacredChandelierRecipeData {
    recipeType: SacredChandelierRecipeType;
    requiredCupolaType: RawGlassCupolaType;
    requiredCupolaCount: number;
    baseHolyAuraRadiusPercent: number;
    baseManaRechargeAuraPercent: number;
}

export interface ActiveChandelierHoist {
    hoistId: string;
    glazierPlayerId: string;
    hoistType: ChandelierHoistType;
    currentDurability: number;
    maxDurability: number;
    glazieryPower: number;
    isFunctional: boolean;
}

export interface CraftedSacredChandelier {
    chandelierId: string;
    recipeType: SacredChandelierRecipeType;
    finalHolyAuraRadiusPercent: number;
    finalManaRechargeAuraPercent: number;
    illuminanceRadiancePercent: number; // Scaled rating (clamped 0 to 100%, with catalog hoist baselines ~14% to 100%)
    consumedCupolaCount: number;
    consumedCupolaType: RawGlassCupolaType;
    remainingProvidedCupolas: RawGlassCupolaType[];
    craftedEpochMs: number;
}

export const CHANDELIER_HOIST_CATALOG: Record<ChandelierHoistType, ChandelierHoistData> = {
    CEDAR_CHANDELIER_ASSEMBLY_HOIST: { hoistType: "CEDAR_CHANDELIER_ASSEMBLY_HOIST", maxDurability: 75, glazieryPower: 25, baseSuccessRatePercent: 85, radianceBonusPercent: 10 },
    RUNIC_WROUGHT_IRON_ARMATURE_BENCH: { hoistType: "RUNIC_WROUGHT_IRON_ARMATURE_BENCH", maxDurability: 170, glazieryPower: 65, baseSuccessRatePercent: 92, radianceBonusPercent: 20 },
    CELESTIAL_VOID_CATHEDRAL_CORONA_SANCTUM: { hoistType: "CELESTIAL_VOID_CATHEDRAL_CORONA_SANCTUM", maxDurability: 310, glazieryPower: 120, baseSuccessRatePercent: 99, radianceBonusPercent: 35 },
};

export const CHANDELIER_RECIPE_CATALOG: Record<SacredChandelierRecipeType, SacredChandelierRecipeData> = {
    SANCTUARY_VESPER_CHANDELIER: { recipeType: "SANCTUARY_VESPER_CHANDELIER", requiredCupolaType: "CATHEDRAL_AMBER_GLASS_CUPOLA", requiredCupolaCount: 2, baseHolyAuraRadiusPercent: 20, baseManaRechargeAuraPercent: 10 },
    HIGH_ALTAR_IRON_CORONA_CHANDELIER: { recipeType: "HIGH_ALTAR_IRON_CORONA_CHANDELIER", requiredCupolaType: "FACETED_LEAD_CRYSTAL_PENDANT", requiredCupolaCount: 2, baseHolyAuraRadiusPercent: 45, baseManaRechargeAuraPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_CATHEDRAL_CHANDELIER: { recipeType: "CELESTIAL_VOID_SERAPHIC_CATHEDRAL_CHANDELIER", requiredCupolaType: "CELESTIAL_VOID_STARFIRE_CORONA_GLASS", requiredCupolaCount: 2, baseHolyAuraRadiusPercent: 80, baseManaRechargeAuraPercent: 60 },
};

export class AncientRunicGlassStainedChandelierEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CHANDELIER_HOIST_CATALOG).map(h => h.glazieryPower), 1),
        maxBonus: Math.max(...Object.values(CHANDELIER_HOIST_CATALOG).map(h => h.radianceBonusPercent), 1),
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
     * Constructs and initializes a chandelier assembly hoist or brazing armature bench.
     */
    public static constructHoist(
        glazierPlayerId: string,
        hoistType: ChandelierHoistType
    ): ActiveChandelierHoist {
        const data = CHANDELIER_HOIST_CATALOG[hoistType];
        if (!data) {
            throw new Error(`Unsupported chandelier hoist type: ${String(hoistType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            hoistId: `hoist_${hoistType.toLowerCase()}_${uuid}`,
            glazierPlayerId,
            hoistType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            glazieryPower: data.glazieryPower,
            isFunctional: true,
        };
    }

    /**
     * Assembles and wires blown glass cupolas and iron armatures into cathedral corona chandeliers.
     * Note: Mutates the passed `hoist` in place and returns it as `updatedHoist` for caller ergonomics.
     */
    public static assembleChandelier(
        hoist: ActiveChandelierHoist,
        recipeType: SacredChandelierRecipeType,
        providedCupolas: RawGlassCupolaType[],
        craftRoll = Math.random(),
        radianceRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; chandelier?: CraftedSacredChandelier; updatedHoist?: ActiveChandelierHoist; remainingDurability: number; remainingProvidedCupolas: RawGlassCupolaType[]; reason?: string } {
        const fallbackCupolas = Array.isArray(providedCupolas) ? [...providedCupolas] : [];

        if (!hoist || !hoist.isFunctional || hoist.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedHoist: hoist,
                remainingDurability: hoist?.currentDurability ?? 0,
                remainingProvidedCupolas: fallbackCupolas,
                reason: `Chandelier hoist is jammed or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const hoistData = CHANDELIER_HOIST_CATALOG[hoist.hoistType];
        if (!hoistData) {
            return { success: false, updatedHoist: hoist, remainingDurability: hoist.currentDurability, remainingProvidedCupolas: fallbackCupolas, reason: `Unknown hoist model: ${String(hoist.hoistType)}` };
        }

        const recipe = CHANDELIER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedHoist: hoist, remainingDurability: hoist.currentDurability, remainingProvidedCupolas: fallbackCupolas, reason: `Unknown chandelier recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedCupolas)) {
            return { success: false, updatedHoist: hoist, remainingDurability: hoist.currentDurability, remainingProvidedCupolas: [], reason: "Invalid cupolas array." };
        }

        // Count matching glass cupolas
        const matchingCount = providedCupolas.filter(c => c === recipe.requiredCupolaType).length;
        if (matchingCount < recipe.requiredCupolaCount) {
            return {
                success: false,
                updatedHoist: hoist,
                remainingDurability: hoist.currentDurability,
                remainingProvidedCupolas: fallbackCupolas,
                reason: `Insufficient glass cupola: requires ${recipe.requiredCupolaCount}x ${recipe.requiredCupolaType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        hoist.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (hoist.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            hoist.currentDurability = Math.max(0, hoist.currentDurability);
            hoist.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedCupolas];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredCupolaCount; i--) {
            if (remaining[i] === recipe.requiredCupolaType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > hoistData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedHoist: hoist,
                remainingDurability: hoist.currentDurability,
                remainingProvidedCupolas: remaining,
                reason: `Armature bent: chandelier tackle snapped dropping iron frame, rolled ${rollPercent.toFixed(1)}, needed <= ${hoistData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent illuminance radiance score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeRadianceRoll = Number.isFinite(radianceRoll) ? Math.max(0, Math.min(1, radianceRoll)) : Math.random();
        const powerRatio = Math.min(1.0, hoistData.glazieryPower / maxPower);
        const bonusPoints = (hoistData.radianceBonusPercent / maxBonus) * 20;
        const radianceScore = Math.max(0, Math.min(100, Math.round(
            (safeRadianceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((radianceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalRadius = Math.max(0, Math.min(100, Math.round(recipe.baseHolyAuraRadiusPercent * qualityMultiplier)));
        const finalRecharge = Math.max(0, Math.min(100, Math.round(recipe.baseManaRechargeAuraPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const chandelier: CraftedSacredChandelier = {
            chandelierId: `chandelier_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalHolyAuraRadiusPercent: finalRadius,
            finalManaRechargeAuraPercent: finalRecharge,
            illuminanceRadiancePercent: radianceScore,
            consumedCupolaCount: recipe.requiredCupolaCount,
            consumedCupolaType: recipe.requiredCupolaType,
            remainingProvidedCupolas: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            chandelier,
            updatedHoist: hoist,
            remainingDurability: hoist.currentDurability,
            remainingProvidedCupolas: remaining,
        };
    }

    /**
     * Re-lubricates hoist pulleys and maintains chandelier assembly hoist.
     */
    public static maintainHoist(
        hoist: ActiveChandelierHoist,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!hoist) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        hoist.currentDurability = Math.min(hoist.maxDurability, hoist.currentDurability + amt);
        hoist.isFunctional = hoist.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: hoist.currentDurability,
            isFunctional: hoist.isFunctional,
        };
    }
}