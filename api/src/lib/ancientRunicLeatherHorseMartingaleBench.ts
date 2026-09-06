import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Martingale Bench, Mithril Fork Rig & Celestial Valkyrie Martingale Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian martingale crafting benches and fork-tension rigs (Elder Martingale Bench, Runic Oak Martingale Rig, Celestial Void Valkyrie Martingale Sanctum),
 * raw tanned centaur martingale straps and tempered mithril martingale fork ring sets (Tanned Centaur Martingale Strap, Tempered Mithril Martingale Fork Ring, Celestial Void Astral Martingale Pelt),
 * novice expedition martingales and sovereign aerial martingale recipes (Novice Expedition Martingale, Warmaster Mithril Reinforced Martingale, Celestial Void Valkyrie Sovereign Martingale),
 * independent steed rein-tension stability ratings and head toss prevention ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped rein tension stability bonus and head toss prevention scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse martingale bench maintenance.
 */

export type MartingaleBenchType = "ELDER_MARTINGALE_BENCH" | "RUNIC_OAK_MARTINGALE_RIG" | "CELESTIAL_VOID_VALKYRIE_MARTINGALE_SANCTUM";
export type RawLeatherMartingaleType = "TANNED_CENTAUR_MARTINGALE_STRAP" | "TEMPERED_MITHRIL_MARTINGALE_FORK_RING" | "CELESTIAL_VOID_ASTRAL_MARTINGALE_PELT";
export type MartingaleRecipeType = "NOVICE_EXPEDITION_MARTINGALE" | "WARMASTER_MITHRIL_REINFORCED_MARTINGALE" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_MARTINGALE";

export interface MartingaleBenchData {
    benchType: MartingaleBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    martingaleStabilityBonusPercent: number;
}

export interface MartingaleRecipeData {
    recipeType: MartingaleRecipeType;
    requiredLeatherType: RawLeatherMartingaleType;
    requiredLeatherCount: number;
    baseReinTensionStabilityPercent: number;
    baseHeadTossPreventionPercent: number;
}

export interface ActiveMartingaleBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: MartingaleBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseMartingale {
    martingaleId: string;
    recipeType: MartingaleRecipeType;
    finalReinTensionStabilityPercent: number;
    finalHeadTossPreventionPercent: number;
    martingaleAnchorStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherMartingaleType;
    remainingProvidedLeathers: RawLeatherMartingaleType[];
    craftedEpochMs: number;
}

export const MARTINGALE_BENCH_CATALOG: Record<MartingaleBenchType, MartingaleBenchData> = {
    ELDER_MARTINGALE_BENCH: { benchType: "ELDER_MARTINGALE_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, martingaleStabilityBonusPercent: 14 },
    RUNIC_OAK_MARTINGALE_RIG: { benchType: "RUNIC_OAK_MARTINGALE_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, martingaleStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_MARTINGALE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_MARTINGALE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, martingaleStabilityBonusPercent: 40 },
};

export const MARTINGALE_RECIPE_CATALOG: Record<MartingaleRecipeType, MartingaleRecipeData> = {
    NOVICE_EXPEDITION_MARTINGALE: { recipeType: "NOVICE_EXPEDITION_MARTINGALE", requiredLeatherType: "TANNED_CENTAUR_MARTINGALE_STRAP", requiredLeatherCount: 2, baseReinTensionStabilityPercent: 24, baseHeadTossPreventionPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_MARTINGALE: { recipeType: "WARMASTER_MITHRIL_REINFORCED_MARTINGALE", requiredLeatherType: "TEMPERED_MITHRIL_MARTINGALE_FORK_RING", requiredLeatherCount: 2, baseReinTensionStabilityPercent: 50, baseHeadTossPreventionPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_MARTINGALE: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_MARTINGALE", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_MARTINGALE_PELT", requiredLeatherCount: 2, baseReinTensionStabilityPercent: 84, baseHeadTossPreventionPercent: 64 },
};

export class AncientRunicLeatherHorseMartingaleBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(MARTINGALE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(MARTINGALE_BENCH_CATALOG).map(b => b.martingaleStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse martingale crafting bench or fork-tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: MartingaleBenchType
    ): ActiveMartingaleBench {
        const data = MARTINGALE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse martingale bench type: ${String(benchType)}`);
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
     * Stitches and tensions martingale straps and tempered mithril fork rings into horse martingales.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftMartingale(
        bench: ActiveMartingaleBench,
        recipeType: MartingaleRecipeType,
        providedLeathers: RawLeatherMartingaleType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; martingale?: CraftedHorseMartingale; updatedBench?: ActiveMartingaleBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherMartingaleType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse martingale bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = MARTINGALE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = MARTINGALE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse martingale recipe: ${String(recipeType)}` };
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
                reason: `Insufficient martingale straps/fork rings: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Martingale strap misaligned: mithril fork ring twisted under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent martingale anchor stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.martingaleStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalStability = Math.max(0, Math.min(100, Math.round(recipe.baseReinTensionStabilityPercent * qualityMultiplier)));
        const finalTossPrevention = Math.max(0, Math.min(100, Math.round(recipe.baseHeadTossPreventionPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const martingale: CraftedHorseMartingale = {
            martingaleId: `martingale_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalReinTensionStabilityPercent: finalStability,
            finalHeadTossPreventionPercent: finalTossPrevention,
            martingaleAnchorStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            martingale,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse martingale bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveMartingaleBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveMartingaleBench; newDurability: number; isFunctional: boolean } {
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
