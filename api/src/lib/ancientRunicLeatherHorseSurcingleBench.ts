import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Surcingle Bench, Mithril Roller Buckle Rig & Celestial Valkyrie Surcingle Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian surcingle and lunging roller crafting benches (Elder Surcingle Bench, Runic Oak Surcingle Rig, Celestial Void Valkyrie Surcingle Sanctum),
 * raw tanned bull surcingle straps and tempered mithril roller buckle sets (Tanned Bull Surcingle Strap, Tempered Mithril Roller Buckle Ring, Celestial Void Astral Surcingle Pelt),
 * novice expedition surcingles and sovereign aerial surcingle recipes (Novice Expedition Surcingle, Warmaster Mithril Reinforced Surcingle, Celestial Void Valkyrie Sovereign Surcingle),
 * independent steed withers padding comfort ratings and side rein anchor security ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped withers padding comfort bonus and side rein anchor security scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse surcingle bench maintenance.
 */

export type SurcingleBenchType = "ELDER_SURCINGLE_BENCH" | "RUNIC_OAK_SURCINGLE_RIG" | "CELESTIAL_VOID_VALKYRIE_SURCINGLE_SANCTUM";
export type RawLeatherSurcingleType = "TANNED_BULL_SURCINGLE_STRAP" | "TEMPERED_MITHRIL_ROLLER_BUCKLE_RING" | "CELESTIAL_VOID_ASTRAL_SURCINGLE_PELT";
export type SurcingleRecipeType = "NOVICE_EXPEDITION_SURCINGLE" | "WARMASTER_MITHRIL_REINFORCED_SURCINGLE" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SURCINGLE";

export interface SurcingleBenchData {
    benchType: SurcingleBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    surcingleStabilityBonusPercent: number;
}

export interface SurcingleRecipeData {
    recipeType: SurcingleRecipeType;
    requiredLeatherType: RawLeatherSurcingleType;
    requiredLeatherCount: number;
    baseWithersPaddingComfortPercent: number;
    baseSideReinAnchorSecurityPercent: number;
}

export interface ActiveSurcingleBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: SurcingleBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseSurcingle {
    surcingleId: string;
    recipeType: SurcingleRecipeType;
    finalWithersPaddingComfortPercent: number;
    finalSideReinAnchorSecurityPercent: number;
    surcingleGirthStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherSurcingleType;
    remainingProvidedLeathers: RawLeatherSurcingleType[];
    craftedEpochMs: number;
}

export const SURCINGLE_BENCH_CATALOG: Record<SurcingleBenchType, SurcingleBenchData> = {
    ELDER_SURCINGLE_BENCH: { benchType: "ELDER_SURCINGLE_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, surcingleStabilityBonusPercent: 14 },
    RUNIC_OAK_SURCINGLE_RIG: { benchType: "RUNIC_OAK_SURCINGLE_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, surcingleStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_SURCINGLE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_SURCINGLE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, surcingleStabilityBonusPercent: 40 },
};

export const SURCINGLE_RECIPE_CATALOG: Record<SurcingleRecipeType, SurcingleRecipeData> = {
    NOVICE_EXPEDITION_SURCINGLE: { recipeType: "NOVICE_EXPEDITION_SURCINGLE", requiredLeatherType: "TANNED_BULL_SURCINGLE_STRAP", requiredLeatherCount: 2, baseWithersPaddingComfortPercent: 24, baseSideReinAnchorSecurityPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_SURCINGLE: { recipeType: "WARMASTER_MITHRIL_REINFORCED_SURCINGLE", requiredLeatherType: "TEMPERED_MITHRIL_ROLLER_BUCKLE_RING", requiredLeatherCount: 2, baseWithersPaddingComfortPercent: 50, baseSideReinAnchorSecurityPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SURCINGLE: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SURCINGLE", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_SURCINGLE_PELT", requiredLeatherCount: 2, baseWithersPaddingComfortPercent: 84, baseSideReinAnchorSecurityPercent: 64 },
};

export class AncientRunicLeatherHorseSurcingleBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SURCINGLE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(SURCINGLE_BENCH_CATALOG).map(b => b.surcingleStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse surcingle crafting bench or roller-buckle rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: SurcingleBenchType
    ): ActiveSurcingleBench {
        const data = SURCINGLE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse surcingle bench type: ${String(benchType)}`);
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
     * Stitches and tensions surcingle straps and tempered mithril roller buckle rings into equestrian training rollers.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftSurcingle(
        bench: ActiveSurcingleBench,
        recipeType: SurcingleRecipeType,
        providedLeathers: RawLeatherSurcingleType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; surcingle?: CraftedHorseSurcingle; updatedBench?: ActiveSurcingleBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherSurcingleType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse surcingle bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SURCINGLE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SURCINGLE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse surcingle recipe: ${String(recipeType)}` };
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
                reason: `Insufficient surcingle straps/roller buckle rings: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Surcingle strap misaligned: roller buckle ring slipped under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent surcingle girth stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.surcingleStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalWithers = Math.max(0, Math.min(100, Math.round(recipe.baseWithersPaddingComfortPercent * qualityMultiplier)));
        const finalSecurity = Math.max(0, Math.min(100, Math.round(recipe.baseSideReinAnchorSecurityPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const surcingle: CraftedHorseSurcingle = {
            surcingleId: `surcingle_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalWithersPaddingComfortPercent: finalWithers,
            finalSideReinAnchorSecurityPercent: finalSecurity,
            surcingleGirthStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            surcingle,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail mud and maintains horse surcingle bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveSurcingleBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveSurcingleBench; newDurability: number; isFunctional: boolean } {
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
