import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Saddle Breeching Bench, Mithril Hip-Strap Buckle & Celestial Valkyrie Declivity Rig Engine for OpenAO MMORPG.
 * Simulates haunch breeching strap stitching benches and hip buckle tension rigs (Ash Saddle Breeching Bench, Runic Ironwood Breeching Rig, Celestial Void Valkyrie Declivity Sanctum),
 * raw tanned buffalo haunch straps and tempered mithril hip buckle sets (Tanned Buffalo Haunch Strap, Tempered Mithril Hip Buckle Set, Celestial Void Astral Breeching Pelt),
 * novice mountain declivity breechings and sovereign aerial breeching recipes (Novice Mountain Declivity Breeching, Warmaster Mithril Hip Breeching, Celestial Void Valkyrie Sovereign Breeching),
 * independent steed declivity braking & haunch stabilization ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped downhill slip mitigation bonus and braking momentum mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse saddle breeching bench maintenance.
 */

export type BreechingBenchType = "ASH_SADDLE_BREECHING_BENCH" | "RUNIC_IRONWOOD_BREECHING_RIG" | "CELESTIAL_VOID_VALKYRIE_DECLIVITY_SANCTUM";
export type RawLeatherBreechingType = "TANNED_BUFFALO_HAUNCH_STRAP" | "TEMPERED_MITHRIL_HIP_BUCKLE_SET" | "CELESTIAL_VOID_ASTRAL_BREECHING_PELT";
export type BreechingRecipeType = "NOVICE_MOUNTAIN_DECLIVITY_BREECHING" | "WARMASTER_MITHRIL_HIP_BREECHING" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREECHING";

export interface BreechingBenchData {
    benchType: BreechingBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    declivityBrakingBonusPercent: number;
}

export interface BreechingRecipeData {
    recipeType: BreechingRecipeType;
    requiredLeatherType: RawLeatherBreechingType;
    requiredLeatherCount: number;
    baseDownhillSlipMitigationPercent: number;
    baseBrakingMomentumBonusPercent: number;
}

export interface ActiveBreechingBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BreechingBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedSaddleBreeching {
    breechingId: string;
    recipeType: BreechingRecipeType;
    finalDownhillSlipMitigationPercent: number;
    finalBrakingMomentumBonusPercent: number;
    declivityBrakingPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBreechingType;
    remainingProvidedLeathers: RawLeatherBreechingType[];
    craftedEpochMs: number;
}

export const BREECHING_BENCH_CATALOG: Record<BreechingBenchType, BreechingBenchData> = {
    ASH_SADDLE_BREECHING_BENCH: { benchType: "ASH_SADDLE_BREECHING_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, declivityBrakingBonusPercent: 14 },
    RUNIC_IRONWOOD_BREECHING_RIG: { benchType: "RUNIC_IRONWOOD_BREECHING_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, declivityBrakingBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_DECLIVITY_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_DECLIVITY_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, declivityBrakingBonusPercent: 40 },
};

export const BREECHING_RECIPE_CATALOG: Record<BreechingRecipeType, BreechingRecipeData> = {
    NOVICE_MOUNTAIN_DECLIVITY_BREECHING: { recipeType: "NOVICE_MOUNTAIN_DECLIVITY_BREECHING", requiredLeatherType: "TANNED_BUFFALO_HAUNCH_STRAP", requiredLeatherCount: 2, baseDownhillSlipMitigationPercent: 24, baseBrakingMomentumBonusPercent: 14 },
    WARMASTER_MITHRIL_HIP_BREECHING: { recipeType: "WARMASTER_MITHRIL_HIP_BREECHING", requiredLeatherType: "TEMPERED_MITHRIL_HIP_BUCKLE_SET", requiredLeatherCount: 2, baseDownhillSlipMitigationPercent: 50, baseBrakingMomentumBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREECHING: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREECHING", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_BREECHING_PELT", requiredLeatherCount: 2, baseDownhillSlipMitigationPercent: 84, baseBrakingMomentumBonusPercent: 64 },
};

export class AncientRunicLeatherHorseSaddleBreechingBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BREECHING_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(BREECHING_BENCH_CATALOG).map(b => b.declivityBrakingBonusPercent), 1),
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
     * Constructs and initializes a saddle breeching stitching bench or rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: BreechingBenchType
    ): ActiveBreechingBench {
        const data = BREECHING_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported saddle breeching bench type: ${String(benchType)}`);
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
     * Stitches and tensions buffalo straps and tempered mithril hip buckles into saddle breechings.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftBreeching(
        bench: ActiveBreechingBench,
        recipeType: BreechingRecipeType,
        providedLeathers: RawLeatherBreechingType[],
        craftRoll?: number,
        brakingRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; breeching?: CraftedSaddleBreeching; updatedBench?: ActiveBreechingBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBreechingType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Saddle breeching bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BREECHING_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BREECHING_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown saddle breeching recipe: ${String(recipeType)}` };
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
                reason: `Insufficient breeching straps/hip buckle sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Haunch strap misaligned: mithril hip buckle distorted during tension clamping, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent declivity braking score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeBrakingRoll = typeof brakingRoll === "number" && Number.isFinite(brakingRoll) ? Math.max(0, Math.min(1, brakingRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.declivityBrakingBonusPercent / maxBonus) * 20;
        const declivityScore = Math.max(0, Math.min(100, Math.round(
            (safeBrakingRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((declivityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSlipBonus = Math.max(0, Math.min(100, Math.round(recipe.baseDownhillSlipMitigationPercent * qualityMultiplier)));
        const finalBrakingBonus = Math.max(0, Math.min(100, Math.round(recipe.baseBrakingMomentumBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const breeching: CraftedSaddleBreeching = {
            breechingId: `breeching_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalDownhillSlipMitigationPercent: finalSlipBonus,
            finalBrakingMomentumBonusPercent: finalBrakingBonus,
            declivityBrakingPercent: declivityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            breeching,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains saddle breeching bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveBreechingBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveBreechingBench; newDurability: number; isFunctional: boolean } {
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
