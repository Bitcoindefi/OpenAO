import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Tie Down Bench, Mithril Snap Ring Rig & Celestial Valkyrie Tie Down Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian tie down crafting benches and head carriage tension rigs (Elder Tie Down Bench, Runic Oak Tie Down Rig, Celestial Void Valkyrie Tie Down Sanctum),
 * raw tanned bull tie down straps and tempered mithril snap ring sets (Tanned Bull Tie Down Strap, Tempered Mithril Tie Down Snap Ring, Celestial Void Astral Tie Down Pelt),
 * novice expedition tie downs and sovereign aerial tie down recipes (Novice Expedition Tie Down, Warmaster Mithril Reinforced Tie Down, Celestial Void Valkyrie Sovereign Tie Down),
 * independent steed head-carriage control ratings and chest tension stability ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped head carriage control bonus and chest tension stability scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse tie down bench maintenance.
 */

export type TieDownBenchType = "ELDER_TIE_DOWN_BENCH" | "RUNIC_OAK_TIE_DOWN_RIG" | "CELESTIAL_VOID_VALKYRIE_TIE_DOWN_SANCTUM";
export type RawLeatherTieDownType = "TANNED_BULL_TIE_DOWN_STRAP" | "TEMPERED_MITHRIL_TIE_DOWN_SNAP_RING" | "CELESTIAL_VOID_ASTRAL_TIE_DOWN_PELT";
export type TieDownRecipeType = "NOVICE_EXPEDITION_TIE_DOWN" | "WARMASTER_MITHRIL_REINFORCED_TIE_DOWN" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_TIE_DOWN";

export interface TieDownBenchData {
    benchType: TieDownBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    tieDownStabilityBonusPercent: number;
}

export interface TieDownRecipeData {
    recipeType: TieDownRecipeType;
    requiredLeatherType: RawLeatherTieDownType;
    requiredLeatherCount: number;
    baseHeadCarriageControlPercent: number;
    baseChestTensionStabilityPercent: number;
}

export interface ActiveTieDownBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: TieDownBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseTieDown {
    tieDownId: string;
    recipeType: TieDownRecipeType;
    finalHeadCarriageControlPercent: number;
    finalChestTensionStabilityPercent: number;
    tieDownRigidStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherTieDownType;
    remainingProvidedLeathers: RawLeatherTieDownType[];
    craftedEpochMs: number;
}

export const TIE_DOWN_BENCH_CATALOG: Record<TieDownBenchType, TieDownBenchData> = {
    ELDER_TIE_DOWN_BENCH: { benchType: "ELDER_TIE_DOWN_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, tieDownStabilityBonusPercent: 14 },
    RUNIC_OAK_TIE_DOWN_RIG: { benchType: "RUNIC_OAK_TIE_DOWN_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, tieDownStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_TIE_DOWN_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_TIE_DOWN_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, tieDownStabilityBonusPercent: 40 },
};

export const TIE_DOWN_RECIPE_CATALOG: Record<TieDownRecipeType, TieDownRecipeData> = {
    NOVICE_EXPEDITION_TIE_DOWN: { recipeType: "NOVICE_EXPEDITION_TIE_DOWN", requiredLeatherType: "TANNED_BULL_TIE_DOWN_STRAP", requiredLeatherCount: 2, baseHeadCarriageControlPercent: 24, baseChestTensionStabilityPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_TIE_DOWN: { recipeType: "WARMASTER_MITHRIL_REINFORCED_TIE_DOWN", requiredLeatherType: "TEMPERED_MITHRIL_TIE_DOWN_SNAP_RING", requiredLeatherCount: 2, baseHeadCarriageControlPercent: 50, baseChestTensionStabilityPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_TIE_DOWN: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_TIE_DOWN", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_TIE_DOWN_PELT", requiredLeatherCount: 2, baseHeadCarriageControlPercent: 84, baseChestTensionStabilityPercent: 64 },
};

export class AncientRunicLeatherHorseTieDownBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(TIE_DOWN_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(TIE_DOWN_BENCH_CATALOG).map(b => b.tieDownStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse tie down crafting bench or tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: TieDownBenchType
    ): ActiveTieDownBench {
        const data = TIE_DOWN_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse tie down bench type: ${String(benchType)}`);
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
     * Stitches and tensions tie down straps and tempered mithril snap rings into horse tie downs.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftTieDown(
        bench: ActiveTieDownBench,
        recipeType: TieDownRecipeType,
        providedLeathers: RawLeatherTieDownType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; tieDown?: CraftedHorseTieDown; updatedBench?: ActiveTieDownBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherTieDownType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse tie down bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = TIE_DOWN_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = TIE_DOWN_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse tie down recipe: ${String(recipeType)}` };
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
                reason: `Insufficient tie down straps/snap rings: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Tie down strap misaligned: mithril snap ring snapped under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent tie down rigid stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.tieDownStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalHeadCarriage = Math.max(0, Math.min(100, Math.round(recipe.baseHeadCarriageControlPercent * qualityMultiplier)));
        const finalChestTension = Math.max(0, Math.min(100, Math.round(recipe.baseChestTensionStabilityPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const tieDown: CraftedHorseTieDown = {
            tieDownId: `tiedown_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalHeadCarriageControlPercent: finalHeadCarriage,
            finalChestTensionStabilityPercent: finalChestTension,
            tieDownRigidStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            tieDown,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse tie down bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveTieDownBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveTieDownBench; newDurability: number; isFunctional: boolean } {
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
