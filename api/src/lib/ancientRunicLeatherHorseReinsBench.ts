import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Reins Bench, Mithril Bit-Coupling Clasp & Celestial Valkyrie Steerage Engine for OpenAO MMORPG.
 * Simulates split reins strap braiding benches and bit coupling rigs (Yew Reins Bench, Runic Ash Bridle Rig, Celestial Void Valkyrie Steerage Sanctum),
 * raw tanned buffalo split rein straps and tempered mithril bit coupling clasp sets (Tanned Buffalo Split Rein Strap, Tempered Mithril Bit-Coupling Clasp, Celestial Void Astral Rein Pelt),
 * novice trail split reins and sovereign aerial rein recipes (Novice Trail Split Reins, Warmaster Mithril Coupling Reins, Celestial Void Valkyrie Sovereign Reins),
 * independent steed turning lag mitigation & steerage responsiveness ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped turning lag mitigation bonus and steerage precision scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse reins bench maintenance.
 */

export type ReinsBenchType = "YEW_REINS_BENCH" | "RUNIC_ASH_BRIDLE_RIG" | "CELESTIAL_VOID_VALKYRIE_STEERAGE_SANCTUM";
export type RawLeatherReinsType = "TANNED_BUFFALO_SPLIT_REIN_STRAP" | "TEMPERED_MITHRIL_BIT_COUPLING_CLASP" | "CELESTIAL_VOID_ASTRAL_REIN_PELT";
export type ReinsRecipeType = "NOVICE_TRAIL_SPLIT_REINS" | "WARMASTER_MITHRIL_COUPLING_REINS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS";

export interface ReinsBenchData {
    benchType: ReinsBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    steerageResponsivenessBonusPercent: number;
}

export interface ReinsRecipeData {
    recipeType: ReinsRecipeType;
    requiredLeatherType: RawLeatherReinsType;
    requiredLeatherCount: number;
    baseTurningLagMitigationPercent: number;
    baseSteeragePrecisionBonusPercent: number;
}

export interface ActiveReinsBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: ReinsBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseReins {
    reinsId: string;
    recipeType: ReinsRecipeType;
    finalTurningLagMitigationPercent: number;
    finalSteeragePrecisionBonusPercent: number;
    steerageResponsivenessPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherReinsType;
    remainingProvidedLeathers: RawLeatherReinsType[];
    craftedEpochMs: number;
}

export const REINS_BENCH_CATALOG: Record<ReinsBenchType, ReinsBenchData> = {
    YEW_REINS_BENCH: { benchType: "YEW_REINS_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, steerageResponsivenessBonusPercent: 14 },
    RUNIC_ASH_BRIDLE_RIG: { benchType: "RUNIC_ASH_BRIDLE_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, steerageResponsivenessBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_STEERAGE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_STEERAGE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, steerageResponsivenessBonusPercent: 40 },
};

export const REINS_RECIPE_CATALOG: Record<ReinsRecipeType, ReinsRecipeData> = {
    NOVICE_TRAIL_SPLIT_REINS: { recipeType: "NOVICE_TRAIL_SPLIT_REINS", requiredLeatherType: "TANNED_BUFFALO_SPLIT_REIN_STRAP", requiredLeatherCount: 2, baseTurningLagMitigationPercent: 24, baseSteeragePrecisionBonusPercent: 14 },
    WARMASTER_MITHRIL_COUPLING_REINS: { recipeType: "WARMASTER_MITHRIL_COUPLING_REINS", requiredLeatherType: "TEMPERED_MITHRIL_BIT_COUPLING_CLASP", requiredLeatherCount: 2, baseTurningLagMitigationPercent: 50, baseSteeragePrecisionBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_REINS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_REIN_PELT", requiredLeatherCount: 2, baseTurningLagMitigationPercent: 84, baseSteeragePrecisionBonusPercent: 64 },
};

export class AncientRunicLeatherHorseReinsBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(REINS_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(REINS_BENCH_CATALOG).map(b => b.steerageResponsivenessBonusPercent), 1),
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
     * Constructs and initializes a horse reins braiding bench or bridle rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: ReinsBenchType
    ): ActiveReinsBench {
        const data = REINS_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse reins bench type: ${String(benchType)}`);
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
     * Braids and rivets split rein straps and tempered mithril bit coupling clasps into horse reins.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftReins(
        bench: ActiveReinsBench,
        recipeType: ReinsRecipeType,
        providedLeathers: RawLeatherReinsType[],
        craftRoll?: number,
        responsivenessRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; reins?: CraftedHorseReins; updatedBench?: ActiveReinsBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherReinsType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse reins bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = REINS_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = REINS_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse reins recipe: ${String(recipeType)}` };
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
                reason: `Insufficient rein straps/bit clasps: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Rein braid misaligned: mithril bit clasp distorted during riveting, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent steerage responsiveness score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeRespRoll = typeof responsivenessRoll === "number" && Number.isFinite(responsivenessRoll) ? Math.max(0, Math.min(1, responsivenessRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.steerageResponsivenessBonusPercent / maxBonus) * 20;
        const respScore = Math.max(0, Math.min(100, Math.round(
            (safeRespRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((respScore / 100) * 0.4); // 0.8 to 1.2x

        const finalLagMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseTurningLagMitigationPercent * qualityMultiplier)));
        const finalPrecisionBonus = Math.max(0, Math.min(100, Math.round(recipe.baseSteeragePrecisionBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const reins: CraftedHorseReins = {
            reinsId: `reins_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalTurningLagMitigationPercent: finalLagMitigation,
            finalSteeragePrecisionBonusPercent: finalPrecisionBonus,
            steerageResponsivenessPercent: respScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            reins,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse reins bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveReinsBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveReinsBench; newDurability: number; isFunctional: boolean } {
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
