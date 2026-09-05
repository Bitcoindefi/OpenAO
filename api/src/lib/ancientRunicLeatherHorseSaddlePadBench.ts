import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Saddle Pad Bench, Mithril Quilting Thread & Celestial Valkyrie Wither Engine for OpenAO MMORPG.
 * Simulates wither pad blank stitching benches and quilting tension rigs (Linden Saddle Pad Bench, Runic Chestnut Quilting Rig, Celestial Void Valkyrie Wither Sanctum),
 * raw tanned buffalo wither pad blanks and tempered mithril quilting thread sets (Tanned Buffalo Wither Pad Blank, Tempered Mithril Quilting Thread Set, Celestial Void Astral Pad Pelt),
 * novice spinal shock saddle pads and sovereign aerial pad recipes (Novice Spinal Shock Saddle Pad, Warmaster Mithril Quilted Pad, Celestial Void Valkyrie Sovereign Pad),
 * independent steed spine-friction mitigation & wither shock absorption ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped spine friction mitigation bonus and heat dissipation comfort scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse saddle pad bench maintenance.
 */

export type SaddlePadBenchType = "LINDEN_SADDLE_PAD_BENCH" | "RUNIC_CHESTNUT_QUILTING_RIG" | "CELESTIAL_VOID_VALKYRIE_WITHER_SANCTUM";
export type RawLeatherSaddlePadType = "TANNED_BUFFALO_WITHER_PAD_BLANK" | "TEMPERED_MITHRIL_QUILTING_THREAD_SET" | "CELESTIAL_VOID_ASTRAL_PAD_PELT";
export type SaddlePadRecipeType = "NOVICE_SPINAL_SHOCK_SADDLE_PAD" | "WARMASTER_MITHRIL_QUILTED_PAD" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_PAD";

export interface SaddlePadBenchData {
    benchType: SaddlePadBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    witherShockAbsorptionBonusPercent: number;
}

export interface SaddlePadRecipeData {
    recipeType: SaddlePadRecipeType;
    requiredLeatherType: RawLeatherSaddlePadType;
    requiredLeatherCount: number;
    baseSpineFrictionMitigationPercent: number;
    baseHeatDissipationComfortBonusPercent: number;
}

export interface ActiveSaddlePadBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: SaddlePadBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseSaddlePad {
    saddlePadId: string;
    recipeType: SaddlePadRecipeType;
    finalSpineFrictionMitigationPercent: number;
    finalHeatDissipationComfortBonusPercent: number;
    witherShockAbsorptionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherSaddlePadType;
    remainingProvidedLeathers: RawLeatherSaddlePadType[];
    craftedEpochMs: number;
}

export const SADDLE_PAD_BENCH_CATALOG: Record<SaddlePadBenchType, SaddlePadBenchData> = {
    LINDEN_SADDLE_PAD_BENCH: { benchType: "LINDEN_SADDLE_PAD_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, witherShockAbsorptionBonusPercent: 14 },
    RUNIC_CHESTNUT_QUILTING_RIG: { benchType: "RUNIC_CHESTNUT_QUILTING_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, witherShockAbsorptionBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_WITHER_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_WITHER_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, witherShockAbsorptionBonusPercent: 40 },
};

export const SADDLE_PAD_RECIPE_CATALOG: Record<SaddlePadRecipeType, SaddlePadRecipeData> = {
    NOVICE_SPINAL_SHOCK_SADDLE_PAD: { recipeType: "NOVICE_SPINAL_SHOCK_SADDLE_PAD", requiredLeatherType: "TANNED_BUFFALO_WITHER_PAD_BLANK", requiredLeatherCount: 2, baseSpineFrictionMitigationPercent: 24, baseHeatDissipationComfortBonusPercent: 14 },
    WARMASTER_MITHRIL_QUILTED_PAD: { recipeType: "WARMASTER_MITHRIL_QUILTED_PAD", requiredLeatherType: "TEMPERED_MITHRIL_QUILTING_THREAD_SET", requiredLeatherCount: 2, baseSpineFrictionMitigationPercent: 50, baseHeatDissipationComfortBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_PAD: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_PAD", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_PAD_PELT", requiredLeatherCount: 2, baseSpineFrictionMitigationPercent: 84, baseHeatDissipationComfortBonusPercent: 64 },
};

export class AncientRunicLeatherHorseSaddlePadBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SADDLE_PAD_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(SADDLE_PAD_BENCH_CATALOG).map(b => b.witherShockAbsorptionBonusPercent), 1),
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
     * Constructs and initializes a horse saddle pad stitching bench or quilting rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: SaddlePadBenchType
    ): ActiveSaddlePadBench {
        const data = SADDLE_PAD_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse saddle pad bench type: ${String(benchType)}`);
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
     * Stitches and quilts wither pad blanks and tempered mithril quilting threads into horse saddle pads.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftSaddlePad(
        bench: ActiveSaddlePadBench,
        recipeType: SaddlePadRecipeType,
        providedLeathers: RawLeatherSaddlePadType[],
        craftRoll?: number,
        absorptionRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; saddlePad?: CraftedHorseSaddlePad; updatedBench?: ActiveSaddlePadBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherSaddlePadType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse saddle pad bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SADDLE_PAD_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SADDLE_PAD_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse saddle pad recipe: ${String(recipeType)}` };
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
                reason: `Insufficient wither blanks/quilting thread: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Pad blank misaligned: mithril quilting thread distorted during needle tensioning, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent wither shock absorption score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeAbsorptionRoll = typeof absorptionRoll === "number" && Number.isFinite(absorptionRoll) ? Math.max(0, Math.min(1, absorptionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.witherShockAbsorptionBonusPercent / maxBonus) * 20;
        const shockScore = Math.max(0, Math.min(100, Math.round(
            (safeAbsorptionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((shockScore / 100) * 0.4); // 0.8 to 1.2x

        const finalFrictionMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseSpineFrictionMitigationPercent * qualityMultiplier)));
        const finalHeatDissipationBonus = Math.max(0, Math.min(100, Math.round(recipe.baseHeatDissipationComfortBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const saddlePad: CraftedHorseSaddlePad = {
            saddlePadId: `saddlepad_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSpineFrictionMitigationPercent: finalFrictionMitigation,
            finalHeatDissipationComfortBonusPercent: finalHeatDissipationBonus,
            witherShockAbsorptionPercent: shockScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            saddlePad,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse saddle pad bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveSaddlePadBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveSaddlePadBench; newDurability: number; isFunctional: boolean } {
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
