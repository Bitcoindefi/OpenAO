import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Throatlatch Bench, Mithril Buckle Tension Rig & Celestial Valkyrie Throatlatch Sanctum Engine for OpenAO MMORPG.
 * Simulates headstall throatlatch stitching benches and submandibular tension rigs (Elder Throatlatch Bench, Runic Ash Throatlatch Rig, Celestial Void Valkyrie Throatlatch Sanctum),
 * raw tanned buffalo throatlatch straps and tempered mithril throat buckle sets (Tanned Buffalo Throatlatch Strap, Tempered Mithril Throat Buckle Set, Celestial Void Astral Throatlatch Pelt),
 * novice submandibular throatlatches and sovereign aerial throatlatch recipes (Novice Submandibular Throatlatch, Warmaster Mithril Buckled Throatlatch, Celestial Void Valkyrie Sovereign Throatlatch),
 * independent steed bridle-retention ratings and combat dislodgement mitigation ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped bridle retention bonus and combat dislodgement mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse throatlatch bench maintenance.
 */

export type ThroatlatchBenchType = "ELDER_THROATLATCH_BENCH" | "RUNIC_ASH_THROATLATCH_RIG" | "CELESTIAL_VOID_VALKYRIE_THROATLATCH_SANCTUM";
export type RawLeatherThroatlatchType = "TANNED_BUFFALO_THROATLATCH_STRAP" | "TEMPERED_MITHRIL_THROAT_BUCKLE_SET" | "CELESTIAL_VOID_ASTRAL_THROATLATCH_PELT";
export type ThroatlatchRecipeType = "NOVICE_SUBMANDIBULAR_THROATLATCH" | "WARMASTER_MITHRIL_BUCKLED_THROATLATCH" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLATCH";

export interface ThroatlatchBenchData {
    benchType: ThroatlatchBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    headstallRetentionBonusPercent: number;
}

export interface ThroatlatchRecipeData {
    recipeType: ThroatlatchRecipeType;
    requiredLeatherType: RawLeatherThroatlatchType;
    requiredLeatherCount: number;
    baseBridleRetentionPercent: number;
    baseCombatDislodgementMitigationPercent: number;
}

export interface ActiveThroatlatchBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: ThroatlatchBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseThroatlatch {
    throatlatchId: string;
    recipeType: ThroatlatchRecipeType;
    finalBridleRetentionPercent: number;
    finalCombatDislodgementMitigationPercent: number;
    headstallRetentionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherThroatlatchType;
    remainingProvidedLeathers: RawLeatherThroatlatchType[];
    craftedEpochMs: number;
}

export const THROATLATCH_BENCH_CATALOG: Record<ThroatlatchBenchType, ThroatlatchBenchData> = {
    ELDER_THROATLATCH_BENCH: { benchType: "ELDER_THROATLATCH_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, headstallRetentionBonusPercent: 14 },
    RUNIC_ASH_THROATLATCH_RIG: { benchType: "RUNIC_ASH_THROATLATCH_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, headstallRetentionBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_THROATLATCH_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_THROATLATCH_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, headstallRetentionBonusPercent: 40 },
};

export const THROATLATCH_RECIPE_CATALOG: Record<ThroatlatchRecipeType, ThroatlatchRecipeData> = {
    NOVICE_SUBMANDIBULAR_THROATLATCH: { recipeType: "NOVICE_SUBMANDIBULAR_THROATLATCH", requiredLeatherType: "TANNED_BUFFALO_THROATLATCH_STRAP", requiredLeatherCount: 2, baseBridleRetentionPercent: 24, baseCombatDislodgementMitigationPercent: 14 },
    WARMASTER_MITHRIL_BUCKLED_THROATLATCH: { recipeType: "WARMASTER_MITHRIL_BUCKLED_THROATLATCH", requiredLeatherType: "TEMPERED_MITHRIL_THROAT_BUCKLE_SET", requiredLeatherCount: 2, baseBridleRetentionPercent: 50, baseCombatDislodgementMitigationPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLATCH: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_THROATLATCH", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_THROATLATCH_PELT", requiredLeatherCount: 2, baseBridleRetentionPercent: 84, baseCombatDislodgementMitigationPercent: 64 },
};

export class AncientRunicLeatherHorseThroatlatchBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(THROATLATCH_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(THROATLATCH_BENCH_CATALOG).map(b => b.headstallRetentionBonusPercent), 1),
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
     * Constructs and initializes a horse throatlatch stitching bench or tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: ThroatlatchBenchType
    ): ActiveThroatlatchBench {
        const data = THROATLATCH_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse throatlatch bench type: ${String(benchType)}`);
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
     * Stitches and tensions submandibular straps and tempered mithril throat buckles into horse throatlatches.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftThroatlatch(
        bench: ActiveThroatlatchBench,
        recipeType: ThroatlatchRecipeType,
        providedLeathers: RawLeatherThroatlatchType[],
        craftRoll?: number,
        retentionRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; throatlatch?: CraftedHorseThroatlatch; updatedBench?: ActiveThroatlatchBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherThroatlatchType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse throatlatch bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = THROATLATCH_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = THROATLATCH_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse throatlatch recipe: ${String(recipeType)}` };
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
                reason: `Insufficient throatlatch straps/throat buckle sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Throatlatch strap misaligned: mithril buckle pin bent under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent retention score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeRetentionRoll = typeof retentionRoll === "number" && Number.isFinite(retentionRoll) ? Math.max(0, Math.min(1, retentionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.headstallRetentionBonusPercent / maxBonus) * 20;
        const retentionScore = Math.max(0, Math.min(100, Math.round(
            (safeRetentionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((retentionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalRetention = Math.max(0, Math.min(100, Math.round(recipe.baseBridleRetentionPercent * qualityMultiplier)));
        const finalMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseCombatDislodgementMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const throatlatch: CraftedHorseThroatlatch = {
            throatlatchId: `throatlatch_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalBridleRetentionPercent: finalRetention,
            finalCombatDislodgementMitigationPercent: finalMitigation,
            headstallRetentionPercent: retentionScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            throatlatch,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse throatlatch bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveThroatlatchBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveThroatlatchBench; newDurability: number; isFunctional: boolean } {
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
