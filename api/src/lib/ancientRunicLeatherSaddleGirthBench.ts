import crypto from "node:crypto";

/**
 * Ancient Runic Leather Saddle Girth Bench, Mithril Roller Buckle & Celestial Valkyrie Ventral Rig Engine for OpenAO MMORPG.
 * Simulates ventral girth strap stitching benches and roller buckle tension rigs (Ash Saddle Girth Bench, Runic Ironwood Girth Rig, Celestial Void Valkyrie Ventral Sanctum),
 * raw tanned buffalo ventral straps and tempered mithril roller buckle sets (Tanned Buffalo Ventral Strap, Tempered Mithril Roller Buckle Set, Celestial Void Astral Girth Pelt),
 * novice ventral saddle girths and sovereign aerial ventral girth recipes (Novice Ventral Saddle Girth, Warmaster Mithril Roller Girth, Celestial Void Valkyrie Sovereign Girth),
 * independent steed thorax ventral stability ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped ventral stability bonus and saddle slippage mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and saddle girth bench maintenance.
 */

export type SaddleGirthBenchType = "ASH_SADDLE_GIRTH_BENCH" | "RUNIC_IRONWOOD_GIRTH_RIG" | "CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM";
export type RawLeatherSaddleGirthType = "TANNED_BUFFALO_VENTRAL_STRAP" | "TEMPERED_MITHRIL_ROLLER_BUCKLE_SET" | "CELESTIAL_VOID_ASTRAL_GIRTH_PELT";
export type SaddleGirthRecipeType = "NOVICE_VENTRAL_SADDLE_GIRTH" | "WARMASTER_MITHRIL_ROLLER_GIRTH" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH";

export interface SaddleGirthBenchData {
    benchType: SaddleGirthBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    girthStabilityBonusPercent: number;
}

export interface SaddleGirthRecipeData {
    recipeType: SaddleGirthRecipeType;
    requiredLeatherType: RawLeatherSaddleGirthType;
    requiredLeatherCount: number;
    baseVentralStabilityBonusPercent: number;
    baseSaddleSlippageMitigationPercent: number;
}

export interface ActiveSaddleGirthBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: SaddleGirthBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedSaddleGirth {
    girthId: string;
    recipeType: SaddleGirthRecipeType;
    finalVentralStabilityBonusPercent: number;
    finalSaddleSlippageMitigationPercent: number;
    ventralStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherSaddleGirthType;
    remainingProvidedLeathers: RawLeatherSaddleGirthType[];
    craftedEpochMs: number;
}

export const SADDLE_GIRTH_BENCH_CATALOG: Record<SaddleGirthBenchType, SaddleGirthBenchData> = {
    ASH_SADDLE_GIRTH_BENCH: { benchType: "ASH_SADDLE_GIRTH_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, girthStabilityBonusPercent: 14 },
    RUNIC_IRONWOOD_GIRTH_RIG: { benchType: "RUNIC_IRONWOOD_GIRTH_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, girthStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, girthStabilityBonusPercent: 40 },
};

export const SADDLE_GIRTH_RECIPE_CATALOG: Record<SaddleGirthRecipeType, SaddleGirthRecipeData> = {
    NOVICE_VENTRAL_SADDLE_GIRTH: { recipeType: "NOVICE_VENTRAL_SADDLE_GIRTH", requiredLeatherType: "TANNED_BUFFALO_VENTRAL_STRAP", requiredLeatherCount: 2, baseVentralStabilityBonusPercent: 24, baseSaddleSlippageMitigationPercent: 14 },
    WARMASTER_MITHRIL_ROLLER_GIRTH: { recipeType: "WARMASTER_MITHRIL_ROLLER_GIRTH", requiredLeatherType: "TEMPERED_MITHRIL_ROLLER_BUCKLE_SET", requiredLeatherCount: 2, baseVentralStabilityBonusPercent: 50, baseSaddleSlippageMitigationPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_GIRTH_PELT", requiredLeatherCount: 2, baseVentralStabilityBonusPercent: 84, baseSaddleSlippageMitigationPercent: 64 },
};

export class AncientRunicLeatherSaddleGirthBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SADDLE_GIRTH_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(SADDLE_GIRTH_BENCH_CATALOG).map(b => b.girthStabilityBonusPercent), 1),
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
     * Constructs and initializes a saddle girth stitching bench or rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: SaddleGirthBenchType
    ): ActiveSaddleGirthBench {
        const data = SADDLE_GIRTH_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported saddle girth bench type: ${String(benchType)}`);
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
     * Stitches and tensions buffalo straps and tempered mithril roller buckles into saddle girths.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftGirth(
        bench: ActiveSaddleGirthBench,
        recipeType: SaddleGirthRecipeType,
        providedLeathers: RawLeatherSaddleGirthType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; girth?: CraftedSaddleGirth; updatedBench?: ActiveSaddleGirthBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherSaddleGirthType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Saddle girth bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SADDLE_GIRTH_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SADDLE_GIRTH_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown saddle girth recipe: ${String(recipeType)}` };
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
                reason: `Insufficient saddle girth straps/roller buckle sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Roller buckle tongue sheared: mithril prong warped during girth stretch test, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent ventral stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.girthStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalStabilityBonus = Math.max(0, Math.min(100, Math.round(recipe.baseVentralStabilityBonusPercent * qualityMultiplier)));
        const finalSlippageMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseSaddleSlippageMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const girth: CraftedSaddleGirth = {
            girthId: `girth_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalVentralStabilityBonusPercent: finalStabilityBonus,
            finalSaddleSlippageMitigationPercent: finalSlippageMitigate,
            ventralStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            girth,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian grit and maintains saddle girth bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveSaddleGirthBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveSaddleGirthBench; newDurability: number; isFunctional: boolean } {
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
