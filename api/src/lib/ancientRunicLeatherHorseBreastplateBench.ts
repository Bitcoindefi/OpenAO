import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Breastplate Bench, Mithril Three-Point Ring & Celestial Valkyrie Pectoral Engine for OpenAO MMORPG.
 * Simulates pectoral strap stitching benches and three-point ring tension rigs (Birch Breastplate Bench, Runic Walnut Harness Rig, Celestial Void Valkyrie Pectoral Sanctum),
 * raw tanned buffalo pectoral straps and tempered mithril three-point ring sets (Tanned Buffalo Pectoral Strap, Tempered Mithril Three-Point Ring Set, Celestial Void Astral Breastplate Pelt),
 * novice ridge pectoral breastplates and sovereign aerial breastplate recipes (Novice Ridge Pectoral Breastplate, Warmaster Mithril Three-Point Breastplate, Celestial Void Valkyrie Sovereign Breastplate),
 * independent steed backward-slip mitigation & chest stability ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped backward slip mitigation bonus and chest pressure comfort scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse breastplate bench maintenance.
 */

export type BreastplateBenchType = "BIRCH_BREASTPLATE_BENCH" | "RUNIC_WALNUT_HARNESS_RIG" | "CELESTIAL_VOID_VALKYRIE_PECTORAL_SANCTUM";
export type RawLeatherBreastplateType = "TANNED_BUFFALO_PECTORAL_STRAP" | "TEMPERED_MITHRIL_THREE_POINT_RING_SET" | "CELESTIAL_VOID_ASTRAL_BREASTPLATE_PELT";
export type BreastplateRecipeType = "NOVICE_RIDGE_PECTORAL_BREASTPLATE" | "WARMASTER_MITHRIL_THREE_POINT_BREASTPLATE" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE";

export interface BreastplateBenchData {
    benchType: BreastplateBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    chestStabilityBonusPercent: number;
}

export interface BreastplateRecipeData {
    recipeType: BreastplateRecipeType;
    requiredLeatherType: RawLeatherBreastplateType;
    requiredLeatherCount: number;
    baseBackwardSlipMitigationPercent: number;
    baseChestPressureComfortBonusPercent: number;
}

export interface ActiveBreastplateBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BreastplateBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseBreastplate {
    breastplateId: string;
    recipeType: BreastplateRecipeType;
    finalBackwardSlipMitigationPercent: number;
    finalChestPressureComfortBonusPercent: number;
    chestStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBreastplateType;
    remainingProvidedLeathers: RawLeatherBreastplateType[];
    craftedEpochMs: number;
}

export const BREASTPLATE_BENCH_CATALOG: Record<BreastplateBenchType, BreastplateBenchData> = {
    BIRCH_BREASTPLATE_BENCH: { benchType: "BIRCH_BREASTPLATE_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, chestStabilityBonusPercent: 14 },
    RUNIC_WALNUT_HARNESS_RIG: { benchType: "RUNIC_WALNUT_HARNESS_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, chestStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_PECTORAL_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_PECTORAL_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, chestStabilityBonusPercent: 40 },
};

export const BREASTPLATE_RECIPE_CATALOG: Record<BreastplateRecipeType, BreastplateRecipeData> = {
    NOVICE_RIDGE_PECTORAL_BREASTPLATE: { recipeType: "NOVICE_RIDGE_PECTORAL_BREASTPLATE", requiredLeatherType: "TANNED_BUFFALO_PECTORAL_STRAP", requiredLeatherCount: 2, baseBackwardSlipMitigationPercent: 24, baseChestPressureComfortBonusPercent: 14 },
    WARMASTER_MITHRIL_THREE_POINT_BREASTPLATE: { recipeType: "WARMASTER_MITHRIL_THREE_POINT_BREASTPLATE", requiredLeatherType: "TEMPERED_MITHRIL_THREE_POINT_RING_SET", requiredLeatherCount: 2, baseBackwardSlipMitigationPercent: 50, baseChestPressureComfortBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_BREASTPLATE_PELT", requiredLeatherCount: 2, baseBackwardSlipMitigationPercent: 84, baseChestPressureComfortBonusPercent: 64 },
};

export class AncientRunicLeatherHorseBreastplateBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BREASTPLATE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(BREASTPLATE_BENCH_CATALOG).map(b => b.chestStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse breastplate stitching bench or harness rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: BreastplateBenchType
    ): ActiveBreastplateBench {
        const data = BREASTPLATE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse breastplate bench type: ${String(benchType)}`);
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
     * Stitches and tensions pectoral straps and tempered mithril three-point rings into horse breastplates.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftBreastplate(
        bench: ActiveBreastplateBench,
        recipeType: BreastplateRecipeType,
        providedLeathers: RawLeatherBreastplateType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; breastplate?: CraftedHorseBreastplate; updatedBench?: ActiveBreastplateBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBreastplateType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse breastplate bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BREASTPLATE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BREASTPLATE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse breastplate recipe: ${String(recipeType)}` };
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
                reason: `Insufficient pectoral straps/three-point rings: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Pectoral strap misaligned: mithril three-point ring distorted during tension clamping, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent chest stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.chestStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalBackwardSlipMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseBackwardSlipMitigationPercent * qualityMultiplier)));
        const finalComfortBonus = Math.max(0, Math.min(100, Math.round(recipe.baseChestPressureComfortBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const breastplate: CraftedHorseBreastplate = {
            breastplateId: `breastplate_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalBackwardSlipMitigationPercent: finalBackwardSlipMitigation,
            finalChestPressureComfortBonusPercent: finalComfortBonus,
            chestStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            breastplate,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse breastplate bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveBreastplateBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveBreastplateBench; newDurability: number; isFunctional: boolean } {
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
