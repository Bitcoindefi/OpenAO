import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Flank Cinch Bench, Mithril Buckle Tension Rig & Celestial Valkyrie Flank Sanctum Engine for OpenAO MMORPG.
 * Simulates rear cinch stitching benches and buckle tension rigs (Elder Flank Cinch Bench, Runic Oak Flank Cinch Rig, Celestial Void Valkyrie Flank Sanctum),
 * raw tanned buffalo flank cinch straps and tempered mithril flank buckle sets (Tanned Buffalo Flank Cinch Strap, Tempered Mithril Flank Buckle Set, Celestial Void Astral Flank Pelt),
 * novice rear stabilizer flank cinches and sovereign aerial flank cinch recipes (Novice Rear Stabilizer Flank Cinch, Warmaster Mithril Buckled Flank Cinch, Celestial Void Valkyrie Sovereign Flank Cinch),
 * independent steed incline-stability ratings and saddle roll mitigation ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped incline stability bonus and saddle roll mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse flank cinch bench maintenance.
 */

export type FlankCinchBenchType = "ELDER_FLANK_CINCH_BENCH" | "RUNIC_OAK_FLANK_CINCH_RIG" | "CELESTIAL_VOID_VALKYRIE_FLANK_SANCTUM";
export type RawLeatherFlankCinchType = "TANNED_BUFFALO_FLANK_CINCH_STRAP" | "TEMPERED_MITHRIL_FLANK_BUCKLE_SET" | "CELESTIAL_VOID_ASTRAL_FLANK_PELT";
export type FlankCinchRecipeType = "NOVICE_REAR_STABILIZER_FLANK_CINCH" | "WARMASTER_MITHRIL_BUCKLED_FLANK_CINCH" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLANK_CINCH";

export interface FlankCinchBenchData {
    benchType: FlankCinchBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    flankStabilityBonusPercent: number;
}

export interface FlankCinchRecipeData {
    recipeType: FlankCinchRecipeType;
    requiredLeatherType: RawLeatherFlankCinchType;
    requiredLeatherCount: number;
    baseInclineStabilityPercent: number;
    baseSaddleRollMitigationPercent: number;
}

export interface ActiveFlankCinchBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: FlankCinchBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseFlankCinch {
    flankCinchId: string;
    recipeType: FlankCinchRecipeType;
    finalInclineStabilityPercent: number;
    finalSaddleRollMitigationPercent: number;
    flankTensionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherFlankCinchType;
    remainingProvidedLeathers: RawLeatherFlankCinchType[];
    craftedEpochMs: number;
}

export const FLANK_CINCH_BENCH_CATALOG: Record<FlankCinchBenchType, FlankCinchBenchData> = {
    ELDER_FLANK_CINCH_BENCH: { benchType: "ELDER_FLANK_CINCH_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, flankStabilityBonusPercent: 14 },
    RUNIC_OAK_FLANK_CINCH_RIG: { benchType: "RUNIC_OAK_FLANK_CINCH_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, flankStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_FLANK_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_FLANK_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, flankStabilityBonusPercent: 40 },
};

export const FLANK_CINCH_RECIPE_CATALOG: Record<FlankCinchRecipeType, FlankCinchRecipeData> = {
    NOVICE_REAR_STABILIZER_FLANK_CINCH: { recipeType: "NOVICE_REAR_STABILIZER_FLANK_CINCH", requiredLeatherType: "TANNED_BUFFALO_FLANK_CINCH_STRAP", requiredLeatherCount: 2, baseInclineStabilityPercent: 24, baseSaddleRollMitigationPercent: 14 },
    WARMASTER_MITHRIL_BUCKLED_FLANK_CINCH: { recipeType: "WARMASTER_MITHRIL_BUCKLED_FLANK_CINCH", requiredLeatherType: "TEMPERED_MITHRIL_FLANK_BUCKLE_SET", requiredLeatherCount: 2, baseInclineStabilityPercent: 50, baseSaddleRollMitigationPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLANK_CINCH: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLANK_CINCH", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_FLANK_PELT", requiredLeatherCount: 2, baseInclineStabilityPercent: 84, baseSaddleRollMitigationPercent: 64 },
};

export class AncientRunicLeatherHorseFlankCinchBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(FLANK_CINCH_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(FLANK_CINCH_BENCH_CATALOG).map(b => b.flankStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse flank cinch stitching bench or buckle tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: FlankCinchBenchType
    ): ActiveFlankCinchBench {
        const data = FLANK_CINCH_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse flank cinch bench type: ${String(benchType)}`);
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
     * Stitches and tensions rear cinch straps and tempered mithril buckle sets into horse flank cinches.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftFlankCinch(
        bench: ActiveFlankCinchBench,
        recipeType: FlankCinchRecipeType,
        providedLeathers: RawLeatherFlankCinchType[],
        craftRoll?: number,
        tensionRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; flankCinch?: CraftedHorseFlankCinch; updatedBench?: ActiveFlankCinchBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherFlankCinchType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse flank cinch bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = FLANK_CINCH_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = FLANK_CINCH_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse flank cinch recipe: ${String(recipeType)}` };
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
                reason: `Insufficient flank cinch straps/buckle sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Flank cinch strap misaligned: mithril buckle frame warped under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent flank tension score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeTensionRoll = typeof tensionRoll === "number" && Number.isFinite(tensionRoll) ? Math.max(0, Math.min(1, tensionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.flankStabilityBonusPercent / maxBonus) * 20;
        const tensionScore = Math.max(0, Math.min(100, Math.round(
            (safeTensionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((tensionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalStability = Math.max(0, Math.min(100, Math.round(recipe.baseInclineStabilityPercent * qualityMultiplier)));
        const finalRollMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseSaddleRollMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const flankCinch: CraftedHorseFlankCinch = {
            flankCinchId: `flankcinch_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalInclineStabilityPercent: finalStability,
            finalSaddleRollMitigationPercent: finalRollMitigation,
            flankTensionPercent: tensionScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            flankCinch,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse flank cinch bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveFlankCinchBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveFlankCinchBench; newDurability: number; isFunctional: boolean } {
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
