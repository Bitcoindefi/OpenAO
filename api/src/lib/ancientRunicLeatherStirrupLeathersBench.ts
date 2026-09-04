import crypto from "node:crypto";

/**
 * Ancient Runic Leather Stirrup Leathers Bench, Mithril Tread Iron & Valkyrie Aerial Rig Engine for OpenAO MMORPG.
 * Simulates stirrup strap stitching benches and tread iron shaping rigs (Ash Stirrup Leather Bench, Runic Ironwood Knight Rig, Celestial Void Valkyrie Aerial Sanctum),
 * raw tanned heavy buffalo stirrup straps and tempered mithril tread iron sets (Tanned Heavy Buffalo Stirrup Strap, Tempered Mithril Tread Iron Set, Celestial Void Starlight Valkyrie Leather),
 * novice mounted stirrup leathers and celestial sovereign aerial stirrup recipes (Novice Mounted Stirrup Leather, Warmaster Mithril Tread Stirrup, Celestial Void Valkyrie Aerial Stirrup),
 * independent rider balance & posture stability ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped rider weight distribution bonus and clamped lance shock absorption mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and stirrup leathers bench maintenance.
 */

export type StirrupLeathersBenchType = "ASH_STIRRUP_LEATHER_BENCH" | "RUNIC_IRONWOOD_KNIGHT_RIG" | "CELESTIAL_VOID_VALKYRIE_AERIAL_SANCTUM";
export type RawLeatherStirrupLeathersType = "TANNED_HEAVY_BUFFALO_STIRRUP_STRAP" | "TEMPERED_MITHRIL_TREAD_IRON_SET" | "CELESTIAL_VOID_STARLIGHT_VALKYRIE_LEATHER";
export type StirrupLeathersRecipeType = "NOVICE_MOUNTED_STIRRUP_LEATHER" | "WARMASTER_MITHRIL_TREAD_STIRRUP" | "CELESTIAL_VOID_VALKYRIE_AERIAL_STIRRUP";

export interface StirrupLeathersBenchData {
    benchType: StirrupLeathersBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    balanceBonusPercent: number;
}

export interface StirrupLeathersRecipeData {
    recipeType: StirrupLeathersRecipeType;
    requiredLeatherType: RawLeatherStirrupLeathersType;
    requiredLeatherCount: number;
    baseRiderWeightDistributionBonusPercent: number;
    baseLanceShockAbsorptionMitigationPercent: number;
}

export interface ActiveStirrupLeathersBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: StirrupLeathersBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedStirrupLeathers {
    stirrupId: string;
    recipeType: StirrupLeathersRecipeType;
    finalRiderWeightDistributionBonusPercent: number;
    finalLanceShockAbsorptionMitigationPercent: number;
    riderBalancePercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherStirrupLeathersType;
    remainingProvidedLeathers: RawLeatherStirrupLeathersType[];
    craftedEpochMs: number;
}

export const STIRRUP_LEATHERS_BENCH_CATALOG: Record<StirrupLeathersBenchType, StirrupLeathersBenchData> = {
    ASH_STIRRUP_LEATHER_BENCH: { benchType: "ASH_STIRRUP_LEATHER_BENCH", maxDurability: 85, leathercraftPower: 25, baseSuccessRatePercent: 85, balanceBonusPercent: 10 },
    RUNIC_IRONWOOD_KNIGHT_RIG: { benchType: "RUNIC_IRONWOOD_KNIGHT_RIG", maxDurability: 190, leathercraftPower: 65, baseSuccessRatePercent: 92, balanceBonusPercent: 20 },
    CELESTIAL_VOID_VALKYRIE_AERIAL_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_AERIAL_SANCTUM", maxDurability: 330, leathercraftPower: 120, baseSuccessRatePercent: 99, balanceBonusPercent: 35 },
};

export const STIRRUP_LEATHERS_RECIPE_CATALOG: Record<StirrupLeathersRecipeType, StirrupLeathersRecipeData> = {
    NOVICE_MOUNTED_STIRRUP_LEATHER: { recipeType: "NOVICE_MOUNTED_STIRRUP_LEATHER", requiredLeatherType: "TANNED_HEAVY_BUFFALO_STIRRUP_STRAP", requiredLeatherCount: 2, baseRiderWeightDistributionBonusPercent: 20, baseLanceShockAbsorptionMitigationPercent: 10 },
    WARMASTER_MITHRIL_TREAD_STIRRUP: { recipeType: "WARMASTER_MITHRIL_TREAD_STIRRUP", requiredLeatherType: "TEMPERED_MITHRIL_TREAD_IRON_SET", requiredLeatherCount: 2, baseRiderWeightDistributionBonusPercent: 45, baseLanceShockAbsorptionMitigationPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_AERIAL_STIRRUP: { recipeType: "CELESTIAL_VOID_VALKYRIE_AERIAL_STIRRUP", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_VALKYRIE_LEATHER", requiredLeatherCount: 2, baseRiderWeightDistributionBonusPercent: 80, baseLanceShockAbsorptionMitigationPercent: 60 },
};

export class AncientRunicLeatherStirrupLeathersBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(STIRRUP_LEATHERS_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(STIRRUP_LEATHERS_BENCH_CATALOG).map(b => b.balanceBonusPercent), 1),
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
     * Constructs and initializes a stirrup leathers stitching bench or knight rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: StirrupLeathersBenchType
    ): ActiveStirrupLeathersBench {
        const data = STIRRUP_LEATHERS_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported stirrup leathers bench type: ${String(benchType)}`);
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
     * Stitches and rivets buffalo stirrup straps and tempered mithril tread irons into stirrup leathers.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftStirrups(
        bench: ActiveStirrupLeathersBench,
        recipeType: StirrupLeathersRecipeType,
        providedLeathers: RawLeatherStirrupLeathersType[],
        craftRoll?: number,
        balanceRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; stirrup?: CraftedStirrupLeathers; updatedBench?: ActiveStirrupLeathersBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherStirrupLeathersType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Stirrup leathers bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = STIRRUP_LEATHERS_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = STIRRUP_LEATHERS_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown stirrup leathers recipe: ${String(recipeType)}` };
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
                reason: `Insufficient stirrup leather/tread sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Tread iron misaligned: mithril footbed rivet tore heavy buffalo stirrup strap, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent rider balance score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeBalanceRoll = typeof balanceRoll === "number" && Number.isFinite(balanceRoll) ? Math.max(0, Math.min(1, balanceRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.balanceBonusPercent / maxBonus) * 20;
        const balanceScore = Math.max(0, Math.min(100, Math.round(
            (safeBalanceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((balanceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalWeightBonus = Math.max(0, Math.min(100, Math.round(recipe.baseRiderWeightDistributionBonusPercent * qualityMultiplier)));
        const finalShockMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseLanceShockAbsorptionMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const stirrup: CraftedStirrupLeathers = {
            stirrupId: `stirrup_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalRiderWeightDistributionBonusPercent: finalWeightBonus,
            finalLanceShockAbsorptionMitigationPercent: finalShockMitigate,
            riderBalancePercent: balanceScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            stirrup,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian grit and maintains stirrup leathers bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveStirrupLeathersBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveStirrupLeathersBench; newDurability: number; isFunctional: boolean } {
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