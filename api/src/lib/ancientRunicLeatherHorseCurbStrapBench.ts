import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Curb Strap Bench, Mithril Fulcrum Rig & Celestial Valkyrie Curb Strap Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian curb strap crafting benches and fulcrum-tension rigs (Elder Curb Strap Bench, Runic Oak Curb Strap Rig, Celestial Void Valkyrie Curb Strap Sanctum),
 * raw tanned mare curb straps and tempered mithril curb fulcrum hook sets (Tanned Mare Curb Strap, Tempered Mithril Curb Fulcrum Hook, Celestial Void Astral Curb Pelt),
 * novice expedition curb straps and sovereign aerial curb strap recipes (Novice Expedition Curb Strap, Warmaster Mithril Reinforced Curb Strap, Celestial Void Valkyrie Sovereign Curb Strap),
 * independent steed curb-bit leverage regulation ratings and mandibular comfort ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped curb bit leverage regulation bonus and mandibular comfort scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse curb strap bench maintenance.
 */

export type CurbStrapBenchType = "ELDER_CURB_STRAP_BENCH" | "RUNIC_OAK_CURB_STRAP_RIG" | "CELESTIAL_VOID_VALKYRIE_CURB_STRAP_SANCTUM";
export type RawLeatherCurbStrapType = "TANNED_MARE_CURB_STRAP" | "TEMPERED_MITHRIL_CURB_FULCRUM_HOOK" | "CELESTIAL_VOID_ASTRAL_CURB_PELT";
export type CurbStrapRecipeType = "NOVICE_EXPEDITION_CURB_STRAP" | "WARMASTER_MITHRIL_REINFORCED_CURB_STRAP" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CURB_STRAP";

export interface CurbStrapBenchData {
    benchType: CurbStrapBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    curbStrapStabilityBonusPercent: number;
}

export interface CurbStrapRecipeData {
    recipeType: CurbStrapRecipeType;
    requiredLeatherType: RawLeatherCurbStrapType;
    requiredLeatherCount: number;
    baseCurbBitLeverageRegulationPercent: number;
    baseMandibularComfortPercent: number;
}

export interface ActiveCurbStrapBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CurbStrapBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseCurbStrap {
    curbStrapId: string;
    recipeType: CurbStrapRecipeType;
    finalCurbBitLeverageRegulationPercent: number;
    finalMandibularComfortPercent: number;
    curbStrapAnchorStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCurbStrapType;
    remainingProvidedLeathers: RawLeatherCurbStrapType[];
    craftedEpochMs: number;
}

export const CURB_STRAP_BENCH_CATALOG: Record<CurbStrapBenchType, CurbStrapBenchData> = {
    ELDER_CURB_STRAP_BENCH: { benchType: "ELDER_CURB_STRAP_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, curbStrapStabilityBonusPercent: 14 },
    RUNIC_OAK_CURB_STRAP_RIG: { benchType: "RUNIC_OAK_CURB_STRAP_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, curbStrapStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CURB_STRAP_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CURB_STRAP_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, curbStrapStabilityBonusPercent: 40 },
};

export const CURB_STRAP_RECIPE_CATALOG: Record<CurbStrapRecipeType, CurbStrapRecipeData> = {
    NOVICE_EXPEDITION_CURB_STRAP: { recipeType: "NOVICE_EXPEDITION_CURB_STRAP", requiredLeatherType: "TANNED_MARE_CURB_STRAP", requiredLeatherCount: 2, baseCurbBitLeverageRegulationPercent: 24, baseMandibularComfortPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_CURB_STRAP: { recipeType: "WARMASTER_MITHRIL_REINFORCED_CURB_STRAP", requiredLeatherType: "TEMPERED_MITHRIL_CURB_FULCRUM_HOOK", requiredLeatherCount: 2, baseCurbBitLeverageRegulationPercent: 50, baseMandibularComfortPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CURB_STRAP: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CURB_STRAP", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CURB_PELT", requiredLeatherCount: 2, baseCurbBitLeverageRegulationPercent: 84, baseMandibularComfortPercent: 64 },
};

export class AncientRunicLeatherHorseCurbStrapBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CURB_STRAP_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(CURB_STRAP_BENCH_CATALOG).map(b => b.curbStrapStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse curb strap crafting bench or fulcrum-tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: CurbStrapBenchType
    ): ActiveCurbStrapBench {
        const data = CURB_STRAP_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse curb strap bench type: ${String(benchType)}`);
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
     * Stitches and tensions curb straps and tempered mithril fulcrum hooks into horse curb straps.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftCurbStrap(
        bench: ActiveCurbStrapBench,
        recipeType: CurbStrapRecipeType,
        providedLeathers: RawLeatherCurbStrapType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; curbStrap?: CraftedHorseCurbStrap; updatedBench?: ActiveCurbStrapBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCurbStrapType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse curb strap bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CURB_STRAP_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CURB_STRAP_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse curb strap recipe: ${String(recipeType)}` };
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
                reason: `Insufficient curb straps/fulcrum hooks: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Curb strap misaligned: mithril fulcrum hook sprung under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent curb strap anchor stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.curbStrapStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalLeverage = Math.max(0, Math.min(100, Math.round(recipe.baseCurbBitLeverageRegulationPercent * qualityMultiplier)));
        const finalComfort = Math.max(0, Math.min(100, Math.round(recipe.baseMandibularComfortPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const curbStrap: CraftedHorseCurbStrap = {
            curbStrapId: `curbstrap_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalCurbBitLeverageRegulationPercent: finalLeverage,
            finalMandibularComfortPercent: finalComfort,
            curbStrapAnchorStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            curbStrap,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse curb strap bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveCurbStrapBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveCurbStrapBench; newDurability: number; isFunctional: boolean } {
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
