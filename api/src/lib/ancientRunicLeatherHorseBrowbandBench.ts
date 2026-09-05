import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Browband Bench, Mithril Rosette Clasp & Celestial Valkyrie Temple Sanctum Engine for OpenAO MMORPG.
 * Simulates forehead strap stitching benches and rosette tension rigs (Elder Browband Stitching Bench, Runic Ash Browband Rig, Celestial Void Valkyrie Temple Sanctum),
 * raw tanned buffalo browband straps and tempered mithril rosette clasp sets (Tanned Buffalo Browband Strap, Tempered Mithril Rosette Clasp Set, Celestial Void Astral Browband Pelt),
 * novice equine headpiece browbands and sovereign aerial browband recipes (Novice Equine Headpiece Browband, Warmaster Mithril Studded Browband, Celestial Void Valkyrie Sovereign Browband),
 * independent steed bridle-stability ratings and willpower control ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped bridle stability bonus and willpower control scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse browband bench maintenance.
 */

export type BrowbandBenchType = "ELDER_BROWBAND_STITCHING_BENCH" | "RUNIC_ASH_BROWBAND_RIG" | "CELESTIAL_VOID_VALKYRIE_TEMPLE_SANCTUM";
export type RawLeatherBrowbandType = "TANNED_BUFFALO_BROWBAND_STRAP" | "TEMPERED_MITHRIL_ROSETTE_CLASP_SET" | "CELESTIAL_VOID_ASTRAL_BROWBAND_PELT";
export type BrowbandRecipeType = "NOVICE_EQUINE_HEADPIECE_BROWBAND" | "WARMASTER_MITHRIL_STUDDED_BROWBAND" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND";

export interface BrowbandBenchData {
    benchType: BrowbandBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    browbandTensionBonusPercent: number;
}

export interface BrowbandRecipeData {
    recipeType: BrowbandRecipeType;
    requiredLeatherType: RawLeatherBrowbandType;
    requiredLeatherCount: number;
    baseBridleStabilityPercent: number;
    baseWillpowerControlBonusPercent: number;
}

export interface ActiveBrowbandBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BrowbandBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseBrowband {
    browbandId: string;
    recipeType: BrowbandRecipeType;
    finalBridleStabilityPercent: number;
    finalWillpowerControlBonusPercent: number;
    browbandTensionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBrowbandType;
    remainingProvidedLeathers: RawLeatherBrowbandType[];
    craftedEpochMs: number;
}

export const BROWBAND_BENCH_CATALOG: Record<BrowbandBenchType, BrowbandBenchData> = {
    ELDER_BROWBAND_STITCHING_BENCH: { benchType: "ELDER_BROWBAND_STITCHING_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, browbandTensionBonusPercent: 14 },
    RUNIC_ASH_BROWBAND_RIG: { benchType: "RUNIC_ASH_BROWBAND_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, browbandTensionBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_TEMPLE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_TEMPLE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, browbandTensionBonusPercent: 40 },
};

export const BROWBAND_RECIPE_CATALOG: Record<BrowbandRecipeType, BrowbandRecipeData> = {
    NOVICE_EQUINE_HEADPIECE_BROWBAND: { recipeType: "NOVICE_EQUINE_HEADPIECE_BROWBAND", requiredLeatherType: "TANNED_BUFFALO_BROWBAND_STRAP", requiredLeatherCount: 2, baseBridleStabilityPercent: 24, baseWillpowerControlBonusPercent: 14 },
    WARMASTER_MITHRIL_STUDDED_BROWBAND: { recipeType: "WARMASTER_MITHRIL_STUDDED_BROWBAND", requiredLeatherType: "TEMPERED_MITHRIL_ROSETTE_CLASP_SET", requiredLeatherCount: 2, baseBridleStabilityPercent: 50, baseWillpowerControlBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BROWBAND", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_BROWBAND_PELT", requiredLeatherCount: 2, baseBridleStabilityPercent: 84, baseWillpowerControlBonusPercent: 64 },
};

export class AncientRunicLeatherHorseBrowbandBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BROWBAND_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(BROWBAND_BENCH_CATALOG).map(b => b.browbandTensionBonusPercent), 1),
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
     * Constructs and initializes a horse browband stitching bench or rosette tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: BrowbandBenchType
    ): ActiveBrowbandBench {
        const data = BROWBAND_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse browband bench type: ${String(benchType)}`);
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
     * Stitches and tensions forehead straps and tempered mithril rosette clasps into horse browbands.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftBrowband(
        bench: ActiveBrowbandBench,
        recipeType: BrowbandRecipeType,
        providedLeathers: RawLeatherBrowbandType[],
        craftRoll?: number,
        tensionRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; browband?: CraftedHorseBrowband; updatedBench?: ActiveBrowbandBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBrowbandType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse browband bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BROWBAND_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BROWBAND_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse browband recipe: ${String(recipeType)}` };
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
                reason: `Insufficient browband straps/rosette clasps: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Browband strap misaligned: mithril rosette clasp snapped under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent browband tension score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeTensionRoll = typeof tensionRoll === "number" && Number.isFinite(tensionRoll) ? Math.max(0, Math.min(1, tensionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.browbandTensionBonusPercent / maxBonus) * 20;
        const tensionScore = Math.max(0, Math.min(100, Math.round(
            (safeTensionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((tensionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalStability = Math.max(0, Math.min(100, Math.round(recipe.baseBridleStabilityPercent * qualityMultiplier)));
        const finalWillpowerBonus = Math.max(0, Math.min(100, Math.round(recipe.baseWillpowerControlBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const browband: CraftedHorseBrowband = {
            browbandId: `browband_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalBridleStabilityPercent: finalStability,
            finalWillpowerControlBonusPercent: finalWillpowerBonus,
            browbandTensionPercent: tensionScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            browband,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse browband bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveBrowbandBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveBrowbandBench; newDurability: number; isFunctional: boolean } {
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
