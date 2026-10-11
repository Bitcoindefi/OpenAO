import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Girth Extender Bench, Mithril Tongue Buckle Rig & Celestial Valkyrie Girth Extender Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian girth extender crafting benches and tongue-buckle tension rigs (Elder Girth Extender Bench, Runic Oak Girth Extender Rig, Celestial Void Valkyrie Girth Extender Sanctum),
 * raw tanned bull girth extender straps and tempered mithril double tongue buckle sets (Tanned Bull Girth Extender Strap, Tempered Mithril Double Tongue Buckle, Celestial Void Astral Girth Extender Pelt),
 * novice expedition girth extenders and sovereign aerial girth extender recipes (Novice Expedition Girth Extender, Warmaster Mithril Reinforced Girth Extender, Celestial Void Valkyrie Sovereign Girth Extender),
 * independent steed ribcage-breathing flexibility ratings and billet extension security ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped ribcage breathing flexibility bonus and billet extension security scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse girth extender bench maintenance.
 */

export type GirthExtenderBenchType = "ELDER_GIRTH_EXTENDER_BENCH" | "RUNIC_OAK_GIRTH_EXTENDER_RIG" | "CELESTIAL_VOID_VALKYRIE_GIRTH_EXTENDER_SANCTUM";
export type RawLeatherGirthExtenderType = "TANNED_BULL_GIRTH_EXTENDER_STRAP" | "TEMPERED_MITHRIL_DOUBLE_TONGUE_BUCKLE" | "CELESTIAL_VOID_ASTRAL_GIRTH_EXTENDER_PELT";
export type GirthExtenderRecipeType = "NOVICE_EXPEDITION_GIRTH_EXTENDER" | "WARMASTER_MITHRIL_REINFORCED_GIRTH_EXTENDER" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH_EXTENDER";

export interface GirthExtenderBenchData {
    benchType: GirthExtenderBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    girthExtenderStabilityBonusPercent: number;
}

export interface GirthExtenderRecipeData {
    recipeType: GirthExtenderRecipeType;
    requiredLeatherType: RawLeatherGirthExtenderType;
    requiredLeatherCount: number;
    baseRibcageBreathingFlexibilityPercent: number;
    baseBilletExtensionSecurityPercent: number;
}

export interface ActiveGirthExtenderBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: GirthExtenderBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseGirthExtender {
    girthExtenderId: string;
    recipeType: GirthExtenderRecipeType;
    finalRibcageBreathingFlexibilityPercent: number;
    finalBilletExtensionSecurityPercent: number;
    girthExtenderAnchorStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherGirthExtenderType;
    remainingProvidedLeathers: RawLeatherGirthExtenderType[];
    craftedEpochMs: number;
}

export const GIRTH_EXTENDER_BENCH_CATALOG: Record<GirthExtenderBenchType, GirthExtenderBenchData> = {
    ELDER_GIRTH_EXTENDER_BENCH: { benchType: "ELDER_GIRTH_EXTENDER_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, girthExtenderStabilityBonusPercent: 14 },
    RUNIC_OAK_GIRTH_EXTENDER_RIG: { benchType: "RUNIC_OAK_GIRTH_EXTENDER_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, girthExtenderStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_GIRTH_EXTENDER_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_GIRTH_EXTENDER_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, girthExtenderStabilityBonusPercent: 40 },
};

export const GIRTH_EXTENDER_RECIPE_CATALOG: Record<GirthExtenderRecipeType, GirthExtenderRecipeData> = {
    NOVICE_EXPEDITION_GIRTH_EXTENDER: { recipeType: "NOVICE_EXPEDITION_GIRTH_EXTENDER", requiredLeatherType: "TANNED_BULL_GIRTH_EXTENDER_STRAP", requiredLeatherCount: 2, baseRibcageBreathingFlexibilityPercent: 24, baseBilletExtensionSecurityPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_GIRTH_EXTENDER: { recipeType: "WARMASTER_MITHRIL_REINFORCED_GIRTH_EXTENDER", requiredLeatherType: "TEMPERED_MITHRIL_DOUBLE_TONGUE_BUCKLE", requiredLeatherCount: 2, baseRibcageBreathingFlexibilityPercent: 50, baseBilletExtensionSecurityPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH_EXTENDER: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH_EXTENDER", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_GIRTH_EXTENDER_PELT", requiredLeatherCount: 2, baseRibcageBreathingFlexibilityPercent: 84, baseBilletExtensionSecurityPercent: 64 },
};

export class AncientRunicLeatherHorseGirthExtenderBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(GIRTH_EXTENDER_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(GIRTH_EXTENDER_BENCH_CATALOG).map(b => b.girthExtenderStabilityBonusPercent), 1),
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
     * Generates a cryptographically secure random float strictly in [0, 1).
     */
    public static generateSecureRoll(): number {
        if (typeof crypto.randomInt === "function") {
            return crypto.randomInt(0, 1000000) / 1000000;
        }
        return crypto.randomBytes(4).readUInt32LE(0) / 0x100000000;
    }

    /**
     * Constructs and initializes a horse girth extender crafting bench or tongue-buckle tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: GirthExtenderBenchType
    ): ActiveGirthExtenderBench {
        const data = GIRTH_EXTENDER_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse girth extender bench type: ${String(benchType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            benchId: `bench_${benchType.toLowerCase()}_${uuid}`,
            leatherworkerPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Stitches and tensions girth extender straps and tempered mithril double tongue buckles into horse girth extenders.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftGirthExtender(
        bench: ActiveGirthExtenderBench,
        recipeType: GirthExtenderRecipeType,
        providedLeathers: RawLeatherGirthExtenderType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; girthExtender?: CraftedHorseGirthExtender; updatedBench?: ActiveGirthExtenderBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherGirthExtenderType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse girth extender bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = GIRTH_EXTENDER_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = GIRTH_EXTENDER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse girth extender recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedLeathers)) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: [], reason: "Invalid leathers array." };
        }

        // Count matching leather materials
        const matchingCount = providedLeathers.filter(l => l === recipe.requiredLeatherType).length;
        if (matchingCount < recipe.requiredLeatherCount) {
            return {
                success: false,
                updatedBench: { ...bench },
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Insufficient girth extender straps/double tongue buckles: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
            };
        }

        // Create updated bench clone
        const updatedBench = { ...bench };

        // Deduct durability on clone
        updatedBench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (updatedBench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            updatedBench.currentDurability = Math.max(0, updatedBench.currentDurability);
            updatedBench.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedLeathers];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredLeatherCount; i--) {
            if (remaining[i] === recipe.requiredLeatherType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = typeof craftRoll === "number" && Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : this.generateSecureRoll();
        const rollPercent = safeRoll * 100;

        if (rollPercent > benchData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedBench,
                remainingDurability: updatedBench.currentDurability,
                remainingProvidedLeathers: remaining,
                reason: `Girth extender strap misaligned: mithril double tongue buckle distorted under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent girth extender anchor stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.girthExtenderStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalBreathing = Math.max(0, Math.min(100, Math.round(recipe.baseRibcageBreathingFlexibilityPercent * qualityMultiplier)));
        const finalSecurity = Math.max(0, Math.min(100, Math.round(recipe.baseBilletExtensionSecurityPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const girthExtender: CraftedHorseGirthExtender = {
            girthExtenderId: `girthextender_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalRibcageBreathingFlexibilityPercent: finalBreathing,
            finalBilletExtensionSecurityPercent: finalSecurity,
            girthExtenderAnchorStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            girthExtender,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse girth extender bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveGirthExtenderBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveGirthExtenderBench; newDurability: number; isFunctional: boolean } {
        if (!bench) return { success: false, newDurability: 0, isFunctional: false };

        const updatedBench = { ...bench };
        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        updatedBench.currentDurability = Math.min(updatedBench.maxDurability, updatedBench.currentDurability + amt);
        updatedBench.isFunctional = updatedBench.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            updatedBench,
            newDurability: updatedBench.currentDurability,
            isFunctional: updatedBench.isFunctional,
        };
    }
}
