import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Cavesson Bench, Mithril Noseband Rig & Celestial Valkyrie Cavesson Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian cavesson crafting benches and noseband-tension rigs (Elder Cavesson Bench, Runic Oak Cavesson Rig, Celestial Void Valkyrie Cavesson Sanctum),
 * raw tanned colt cavesson straps and tempered mithril cavesson nose ring sets (Tanned Colt Cavesson Strap, Tempered Mithril Cavesson Nose Ring, Celestial Void Astral Cavesson Pelt),
 * novice expedition cavessons and sovereign aerial cavesson recipes (Novice Expedition Cavesson, Warmaster Mithril Reinforced Cavesson, Celestial Void Valkyrie Sovereign Cavesson),
 * independent steed lateral-flexion control ratings and jaw pressure distribution ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped lateral flexion control bonus and jaw pressure distribution scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse cavesson bench maintenance.
 */

export type CavessonBenchType = "ELDER_CAVESSON_BENCH" | "RUNIC_OAK_CAVESSON_RIG" | "CELESTIAL_VOID_VALKYRIE_CAVESSON_SANCTUM";
export type RawLeatherCavessonType = "TANNED_COLT_CAVESSON_STRAP" | "TEMPERED_MITHRIL_CAVESSON_NOSE_RING" | "CELESTIAL_VOID_ASTRAL_CAVESSON_PELT";
export type CavessonRecipeType = "NOVICE_EXPEDITION_CAVESSON" | "WARMASTER_MITHRIL_REINFORCED_CAVESSON" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CAVESSON";

export interface CavessonBenchData {
    benchType: CavessonBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    cavessonStabilityBonusPercent: number;
}

export interface CavessonRecipeData {
    recipeType: CavessonRecipeType;
    requiredLeatherType: RawLeatherCavessonType;
    requiredLeatherCount: number;
    baseLateralFlexionControlPercent: number;
    baseJawPressureDistributionPercent: number;
}

export interface ActiveCavessonBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CavessonBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseCavesson {
    cavessonId: string;
    recipeType: CavessonRecipeType;
    finalLateralFlexionControlPercent: number;
    finalJawPressureDistributionPercent: number;
    cavessonAnchorStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCavessonType;
    remainingProvidedLeathers: RawLeatherCavessonType[];
    craftedEpochMs: number;
}

export const CAVESSON_BENCH_CATALOG: Record<CavessonBenchType, CavessonBenchData> = {
    ELDER_CAVESSON_BENCH: { benchType: "ELDER_CAVESSON_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, cavessonStabilityBonusPercent: 14 },
    RUNIC_OAK_CAVESSON_RIG: { benchType: "RUNIC_OAK_CAVESSON_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, cavessonStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CAVESSON_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CAVESSON_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, cavessonStabilityBonusPercent: 40 },
};

export const CAVESSON_RECIPE_CATALOG: Record<CavessonRecipeType, CavessonRecipeData> = {
    NOVICE_EXPEDITION_CAVESSON: { recipeType: "NOVICE_EXPEDITION_CAVESSON", requiredLeatherType: "TANNED_COLT_CAVESSON_STRAP", requiredLeatherCount: 2, baseLateralFlexionControlPercent: 24, baseJawPressureDistributionPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_CAVESSON: { recipeType: "WARMASTER_MITHRIL_REINFORCED_CAVESSON", requiredLeatherType: "TEMPERED_MITHRIL_CAVESSON_NOSE_RING", requiredLeatherCount: 2, baseLateralFlexionControlPercent: 50, baseJawPressureDistributionPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CAVESSON: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CAVESSON", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CAVESSON_PELT", requiredLeatherCount: 2, baseLateralFlexionControlPercent: 84, baseJawPressureDistributionPercent: 64 },
};

export class AncientRunicLeatherHorseCavessonBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CAVESSON_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(CAVESSON_BENCH_CATALOG).map(b => b.cavessonStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse cavesson crafting bench or noseband-tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: CavessonBenchType
    ): ActiveCavessonBench {
        const data = CAVESSON_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse cavesson bench type: ${String(benchType)}`);
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
     * Stitches and tensions cavesson straps and tempered mithril nose rings into horse cavessons.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftCavesson(
        bench: ActiveCavessonBench,
        recipeType: CavessonRecipeType,
        providedLeathers: RawLeatherCavessonType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; cavesson?: CraftedHorseCavesson; updatedBench?: ActiveCavessonBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCavessonType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse cavesson bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CAVESSON_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CAVESSON_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse cavesson recipe: ${String(recipeType)}` };
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
                reason: `Insufficient cavesson straps/nose rings: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Cavesson strap misaligned: mithril nose ring distorted under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent cavesson anchor stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.cavessonStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalLateral = Math.max(0, Math.min(100, Math.round(recipe.baseLateralFlexionControlPercent * qualityMultiplier)));
        const finalJaw = Math.max(0, Math.min(100, Math.round(recipe.baseJawPressureDistributionPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const cavesson: CraftedHorseCavesson = {
            cavessonId: `cavesson_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalLateralFlexionControlPercent: finalLateral,
            finalJawPressureDistributionPercent: finalJaw,
            cavessonAnchorStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            cavesson,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse cavesson bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveCavessonBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveCavessonBench; newDurability: number; isFunctional: boolean } {
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
