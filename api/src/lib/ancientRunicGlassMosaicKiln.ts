import crypto from "node:crypto";

/**
 * Ancient Runic Glass Mosaic Kiln, Smalti Tile Fusion & Sacred Tesserae Engine for OpenAO MMORPG.
 * Simulates smalti mosaic kilns and fusing hearths (Clay Smalti Fusion Kiln, Runic Ceramic Mosaic Hearth, Celestial Void Smalti Sanctum),
 * raw smalti glass cakes and gold leaf glass slabs (Cobalt Blue Smalti Cake, Imperial Gold Leaf Glass Slab, Celestial Void Opalescent Smalti Cake),
 * sacred mosaic mural and tesserae dome recipes (Sanctuary Guardian Mosaic, Imperial Pantocrator Smalti Mural, Celestial Void Seraphic Tesserae Dome),
 * independent light vibrancy ratings (0% to 100%), clamped sanctuary defense and clamped devotion regen aura scaling,
 * upfront cake material deduction on all craft attempts, consistent remainingProvidedCakes return shapes across all paths, cached static catalog maxima, authoritative catalog power ratio, and mosaic kiln maintenance.
 */

export type MosaicKilnType = "CLAY_SMALTI_FUSION_KILN" | "RUNIC_CERAMIC_MOSAIC_HEARTH" | "CELESTIAL_VOID_SMALTI_SANCTUM";
export type RawSmaltiCakeType = "COBALT_BLUE_SMALTI_CAKE" | "IMPERIAL_GOLD_LEAF_GLASS_SLAB" | "CELESTIAL_VOID_OPALESCENT_SMALTI_CAKE";
export type SacredMosaicRecipeType = "SANCTUARY_GUARDIAN_MOSAIC" | "IMPERIAL_PANTOCRATOR_SMALTI_MURAL" | "CELESTIAL_VOID_SERAPHIC_TESSERAE_DOME";

export interface MosaicKilnData {
    kilnType: MosaicKilnType;
    maxDurability: number;
    smaltiPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    vibrancyBonusPercent: number;
}

export interface SacredMosaicRecipeData {
    recipeType: SacredMosaicRecipeType;
    requiredCakeType: RawSmaltiCakeType;
    requiredCakeCount: number;
    baseSanctuaryDefensePercent: number;
    baseDevotionRegenAuraPercent: number;
}

export interface ActiveMosaicKiln {
    kilnId: string;
    mosaicistPlayerId: string;
    kilnType: MosaicKilnType;
    currentDurability: number;
    maxDurability: number;
    smaltiPower: number;
    isFunctional: boolean;
}

export interface CraftedSacredMosaic {
    mosaicId: string;
    recipeType: SacredMosaicRecipeType;
    finalSanctuaryDefensePercent: number;
    finalDevotionRegenAuraPercent: number;
    lightVibrancyPercent: number; // 0 to 100
    consumedCakeCount: number;
    consumedCakeType: RawSmaltiCakeType;
    remainingProvidedCakes: RawSmaltiCakeType[];
    craftedEpochMs: number;
}

export const MOSAIC_KILN_CATALOG: Record<MosaicKilnType, MosaicKilnData> = {
    CLAY_SMALTI_FUSION_KILN: { kilnType: "CLAY_SMALTI_FUSION_KILN", maxDurability: 75, smaltiPower: 25, baseSuccessRatePercent: 85, vibrancyBonusPercent: 10 },
    RUNIC_CERAMIC_MOSAIC_HEARTH: { kilnType: "RUNIC_CERAMIC_MOSAIC_HEARTH", maxDurability: 170, smaltiPower: 65, baseSuccessRatePercent: 92, vibrancyBonusPercent: 20 },
    CELESTIAL_VOID_SMALTI_SANCTUM: { kilnType: "CELESTIAL_VOID_SMALTI_SANCTUM", maxDurability: 310, smaltiPower: 120, baseSuccessRatePercent: 99, vibrancyBonusPercent: 35 },
};

export const SACRED_MOSAIC_RECIPE_CATALOG: Record<SacredMosaicRecipeType, SacredMosaicRecipeData> = {
    SANCTUARY_GUARDIAN_MOSAIC: { recipeType: "SANCTUARY_GUARDIAN_MOSAIC", requiredCakeType: "COBALT_BLUE_SMALTI_CAKE", requiredCakeCount: 2, baseSanctuaryDefensePercent: 20, baseDevotionRegenAuraPercent: 10 },
    IMPERIAL_PANTOCRATOR_SMALTI_MURAL: { recipeType: "IMPERIAL_PANTOCRATOR_SMALTI_MURAL", requiredCakeType: "IMPERIAL_GOLD_LEAF_GLASS_SLAB", requiredCakeCount: 2, baseSanctuaryDefensePercent: 45, baseDevotionRegenAuraPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_TESSERAE_DOME: { recipeType: "CELESTIAL_VOID_SERAPHIC_TESSERAE_DOME", requiredCakeType: "CELESTIAL_VOID_OPALESCENT_SMALTI_CAKE", requiredCakeCount: 2, baseSanctuaryDefensePercent: 85, baseDevotionRegenAuraPercent: 60 },
};

export class AncientRunicGlassMosaicKilnEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(MOSAIC_KILN_CATALOG).map(k => k.smaltiPower), 1),
        maxBonus: Math.max(...Object.values(MOSAIC_KILN_CATALOG).map(k => k.vibrancyBonusPercent), 1),
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
     * Constructs and initializes a smalti mosaic kiln or fusing hearth.
     */
    public static constructKiln(
        mosaicistPlayerId: string,
        kilnType: MosaicKilnType
    ): ActiveMosaicKiln {
        const data = MOSAIC_KILN_CATALOG[kilnType];
        if (!data) {
            throw new Error(`Unsupported mosaic kiln type: ${String(kilnType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            kilnId: `kiln_${kilnType.toLowerCase()}_${uuid}`,
            mosaicistPlayerId,
            kilnType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            smaltiPower: data.smaltiPower,
            isFunctional: true,
        };
    }

    /**
     * Fuses and cuts smalti glass cakes into sacred tesserae murals and domes.
     * Note: Mutates the passed `kiln` in place and returns it as `updatedKiln` for caller ergonomics.
     */
    public static fuseMosaic(
        kiln: ActiveMosaicKiln,
        recipeType: SacredMosaicRecipeType,
        providedCakes: RawSmaltiCakeType[],
        craftRoll = Math.random(),
        vibrancyRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; mosaic?: CraftedSacredMosaic; updatedKiln?: ActiveMosaicKiln; remainingDurability: number; remainingProvidedCakes: RawSmaltiCakeType[]; reason?: string } {
        const fallbackCakes = Array.isArray(providedCakes) ? [...providedCakes] : [];

        if (!kiln || !kiln.isFunctional || kiln.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedKiln: kiln,
                remainingDurability: kiln?.currentDurability ?? 0,
                remainingProvidedCakes: fallbackCakes,
                reason: `Mosaic kiln is unheated or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const kilnData = MOSAIC_KILN_CATALOG[kiln.kilnType];
        if (!kilnData) {
            return { success: false, updatedKiln: kiln, remainingDurability: kiln.currentDurability, remainingProvidedCakes: fallbackCakes, reason: `Unknown kiln model: ${String(kiln.kilnType)}` };
        }

        const recipe = SACRED_MOSAIC_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedKiln: kiln, remainingDurability: kiln.currentDurability, remainingProvidedCakes: fallbackCakes, reason: `Unknown mosaic recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedCakes)) {
            return { success: false, updatedKiln: kiln, remainingDurability: kiln.currentDurability, remainingProvidedCakes: [], reason: "Invalid cakes array." };
        }

        // Count matching cakes
        const matchingCount = providedCakes.filter(c => c === recipe.requiredCakeType).length;
        if (matchingCount < recipe.requiredCakeCount) {
            return {
                success: false,
                updatedKiln: kiln,
                remainingDurability: kiln.currentDurability,
                remainingProvidedCakes: fallbackCakes,
                reason: `Insufficient glass cake: requires ${recipe.requiredCakeCount}x ${recipe.requiredCakeType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        kiln.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (kiln.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            kiln.currentDurability = Math.max(0, kiln.currentDurability);
            kiln.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedCakes];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredCakeCount; i--) {
            if (remaining[i] === recipe.requiredCakeType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > kilnData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedKiln: kiln,
                remainingDurability: kiln.currentDurability,
                remainingProvidedCakes: remaining,
                reason: `Smalti shattered: thermal stress cleaved tesserae during hardie cutting, rolled ${rollPercent.toFixed(1)}, needed <= ${kilnData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent light vibrancy score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeVibrancyRoll = Number.isFinite(vibrancyRoll) ? Math.max(0, Math.min(1, vibrancyRoll)) : Math.random();
        const powerRatio = Math.min(1.0, kilnData.smaltiPower / maxPower);
        const bonusPoints = (kilnData.vibrancyBonusPercent / maxBonus) * 20;
        const vibrancyScore = Math.max(0, Math.min(100, Math.round(
            (safeVibrancyRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((vibrancyScore / 100) * 0.4); // 0.8 to 1.2x

        const finalDefense = Math.max(0, Math.min(100, Math.round(recipe.baseSanctuaryDefensePercent * qualityMultiplier)));
        const finalDevotion = Math.max(0, Math.min(100, Math.round(recipe.baseDevotionRegenAuraPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const mosaic: CraftedSacredMosaic = {
            mosaicId: `mosaic_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSanctuaryDefensePercent: finalDefense,
            finalDevotionRegenAuraPercent: finalDevotion,
            lightVibrancyPercent: vibrancyScore,
            consumedCakeCount: recipe.requiredCakeCount,
            consumedCakeType: recipe.requiredCakeType,
            remainingProvidedCakes: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            mosaic,
            updatedKiln: kiln,
            remainingDurability: kiln.currentDurability,
            remainingProvidedCakes: remaining,
        };
    }

    /**
     * Re-coats muffle firing plates and maintains mosaic kiln.
     */
    public static maintainKiln(
        kiln: ActiveMosaicKiln,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!kiln) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        kiln.currentDurability = Math.min(kiln.maxDurability, kiln.currentDurability + amt);
        kiln.isFunctional = kiln.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: kiln.currentDurability,
            isFunctional: kiln.isFunctional,
        };
    }
}