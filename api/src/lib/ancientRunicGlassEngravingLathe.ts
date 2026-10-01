import crypto from "node:crypto";

/**
 * Ancient Runic Glass Engraving Lathe, Copper Wheel Intaglio & Arcane Sigil Engine for OpenAO MMORPG.
 * Simulates glass engraving lathes and intaglio copper wheels (Cedar Glass Engraving Lathe, Runic Copper Wheel Intaglio Bench, Celestial Void Sigil Sanctum),
 * raw quartz crystal goblets and flacon blanks (Quartz Crystal Goblet Blank, Lead Crystal Decanter Blank, Celestial Void Starlight Flacon),
 * engraved chalice and reliquary flacon recipes (Chalice of Sovereign Vitality, Decanter of Arcane Clarity, Celestial Void Reliquary Flacon),
 * independent runic resonance ratings (0% to 100%), clamped spell empower and clamped mana conservation scaling,
 * upfront blank material deduction on all craft attempts, consistent remainingProvidedBlanks return shapes across all paths, cached static catalog maxima, authoritative catalog power ratio, and engraving lathe maintenance.
 */

export type EngravingLatheType = "CEDAR_GLASS_ENGRAVING_LATHE" | "RUNIC_COPPER_WHEEL_INTAGLIO_BENCH" | "CELESTIAL_VOID_SIGIL_SANCTUM";
export type RawGobletBlankType = "QUARTZ_CRYSTAL_GOBLET_BLANK" | "LEAD_CRYSTAL_DECANTER_BLANK" | "CELESTIAL_VOID_STARLIGHT_FLACON";
export type EngravedGlasswareRecipeType = "CHALICE_OF_SOVEREIGN_VITALITY" | "DECANTER_OF_ARCANE_CLARITY" | "CELESTIAL_VOID_RELIQUARY_FLACON";

export interface EngravingLatheData {
    latheType: EngravingLatheType;
    maxDurability: number;
    engravingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    sigilBonusPercent: number;
}

export interface EngravedGlasswareRecipeData {
    recipeType: EngravedGlasswareRecipeType;
    requiredBlankType: RawGobletBlankType;
    requiredBlankCount: number;
    baseSpellEmpowerPercent: number;
    baseManaConservationPercent: number;
}

export interface ActiveEngravingLathe {
    latheId: string;
    engraverPlayerId: string;
    latheType: EngravingLatheType;
    currentDurability: number;
    maxDurability: number;
    engravingPower: number;
    isFunctional: boolean;
}

export interface CraftedEngravedGlassware {
    glasswareId: string;
    recipeType: EngravedGlasswareRecipeType;
    finalSpellEmpowerPercent: number;
    finalManaConservationPercent: number;
    runicResonancePercent: number; // 0 to 100
    consumedBlankCount: number;
    consumedBlankType: RawGobletBlankType;
    remainingProvidedBlanks: RawGobletBlankType[];
    craftedEpochMs: number;
}

export const LATHE_CATALOG: Record<EngravingLatheType, EngravingLatheData> = {
    CEDAR_GLASS_ENGRAVING_LATHE: { latheType: "CEDAR_GLASS_ENGRAVING_LATHE", maxDurability: 75, engravingPower: 25, baseSuccessRatePercent: 85, sigilBonusPercent: 10 },
    RUNIC_COPPER_WHEEL_INTAGLIO_BENCH: { latheType: "RUNIC_COPPER_WHEEL_INTAGLIO_BENCH", maxDurability: 170, engravingPower: 65, baseSuccessRatePercent: 92, sigilBonusPercent: 20 },
    CELESTIAL_VOID_SIGIL_SANCTUM: { latheType: "CELESTIAL_VOID_SIGIL_SANCTUM", maxDurability: 310, engravingPower: 120, baseSuccessRatePercent: 99, sigilBonusPercent: 35 },
};

export const ENGRAVED_RECIPE_CATALOG: Record<EngravedGlasswareRecipeType, EngravedGlasswareRecipeData> = {
    CHALICE_OF_SOVEREIGN_VITALITY: { recipeType: "CHALICE_OF_SOVEREIGN_VITALITY", requiredBlankType: "QUARTZ_CRYSTAL_GOBLET_BLANK", requiredBlankCount: 2, baseSpellEmpowerPercent: 20, baseManaConservationPercent: 10 },
    DECANTER_OF_ARCANE_CLARITY: { recipeType: "DECANTER_OF_ARCANE_CLARITY", requiredBlankType: "LEAD_CRYSTAL_DECANTER_BLANK", requiredBlankCount: 2, baseSpellEmpowerPercent: 45, baseManaConservationPercent: 25 },
    CELESTIAL_VOID_RELIQUARY_FLACON: { recipeType: "CELESTIAL_VOID_RELIQUARY_FLACON", requiredBlankType: "CELESTIAL_VOID_STARLIGHT_FLACON", requiredBlankCount: 2, baseSpellEmpowerPercent: 80, baseManaConservationPercent: 60 },
};

export class AncientRunicGlassEngravingLatheEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(LATHE_CATALOG).map(l => l.engravingPower), 1),
        maxBonus: Math.max(...Object.values(LATHE_CATALOG).map(l => l.sigilBonusPercent), 1),
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
     * Constructs and initializes an engraving lathe or intaglio wheel bench.
     */
    public static constructLathe(
        engraverPlayerId: string,
        latheType: EngravingLatheType
    ): ActiveEngravingLathe {
        const data = LATHE_CATALOG[latheType];
        if (!data) {
            throw new Error(`Unsupported engraving lathe type: ${String(latheType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            latheId: `lathe_${latheType.toLowerCase()}_${uuid}`,
            engraverPlayerId,
            latheType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            engravingPower: data.engravingPower,
            isFunctional: true,
        };
    }

    /**
     * Engraves and carves intaglio sigils into crystal goblets and reliquary flacons.
     * Note: Mutates the passed `lathe` in place and returns it as `updatedLathe` for caller ergonomics.
     */
    public static engraveGlassware(
        lathe: ActiveEngravingLathe,
        recipeType: EngravedGlasswareRecipeType,
        providedBlanks: RawGobletBlankType[],
        craftRoll = Math.random(),
        resonanceRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; glassware?: CraftedEngravedGlassware; updatedLathe?: ActiveEngravingLathe; remainingDurability: number; remainingProvidedBlanks: RawGobletBlankType[]; reason?: string } {
        const fallbackBlanks = Array.isArray(providedBlanks) ? [...providedBlanks] : [];

        if (!lathe || !lathe.isFunctional || lathe.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedLathe: lathe,
                remainingDurability: lathe?.currentDurability ?? 0,
                remainingProvidedBlanks: fallbackBlanks,
                reason: `Engraving lathe is misaligned or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const latheData = LATHE_CATALOG[lathe.latheType];
        if (!latheData) {
            return { success: false, updatedLathe: lathe, remainingDurability: lathe.currentDurability, remainingProvidedBlanks: fallbackBlanks, reason: `Unknown lathe model: ${String(lathe.latheType)}` };
        }

        const recipe = ENGRAVED_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedLathe: lathe, remainingDurability: lathe.currentDurability, remainingProvidedBlanks: fallbackBlanks, reason: `Unknown glassware recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedBlanks)) {
            return { success: false, updatedLathe: lathe, remainingDurability: lathe.currentDurability, remainingProvidedBlanks: [], reason: "Invalid blanks array." };
        }

        // Count matching crystal blanks
        const matchingCount = providedBlanks.filter(b => b === recipe.requiredBlankType).length;
        if (matchingCount < recipe.requiredBlankCount) {
            return {
                success: false,
                updatedLathe: lathe,
                remainingDurability: lathe.currentDurability,
                remainingProvidedBlanks: fallbackBlanks,
                reason: `Insufficient crystal blank: requires ${recipe.requiredBlankCount}x ${recipe.requiredBlankType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        lathe.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (lathe.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            lathe.currentDurability = Math.max(0, lathe.currentDurability);
            lathe.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedBlanks];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredBlankCount; i--) {
            if (remaining[i] === recipe.requiredBlankType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > latheData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedLathe: lathe,
                remainingDurability: lathe.currentDurability,
                remainingProvidedBlanks: remaining,
                reason: `Crystal blank fractured: copper wheel chatter chipped intaglio rim, rolled ${rollPercent.toFixed(1)}, needed <= ${latheData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent runic resonance score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeResonanceRoll = Number.isFinite(resonanceRoll) ? Math.max(0, Math.min(1, resonanceRoll)) : Math.random();
        const powerRatio = Math.min(1.0, latheData.engravingPower / maxPower);
        const bonusPoints = (latheData.sigilBonusPercent / maxBonus) * 20;
        const resonanceScore = Math.max(0, Math.min(100, Math.round(
            (safeResonanceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((resonanceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalEmpower = Math.max(0, Math.min(100, Math.round(recipe.baseSpellEmpowerPercent * qualityMultiplier)));
        const finalConservation = Math.max(0, Math.min(100, Math.round(recipe.baseManaConservationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const glassware: CraftedEngravedGlassware = {
            glasswareId: `engraved_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSpellEmpowerPercent: finalEmpower,
            finalManaConservationPercent: finalConservation,
            runicResonancePercent: resonanceScore,
            consumedBlankCount: recipe.requiredBlankCount,
            consumedBlankType: recipe.requiredBlankType,
            remainingProvidedBlanks: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            glassware,
            updatedLathe: lathe,
            remainingDurability: lathe.currentDurability,
            remainingProvidedBlanks: remaining,
        };
    }

    /**
     * Re-dresses copper intaglio wheels and maintains engraving lathe.
     */
    public static maintainLathe(
        lathe: ActiveEngravingLathe,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!lathe) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        lathe.currentDurability = Math.min(lathe.maxDurability, lathe.currentDurability + amt);
        lathe.isFunctional = lathe.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: lathe.currentDurability,
            isFunctional: lathe.isFunctional,
        };
    }
}