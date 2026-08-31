import crypto from "node:crypto";

/**
 * Ancient Runic Jewelry Lapidary Faceting Spindle, Gem Polishing Table & Arcane Light Prism Engine for OpenAO MMORPG.
 * Simulates lapidary faceting spindles and gem polishing laps (Bronze Lapidary Spindle, Runic Mithril Faceting Table, Celestial Void Light Prism Sanctum),
 * uncut rough gemstones and crystals (Rough Star Sapphire, Flawless Dragon Ruby, Celestial Void Astral Diamond),
 * brilliant cut gemstone jewelry recipes (Brilliant Star Sapphire Brooch, Flawless Dragon Ruby Signet, Celestial Void Astral Diamond Tiara),
 * independent facet light refraction ratings (0% to 100%), clamped spell crit strike chance and clamped mana regeneration scaling,
 * upfront gemstone material deduction on all craft attempts, cached static catalog maxima, authoritative catalog power ratio, and faceting spindle maintenance.
 */

export type FacetingSpindleType = "BRONZE_LAPIDARY_SPINDLE" | "RUNIC_MITHRIL_FACETING_TABLE" | "CELESTIAL_VOID_LIGHT_PRISM_SANCTUM";
export type RoughGemstoneType = "ROUGH_STAR_SAPPHIRE" | "FLAWLESS_DRAGON_RUBY" | "CELESTIAL_VOID_ASTRAL_DIAMOND";
export type FacetedJewelryRecipeType = "BRILLIANT_STAR_SAPPHIRE_BROOCH" | "FLAWLESS_DRAGON_RUBY_SIGNET" | "CELESTIAL_VOID_ASTRAL_DIAMOND_TIARA";

export interface FacetingSpindleData {
    spindleType: FacetingSpindleType;
    maxDurability: number;
    facetingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    refractionBonusPercent: number;
}

export interface FacetedJewelryRecipeData {
    recipeType: FacetedJewelryRecipeType;
    requiredGemType: RoughGemstoneType;
    requiredGemCount: number;
    baseSpellCritChancePercent: number;
    baseManaRegenPercent: number;
}

export interface ActiveFacetingSpindle {
    spindleId: string;
    jewelerPlayerId: string;
    spindleType: FacetingSpindleType;
    currentDurability: number;
    maxDurability: number;
    facetingPower: number;
    isFunctional: boolean;
}

export interface CraftedFacetedJewelry {
    jewelryId: string;
    recipeType: FacetedJewelryRecipeType;
    finalSpellCritChancePercent: number;
    finalManaRegenPercent: number;
    lightRefractionPercent: number; // 0 to 100
    consumedGemCount: number;
    consumedGemType: RoughGemstoneType;
    remainingProvidedGems: RoughGemstoneType[];
    craftedEpochMs: number;
}

export const SPINDLE_CATALOG: Record<FacetingSpindleType, FacetingSpindleData> = {
    BRONZE_LAPIDARY_SPINDLE: { spindleType: "BRONZE_LAPIDARY_SPINDLE", maxDurability: 75, facetingPower: 25, baseSuccessRatePercent: 85, refractionBonusPercent: 10 },
    RUNIC_MITHRIL_FACETING_TABLE: { spindleType: "RUNIC_MITHRIL_FACETING_TABLE", maxDurability: 170, facetingPower: 65, baseSuccessRatePercent: 92, refractionBonusPercent: 20 },
    CELESTIAL_VOID_LIGHT_PRISM_SANCTUM: { spindleType: "CELESTIAL_VOID_LIGHT_PRISM_SANCTUM", maxDurability: 310, facetingPower: 120, baseSuccessRatePercent: 99, refractionBonusPercent: 35 },
};

export const FACETED_RECIPE_CATALOG: Record<FacetedJewelryRecipeType, FacetedJewelryRecipeData> = {
    BRILLIANT_STAR_SAPPHIRE_BROOCH: { recipeType: "BRILLIANT_STAR_SAPPHIRE_BROOCH", requiredGemType: "ROUGH_STAR_SAPPHIRE", requiredGemCount: 2, baseSpellCritChancePercent: 12, baseManaRegenPercent: 10 },
    FLAWLESS_DRAGON_RUBY_SIGNET: { recipeType: "FLAWLESS_DRAGON_RUBY_SIGNET", requiredGemType: "FLAWLESS_DRAGON_RUBY", requiredGemCount: 2, baseSpellCritChancePercent: 28, baseManaRegenPercent: 24 },
    CELESTIAL_VOID_ASTRAL_DIAMOND_TIARA: { recipeType: "CELESTIAL_VOID_ASTRAL_DIAMOND_TIARA", requiredGemType: "CELESTIAL_VOID_ASTRAL_DIAMOND", requiredGemCount: 2, baseSpellCritChancePercent: 70, baseManaRegenPercent: 60 },
};

export class AncientRunicJewelryLapidaryFacetingEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SPINDLE_CATALOG).map(s => s.facetingPower), 1),
        maxBonus: Math.max(...Object.values(SPINDLE_CATALOG).map(s => s.refractionBonusPercent), 1),
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
     * Constructs and initializes a lapidary faceting spindle or polishing table.
     */
    public static constructSpindle(
        jewelerPlayerId: string,
        spindleType: FacetingSpindleType
    ): ActiveFacetingSpindle {
        const data = SPINDLE_CATALOG[spindleType];
        if (!data) {
            throw new Error(`Unsupported faceting spindle type: ${String(spindleType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            spindleId: `spindle_${spindleType.toLowerCase()}_${uuid}`,
            jewelerPlayerId,
            spindleType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            facetingPower: data.facetingPower,
            isFunctional: true,
        };
    }

    /**
     * Facets and polishes uncut rough gemstones into brilliant jewelry pieces.
     * Note: Mutates the passed `spindle` in place and returns it as `updatedSpindle` for caller ergonomics.
     */
    public static facetJewelry(
        spindle: ActiveFacetingSpindle,
        recipeType: FacetedJewelryRecipeType,
        providedGems: RoughGemstoneType[],
        craftRoll = Math.random(),
        refractionRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; jewelry?: CraftedFacetedJewelry; updatedSpindle?: ActiveFacetingSpindle; remainingDurability: number; remainingProvidedGems?: RoughGemstoneType[]; reason?: string } {
        if (!spindle || !spindle.isFunctional || spindle.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedSpindle: spindle,
                remainingDurability: spindle?.currentDurability ?? 0,
                reason: `Faceting spindle is unbalanced or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const spindleData = SPINDLE_CATALOG[spindle.spindleType];
        if (!spindleData) {
            return { success: false, updatedSpindle: spindle, remainingDurability: spindle.currentDurability, reason: `Unknown spindle model: ${String(spindle.spindleType)}` };
        }

        const recipe = FACETED_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedSpindle: spindle, remainingDurability: spindle.currentDurability, reason: `Unknown jewelry recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedGems)) {
            return { success: false, updatedSpindle: spindle, remainingDurability: spindle.currentDurability, reason: "Invalid gemstones array." };
        }

        // Count matching gems
        const matchingCount = providedGems.filter(g => g === recipe.requiredGemType).length;
        if (matchingCount < recipe.requiredGemCount) {
            return {
                success: false,
                updatedSpindle: spindle,
                remainingDurability: spindle.currentDurability,
                reason: `Insufficient gemstone: requires ${recipe.requiredGemCount}x ${recipe.requiredGemType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        spindle.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (spindle.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            spindle.currentDurability = Math.max(0, spindle.currentDurability);
            spindle.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedGems];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredGemCount; i--) {
            if (remaining[i] === recipe.requiredGemType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > spindleData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedSpindle: spindle,
                remainingDurability: spindle.currentDurability,
                remainingProvidedGems: remaining,
                reason: `Gemstone fractured: cleavage plane sheared along facet pavilion, rolled ${rollPercent.toFixed(1)}, needed <= ${spindleData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent light refraction score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeRefractionRoll = Number.isFinite(refractionRoll) ? Math.max(0, Math.min(1, refractionRoll)) : Math.random();
        const powerRatio = Math.min(1.0, spindleData.facetingPower / maxPower);
        const bonusPoints = (spindleData.refractionBonusPercent / maxBonus) * 20;
        const refractionScore = Math.max(0, Math.min(100, Math.round(
            (safeRefractionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((refractionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalCrit = Math.max(0, Math.min(100, Math.round(recipe.baseSpellCritChancePercent * qualityMultiplier)));
        const finalRegen = Math.max(0, Math.min(100, Math.round(recipe.baseManaRegenPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const jewelry: CraftedFacetedJewelry = {
            jewelryId: `jewelry_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSpellCritChancePercent: finalCrit,
            finalManaRegenPercent: finalRegen,
            lightRefractionPercent: refractionScore,
            consumedGemCount: recipe.requiredGemCount,
            consumedGemType: recipe.requiredGemType,
            remainingProvidedGems: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            jewelry,
            updatedSpindle: spindle,
            remainingDurability: spindle.currentDurability,
            remainingProvidedGems: remaining,
        };
    }

    /**
     * Trues grinding lap bearings and maintains faceting spindle.
     */
    public static maintainSpindle(
        spindle: ActiveFacetingSpindle,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!spindle) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        spindle.currentDurability = Math.min(spindle.maxDurability, spindle.currentDurability + amt);
        spindle.isFunctional = spindle.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: spindle.currentDurability,
            isFunctional: spindle.isFunctional,
        };
    }
}