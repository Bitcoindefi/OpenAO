import crypto from "node:crypto";

/**
 * Ancient Runic Glass Acid Etching Vat, Fluorite Acid Bath & Frosted Sigil Engine for OpenAO MMORPG.
 * Simulates acid etching vats and neutralization troughs (Cedar Acid Etching Vat, Runic Lead-Lined Fluorite Tank, Celestial Void Hydrofluoric Sanctum),
 * raw lead crystal carafes and beeswax resist slabs (Lead Crystal Carafe Blank, Beeswax Pattern Resist Slab, Celestial Void Starlight Decanter Vessel),
 * frosted spirit decanters and seraphic urn recipes (Frosted Decanter of Spirit Warding, Acid-Etched Dragon Phylactery, Celestial Void Seraphic Frosted Urn),
 * independent frosted opacity ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped curse resistance and clamped mana barrier shielding scaling,
 * upfront vessel material deduction on all craft attempts, consistent remainingProvidedVessels return shapes across all paths, cached static catalog maxima, crypto-secure default gameplay rolls, authoritative catalog power ratio without dead instance fields, and acid vat maintenance.
 */

export type AcidVatType = "CEDAR_ACID_ETCHING_VAT" | "RUNIC_LEAD_LINED_FLUORITE_TANK" | "CELESTIAL_VOID_HYDROFLUORIC_SANCTUM";
export type RawCrystalVesselType = "LEAD_CRYSTAL_CARAFE_BLANK" | "BEESWAX_PATTERN_RESIST_SLAB" | "CELESTIAL_VOID_STARLIGHT_DECANTER_VESSEL";
export type FrostedGlasswareRecipeType = "FROSTED_DECANTER_OF_SPIRIT_WARDING" | "ACID_ETCHED_DRAGON_PHYLACTERY" | "CELESTIAL_VOID_SERAPHIC_FROSTED_URN";

export interface AcidVatData {
    vatType: AcidVatType;
    maxDurability: number;
    glazieryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    frostedBonusPercent: number;
}

export interface FrostedGlasswareRecipeData {
    recipeType: FrostedGlasswareRecipeType;
    requiredVesselType: RawCrystalVesselType;
    requiredVesselCount: number;
    baseCurseResistancePercent: number;
    baseManaBarrierShieldingPercent: number;
}

export interface ActiveAcidVat {
    vatId: string;
    glazierPlayerId: string;
    vatType: AcidVatType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedFrostedGlassware {
    glasswareId: string;
    recipeType: FrostedGlasswareRecipeType;
    finalCurseResistancePercent: number;
    finalManaBarrierShieldingPercent: number;
    frostedOpacityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog vat baselines ~14% to 100%)
    consumedVesselCount: number;
    consumedVesselType: RawCrystalVesselType;
    remainingProvidedVessels: RawCrystalVesselType[];
    craftedEpochMs: number;
}

export const ACID_VAT_CATALOG: Record<AcidVatType, AcidVatData> = {
    CEDAR_ACID_ETCHING_VAT: { vatType: "CEDAR_ACID_ETCHING_VAT", maxDurability: 75, glazieryPower: 25, baseSuccessRatePercent: 85, frostedBonusPercent: 10 },
    RUNIC_LEAD_LINED_FLUORITE_TANK: { vatType: "RUNIC_LEAD_LINED_FLUORITE_TANK", maxDurability: 170, glazieryPower: 65, baseSuccessRatePercent: 92, frostedBonusPercent: 20 },
    CELESTIAL_VOID_HYDROFLUORIC_SANCTUM: { vatType: "CELESTIAL_VOID_HYDROFLUORIC_SANCTUM", maxDurability: 310, glazieryPower: 120, baseSuccessRatePercent: 99, frostedBonusPercent: 35 },
};

export const FROSTED_RECIPE_CATALOG: Record<FrostedGlasswareRecipeType, FrostedGlasswareRecipeData> = {
    FROSTED_DECANTER_OF_SPIRIT_WARDING: { recipeType: "FROSTED_DECANTER_OF_SPIRIT_WARDING", requiredVesselType: "LEAD_CRYSTAL_CARAFE_BLANK", requiredVesselCount: 2, baseCurseResistancePercent: 20, baseManaBarrierShieldingPercent: 10 },
    ACID_ETCHED_DRAGON_PHYLACTERY: { recipeType: "ACID_ETCHED_DRAGON_PHYLACTERY", requiredVesselType: "BEESWAX_PATTERN_RESIST_SLAB", requiredVesselCount: 2, baseCurseResistancePercent: 45, baseManaBarrierShieldingPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_FROSTED_URN: { recipeType: "CELESTIAL_VOID_SERAPHIC_FROSTED_URN", requiredVesselType: "CELESTIAL_VOID_STARLIGHT_DECANTER_VESSEL", requiredVesselCount: 2, baseCurseResistancePercent: 80, baseManaBarrierShieldingPercent: 60 },
};

export class AncientRunicGlassAcidEtchingVatEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(ACID_VAT_CATALOG).map(v => v.glazieryPower), 1),
        maxBonus: Math.max(...Object.values(ACID_VAT_CATALOG).map(v => v.frostedBonusPercent), 1),
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
     * Generates a cryptographically secure random float in [0, 1).
     */
    public static generateSecureRoll(): number {
        if (typeof crypto.randomInt === "function") {
            return crypto.randomInt(0, 1000000) / 1000000;
        }
        return crypto.randomBytes(4).readUInt32LE(0) / 0xffffffff;
    }

    /**
     * Constructs and initializes an acid etching vat or fluorite tank.
     */
    public static constructVat(
        glazierPlayerId: string,
        vatType: AcidVatType
    ): ActiveAcidVat {
        const data = ACID_VAT_CATALOG[vatType];
        if (!data) {
            throw new Error(`Unsupported acid vat type: ${String(vatType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            vatId: `vat_${vatType.toLowerCase()}_${uuid}`,
            glazierPlayerId,
            vatType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Acid-etches and frosts crystal vessels with arcane pattern resists into spirit decanters and urns.
     * Note: Mutates the passed `vat` in place and returns it as `updatedVat` for caller ergonomics.
     */
    public static etchGlassware(
        vat: ActiveAcidVat,
        recipeType: FrostedGlasswareRecipeType,
        providedVessels: RawCrystalVesselType[],
        craftRoll?: number,
        opacityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; glassware?: CraftedFrostedGlassware; updatedVat?: ActiveAcidVat; remainingDurability: number; remainingProvidedVessels: RawCrystalVesselType[]; reason?: string } {
        const fallbackVessels = Array.isArray(providedVessels) ? [...providedVessels] : [];

        if (!vat || !vat.isFunctional || vat.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedVat: vat,
                remainingDurability: vat?.currentDurability ?? 0,
                remainingProvidedVessels: fallbackVessels,
                reason: `Acid etching vat is neutralized or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const vatData = ACID_VAT_CATALOG[vat.vatType];
        if (!vatData) {
            return { success: false, updatedVat: vat, remainingDurability: vat.currentDurability, remainingProvidedVessels: fallbackVessels, reason: `Unknown vat model: ${String(vat.vatType)}` };
        }

        const recipe = FROSTED_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedVat: vat, remainingDurability: vat.currentDurability, remainingProvidedVessels: fallbackVessels, reason: `Unknown frosted recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedVessels)) {
            return { success: false, updatedVat: vat, remainingDurability: vat.currentDurability, remainingProvidedVessels: [], reason: "Invalid vessels array." };
        }

        // Count matching crystal vessels
        const matchingCount = providedVessels.filter(v => v === recipe.requiredVesselType).length;
        if (matchingCount < recipe.requiredVesselCount) {
            return {
                success: false,
                updatedVat: vat,
                remainingDurability: vat.currentDurability,
                remainingProvidedVessels: fallbackVessels,
                reason: `Insufficient crystal vessel: requires ${recipe.requiredVesselCount}x ${recipe.requiredVesselType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        vat.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (vat.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            vat.currentDurability = Math.max(0, vat.currentDurability);
            vat.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedVessels];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredVesselCount; i--) {
            if (remaining[i] === recipe.requiredVesselType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = typeof craftRoll === "number" && Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : this.generateSecureRoll();
        const rollPercent = safeRoll * 100;

        if (rollPercent > vatData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedVat: vat,
                remainingDurability: vat.currentDurability,
                remainingProvidedVessels: remaining,
                reason: `Acid breached resist: hydrofluoric acid corroded crystal mask, rolled ${rollPercent.toFixed(1)}, needed <= ${vatData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent frosted opacity score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeOpacityRoll = typeof opacityRoll === "number" && Number.isFinite(opacityRoll) ? Math.max(0, Math.min(1, opacityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, vatData.glazieryPower / maxPower);
        const bonusPoints = (vatData.frostedBonusPercent / maxBonus) * 20;
        const opacityScore = Math.max(0, Math.min(100, Math.round(
            (safeOpacityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((opacityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalCurse = Math.max(0, Math.min(100, Math.round(recipe.baseCurseResistancePercent * qualityMultiplier)));
        const finalBarrier = Math.max(0, Math.min(100, Math.round(recipe.baseManaBarrierShieldingPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const glassware: CraftedFrostedGlassware = {
            glasswareId: `frosted_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalCurseResistancePercent: finalCurse,
            finalManaBarrierShieldingPercent: finalBarrier,
            frostedOpacityPercent: opacityScore,
            consumedVesselCount: recipe.requiredVesselCount,
            consumedVesselType: recipe.requiredVesselType,
            remainingProvidedVessels: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            glassware,
            updatedVat: vat,
            remainingDurability: vat.currentDurability,
            remainingProvidedVessels: remaining,
        };
    }

    /**
     * Re-lines lead tanks and neutralizes spent acid in etching vat.
     */
    public static maintainVat(
        vat: ActiveAcidVat,
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