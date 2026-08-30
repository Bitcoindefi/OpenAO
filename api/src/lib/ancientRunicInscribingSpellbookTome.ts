import crypto from "node:crypto";

/**
 * Ancient Runic Inscribing Spellbook Tome, Astral Quill & Parchment Synthesis Engine for OpenAO MMORPG.
 * Simulates astral quills (Raven Quill, Phoenix Ember Quill, Void Dragon Quill),
 * arcane parchment materials (Papyrus of Swiftness, Vellum of Pyromancy, Void Astral Parchment),
 * spellbook tomes (Arcane Missiles, Cataclysmic Inferno, Dimensional Rupture),
 * masterwork calligraphy quality scores (0% to 100%), mana cost reduction scaling, material consumption tracking, and ink refills.
 */

export type AstralQuillType = "RAVEN_FEATHER_QUILL" | "PHOENIX_EMBER_QUILL" | "VOID_DRAGON_QUILL";
export type ArcaneParchmentType = "PAPYRUS_OF_SWIFTNESS" | "VELLUM_OF_PYROMANCY" | "VOID_ASTRAL_PARCHMENT";
export type SpellbookTomeRecipeType = "TOME_OF_ARCANE_MISSILES" | "GRIMOIRE_OF_CATACLYSMIC_INFERNO" | "CODEX_OF_DIMENSIONAL_RUPTURE";

export interface AstralQuillData {
    quillType: AstralQuillType;
    maxInkDurability: number;
    inscribingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    calligraphyBonusPercent: number;
}

export interface SpellbookRecipeData {
    recipeType: SpellbookTomeRecipeType;
    requiredParchmentType: ArcaneParchmentType;
    requiredParchmentCount: number;
    baseSpellPower: number;
    baseManaCostReductionPercent: number;
}

export interface ActiveAstralQuill {
    quillId: string;
    scribePlayerId: string;
    quillType: AstralQuillType;
    currentInkDurability: number;
    maxInkDurability: number;
    inscribingPower: number;
    hasInk: boolean;
}

export interface InscribedSpellbookTome {
    tomeId: string;
    recipeType: SpellbookTomeRecipeType;
    finalSpellPower: number;
    finalManaCostReductionPercent: number;
    calligraphyQualityPercent: number; // 0 to 100
    consumedParchmentCount: number;
    consumedParchmentType: ArcaneParchmentType;
    inscribedEpochMs: number;
}

export const QUILL_CATALOG: Record<AstralQuillType, AstralQuillData> = {
    RAVEN_FEATHER_QUILL: { quillType: "RAVEN_FEATHER_QUILL", maxInkDurability: 100, inscribingPower: 25, baseSuccessRatePercent: 85, calligraphyBonusPercent: 10 },
    PHOENIX_EMBER_QUILL: { quillType: "PHOENIX_EMBER_QUILL", maxInkDurability: 180, inscribingPower: 65, baseSuccessRatePercent: 92, calligraphyBonusPercent: 20 },
    VOID_DRAGON_QUILL: { quillType: "VOID_DRAGON_QUILL", maxInkDurability: 300, inscribingPower: 120, baseSuccessRatePercent: 99, calligraphyBonusPercent: 35 },
};

export const RECIPE_CATALOG: Record<SpellbookTomeRecipeType, SpellbookRecipeData> = {
    TOME_OF_ARCANE_MISSILES: { recipeType: "TOME_OF_ARCANE_MISSILES", requiredParchmentType: "PAPYRUS_OF_SWIFTNESS", requiredParchmentCount: 2, baseSpellPower: 35, baseManaCostReductionPercent: 10 },
    GRIMOIRE_OF_CATACLYSMIC_INFERNO: { recipeType: "GRIMOIRE_OF_CATACLYSMIC_INFERNO", requiredParchmentType: "VELLUM_OF_PYROMANCY", requiredParchmentCount: 2, baseSpellPower: 70, baseManaCostReductionPercent: 20 },
    CODEX_OF_DIMENSIONAL_RUPTURE: { recipeType: "CODEX_OF_DIMENSIONAL_RUPTURE", requiredParchmentType: "VOID_ASTRAL_PARCHMENT", requiredParchmentCount: 2, baseSpellPower: 110, baseManaCostReductionPercent: 35 },
};

export class AncientRunicInscribingSpellbookTomeEngine {
    public static readonly INK_COST_PER_INSCRIPTION = 12;

    /**
     * Constructs and initializes an astral quill.
     */
    public static forgeAstralQuill(
        scribePlayerId: string,
        quillType: AstralQuillType,
        currentEpochMs = Date.now()
    ): ActiveAstralQuill {
        const data = QUILL_CATALOG[quillType];
        if (!data) {
            throw new Error(`Unsupported astral quill type: ${String(quillType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            quillId: `quill_${quillType.toLowerCase()}_${uuid}`,
            scribePlayerId,
            quillType,
            currentInkDurability: data.maxInkDurability,
            maxInkDurability: data.maxInkDurability,
            inscribingPower: data.inscribingPower,
            hasInk: true,
        };
    }

    /**
     * Inscribes a spellbook tome from arcane parchments with material consumption reporting.
     */
    public static inscribeTome(
        quill: ActiveAstralQuill,
        recipeType: SpellbookTomeRecipeType,
        providedParchments: ArcaneParchmentType[],
        inscribeRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; inscribedTome?: InscribedSpellbookTome; remainingInkDurability: number; reason?: string } {
        if (!quill || !quill.hasInk || quill.currentInkDurability < this.INK_COST_PER_INSCRIPTION) {
            return {
                success: false,
                remainingInkDurability: quill?.currentInkDurability ?? 0,
                reason: `Astral quill is out of ink or lacks durability (requires ${this.INK_COST_PER_INSCRIPTION}).`,
            };
        }

        const recipe = RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingInkDurability: quill.currentInkDurability, reason: `Unknown spellbook recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedParchments)) {
            return { success: false, remainingInkDurability: quill.currentInkDurability, reason: "Invalid parchments array." };
        }

        // Count matching parchments
        const matchingCount = providedParchments.filter(p => p === recipe.requiredParchmentType).length;
        if (matchingCount < recipe.requiredParchmentCount) {
            return {
                success: false,
                remainingInkDurability: quill.currentInkDurability,
                reason: `Insufficient parchments: requires ${recipe.requiredParchmentCount}x ${recipe.requiredParchmentType}, provided ${matchingCount}.`,
            };
        }

        // Deduct ink durability
        quill.currentInkDurability -= this.INK_COST_PER_INSCRIPTION;
        if (quill.currentInkDurability <= 0) {
            quill.currentInkDurability = Math.max(0, quill.currentInkDurability);
            quill.hasInk = false;
        }

        const quillData = QUILL_CATALOG[quill.quillType];
        const safeRoll = Number.isFinite(inscribeRoll) ? Math.max(0, Math.min(1, inscribeRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > quillData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingInkDurability: quill.currentInkDurability,
                reason: `Inscribing botched: ink blotted on parchment, rolled ${rollPercent.toFixed(1)}, needed <= ${quillData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate calligraphy quality score (0% to 100%)
        const qualityScore = Math.max(0, Math.min(100, Math.round(50 + (safeRoll * 30) + quillData.calligraphyBonusPercent)));
        const qualityMultiplier = 0.8 + ((qualityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSpellPower = Math.round(recipe.baseSpellPower * qualityMultiplier);
        const finalManaReduction = Math.round(recipe.baseManaCostReductionPercent * qualityMultiplier);

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const tome: InscribedSpellbookTome = {
            tomeId: `tome_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSpellPower,
            finalManaCostReductionPercent: finalManaReduction,
            calligraphyQualityPercent: qualityScore,
            consumedParchmentCount: recipe.requiredParchmentCount,
            consumedParchmentType: recipe.requiredParchmentType,
            inscribedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            inscribedTome: tome,
            remainingInkDurability: quill.currentInkDurability,
        };
    }

    /**
     * Refills astral quill with arcane ink.
     */
    public static refillInk(
        quill: ActiveAstralQuill,
        inkAmount = 60
    ): { success: boolean; newInkDurability: number; hasInk: boolean } {
        if (!quill) return { success: false, newInkDurability: 0, hasInk: false };

        const amt = Number.isFinite(inkAmount) ? Math.max(0, inkAmount) : 60;
        quill.currentInkDurability = Math.min(quill.maxInkDurability, quill.currentInkDurability + amt);
        quill.hasInk = quill.currentInkDurability > 0;

        return {
            success: true,
            newInkDurability: quill.currentInkDurability,
            hasInk: quill.hasInk,
        };
    }
}