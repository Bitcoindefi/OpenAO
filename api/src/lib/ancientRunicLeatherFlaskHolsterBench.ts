import crypto from "node:crypto";

/**
 * Ancient Runic Leather Flask Holster Bench, Cork Stopper Strap & Arcane Alchemy Harness Engine for OpenAO MMORPG.
 * Simulates flask holster stitching benches and cork stopper strap rigs (Oak Flask Holster Bench, Runic Ironwood Alchemy Harness Rig, Celestial Void Seraphic Elixir Sanctum),
 * raw tanned goatskin and waxed cork stopper straps (Tanned Goatskin Holster Blank, Waxed Cork Stopper Strap, Celestial Void Starlight Alchemical Harness Leather),
 * quick-sip flask holsters and seraphic elixir harness recipes (Scout Quick-Sip Flask Holster, Combat Medic Double-Vial Harness, Celestial Void Seraphic Bottomless Elixir Rig),
 * independent potion delivery fluidity ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped potion efficacy bonus and clamped potion shatter mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and holster bench maintenance.
 */

export type HolsterBenchType = "OAK_FLASK_HOLSTER_BENCH" | "RUNIC_IRONWOOD_ALCHEMY_HARNESS_RIG" | "CELESTIAL_VOID_SERAPHIC_ELIXIR_SANCTUM";
export type RawLeatherHolsterType = "TANNED_GOATSKIN_HOLSTER_BLANK" | "WAXED_CORK_STOPPER_STRAP" | "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_HARNESS_LEATHER";
export type ElixirHolsterRecipeType = "SCOUT_QUICK_SIP_FLASK_HOLSTER" | "COMBAT_MEDIC_DOUBLE_VIAL_HARNESS" | "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_ELIXIR_RIG";

export interface HolsterBenchData {
    benchType: HolsterBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    fluidityBonusPercent: number;
}

export interface ElixirHolsterRecipeData {
    recipeType: ElixirHolsterRecipeType;
    requiredLeatherType: RawLeatherHolsterType;
    requiredLeatherCount: number;
    basePotionEfficacyBonusPercent: number;
    basePotionShatterMitigationPercent: number;
}

export interface ActiveHolsterBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: HolsterBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedElixirHolster {
    holsterId: string;
    recipeType: ElixirHolsterRecipeType;
    finalPotionEfficacyBonusPercent: number;
    finalPotionShatterMitigationPercent: number;
    deliveryFluidityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherHolsterType;
    remainingProvidedLeathers: RawLeatherHolsterType[];
    craftedEpochMs: number;
}

export const HOLSTER_BENCH_CATALOG: Record<HolsterBenchType, HolsterBenchData> = {
    OAK_FLASK_HOLSTER_BENCH: { benchType: "OAK_FLASK_HOLSTER_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, fluidityBonusPercent: 10 },
    RUNIC_IRONWOOD_ALCHEMY_HARNESS_RIG: { benchType: "RUNIC_IRONWOOD_ALCHEMY_HARNESS_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, fluidityBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_ELIXIR_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_ELIXIR_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, fluidityBonusPercent: 35 },
};

export const HOLSTER_RECIPE_CATALOG: Record<ElixirHolsterRecipeType, ElixirHolsterRecipeData> = {
    SCOUT_QUICK_SIP_FLASK_HOLSTER: { recipeType: "SCOUT_QUICK_SIP_FLASK_HOLSTER", requiredLeatherType: "TANNED_GOATSKIN_HOLSTER_BLANK", requiredLeatherCount: 2, basePotionEfficacyBonusPercent: 20, basePotionShatterMitigationPercent: 10 },
    COMBAT_MEDIC_DOUBLE_VIAL_HARNESS: { recipeType: "COMBAT_MEDIC_DOUBLE_VIAL_HARNESS", requiredLeatherType: "WAXED_CORK_STOPPER_STRAP", requiredLeatherCount: 2, basePotionEfficacyBonusPercent: 45, basePotionShatterMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_ELIXIR_RIG: { recipeType: "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_ELIXIR_RIG", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_HARNESS_LEATHER", requiredLeatherCount: 2, basePotionEfficacyBonusPercent: 80, basePotionShatterMitigationPercent: 60 },
};

export class AncientRunicLeatherFlaskHolsterBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(HOLSTER_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(HOLSTER_BENCH_CATALOG).map(b => b.fluidityBonusPercent), 1),
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
     * Constructs and initializes a flask holster stitching bench or alchemy harness rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: HolsterBenchType
    ): ActiveHolsterBench {
        const data = HOLSTER_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported holster bench type: ${String(benchType)}`);
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
     * Stitches and rigs goatskin blanks and cork stopper straps into alchemy flask holsters and harnesses.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftHolster(
        bench: ActiveHolsterBench,
        recipeType: ElixirHolsterRecipeType,
        providedLeathers: RawLeatherHolsterType[],
        craftRoll?: number,
        fluidityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; holster?: CraftedElixirHolster; updatedBench?: ActiveHolsterBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherHolsterType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Flask holster bench is damaged or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = HOLSTER_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = HOLSTER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown holster recipe: ${String(recipeType)}` };
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
                reason: `Insufficient holster leather: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Holster torn: cork clamp needle pierced goatskin retention loop, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent delivery fluidity score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeFluidityRoll = typeof fluidityRoll === "number" && Number.isFinite(fluidityRoll) ? Math.max(0, Math.min(1, fluidityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.fluidityBonusPercent / maxBonus) * 20;
        const fluidityScore = Math.max(0, Math.min(100, Math.round(
            (safeFluidityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((fluidityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalEfficacy = Math.max(0, Math.min(100, Math.round(recipe.basePotionEfficacyBonusPercent * qualityMultiplier)));
        const finalShatter = Math.max(0, Math.min(100, Math.round(recipe.basePotionShatterMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const holster: CraftedElixirHolster = {
            holsterId: `holster_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPotionEfficacyBonusPercent: finalEfficacy,
            finalPotionShatterMitigationPercent: finalShatter,
            deliveryFluidityPercent: fluidityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            holster,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-tightens strap tensioners and maintains flask holster bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveHolsterBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveHolsterBench; newDurability: number; isFunctional: boolean } {
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