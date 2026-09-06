import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Stirrup Leathers Bench, Mithril Buckle Bar Rig & Celestial Valkyrie Stirrup Leathers Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian stirrup leathers crafting benches and buckle-bar tension rigs (Elder Stirrup Leathers Bench, Runic Oak Stirrup Leathers Rig, Celestial Void Valkyrie Stirrup Leathers Sanctum),
 * raw tanned heavy ox stirrup straps and tempered mithril stirrup buckle bar sets (Tanned Heavy Ox Stirrup Strap, Tempered Mithril Stirrup Buckle Bar, Celestial Void Astral Stirrup Pelt),
 * novice expedition stirrup leathers and sovereign aerial stirrup leathers recipes (Novice Expedition Stirrup Leathers, Warmaster Mithril Reinforced Stirrup Leathers, Celestial Void Valkyrie Sovereign Stirrup Leathers),
 * independent steed rider-weight suspension ratings and tensile anti-stretch ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped rider weight suspension bonus and tensile anti-stretch scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse stirrup leathers bench maintenance.
 */

export type StirrupLeathersBenchType = "ELDER_STIRRUP_LEATHERS_BENCH" | "RUNIC_OAK_STIRRUP_LEATHERS_RIG" | "CELESTIAL_VOID_VALKYRIE_STIRRUP_LEATHERS_SANCTUM";
export type RawLeatherStirrupLeathersType = "TANNED_HEAVY_OX_STIRRUP_STRAP" | "TEMPERED_MITHRIL_STIRRUP_BUCKLE_BAR" | "CELESTIAL_VOID_ASTRAL_STIRRUP_PELT";
export type StirrupLeathersRecipeType = "NOVICE_EXPEDITION_STIRRUP_LEATHERS" | "WARMASTER_MITHRIL_REINFORCED_STIRRUP_LEATHERS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_LEATHERS";

export interface StirrupLeathersBenchData {
    benchType: StirrupLeathersBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    stirrupLeathersStabilityBonusPercent: number;
}

export interface StirrupLeathersRecipeData {
    recipeType: StirrupLeathersRecipeType;
    requiredLeatherType: RawLeatherStirrupLeathersType;
    requiredLeatherCount: number;
    baseRiderWeightSuspensionPercent: number;
    baseTensileAntiStretchPercent: number;
}

export interface ActiveStirrupLeathersBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: StirrupLeathersBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseStirrupLeathers {
    stirrupLeathersId: string;
    recipeType: StirrupLeathersRecipeType;
    finalRiderWeightSuspensionPercent: number;
    finalTensileAntiStretchPercent: number;
    stirrupLeathersAnchorStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherStirrupLeathersType;
    remainingProvidedLeathers: RawLeatherStirrupLeathersType[];
    craftedEpochMs: number;
}

export const STIRRUP_LEATHERS_BENCH_CATALOG: Record<StirrupLeathersBenchType, StirrupLeathersBenchData> = {
    ELDER_STIRRUP_LEATHERS_BENCH: { benchType: "ELDER_STIRRUP_LEATHERS_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, stirrupLeathersStabilityBonusPercent: 14 },
    RUNIC_OAK_STIRRUP_LEATHERS_RIG: { benchType: "RUNIC_OAK_STIRRUP_LEATHERS_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, stirrupLeathersStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_STIRRUP_LEATHERS_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_STIRRUP_LEATHERS_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, stirrupLeathersStabilityBonusPercent: 40 },
};

export const STIRRUP_LEATHERS_RECIPE_CATALOG: Record<StirrupLeathersRecipeType, StirrupLeathersRecipeData> = {
    NOVICE_EXPEDITION_STIRRUP_LEATHERS: { recipeType: "NOVICE_EXPEDITION_STIRRUP_LEATHERS", requiredLeatherType: "TANNED_HEAVY_OX_STIRRUP_STRAP", requiredLeatherCount: 2, baseRiderWeightSuspensionPercent: 24, baseTensileAntiStretchPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_STIRRUP_LEATHERS: { recipeType: "WARMASTER_MITHRIL_REINFORCED_STIRRUP_LEATHERS", requiredLeatherType: "TEMPERED_MITHRIL_STIRRUP_BUCKLE_BAR", requiredLeatherCount: 2, baseRiderWeightSuspensionPercent: 50, baseTensileAntiStretchPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_LEATHERS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_LEATHERS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_STIRRUP_PELT", requiredLeatherCount: 2, baseRiderWeightSuspensionPercent: 84, baseTensileAntiStretchPercent: 64 },
};

export class AncientRunicLeatherHorseStirrupLeathersBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(STIRRUP_LEATHERS_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(STIRRUP_LEATHERS_BENCH_CATALOG).map(b => b.stirrupLeathersStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse stirrup leathers crafting bench or buckle-bar tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: StirrupLeathersBenchType
    ): ActiveStirrupLeathersBench {
        const data = STIRRUP_LEATHERS_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse stirrup leathers bench type: ${String(benchType)}`);
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
     * Stitches and tensions stirrup straps and tempered mithril buckle bars into horse stirrup leathers.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftStirrupLeathers(
        bench: ActiveStirrupLeathersBench,
        recipeType: StirrupLeathersRecipeType,
        providedLeathers: RawLeatherStirrupLeathersType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; stirrupLeathers?: CraftedHorseStirrupLeathers; updatedBench?: ActiveStirrupLeathersBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherStirrupLeathersType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse stirrup leathers bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = STIRRUP_LEATHERS_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = STIRRUP_LEATHERS_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse stirrup leathers recipe: ${String(recipeType)}` };
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
                reason: `Insufficient stirrup straps/buckle bars: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Stirrup strap misaligned: mithril buckle bar deformed under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent stirrup leathers anchor stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.stirrupLeathersStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSuspension = Math.max(0, Math.min(100, Math.round(recipe.baseRiderWeightSuspensionPercent * qualityMultiplier)));
        const finalAntiStretch = Math.max(0, Math.min(100, Math.round(recipe.baseTensileAntiStretchPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const stirrupLeathers: CraftedHorseStirrupLeathers = {
            stirrupLeathersId: `stirrupleathers_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalRiderWeightSuspensionPercent: finalSuspension,
            finalTensileAntiStretchPercent: finalAntiStretch,
            stirrupLeathersAnchorStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            stirrupLeathers,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse stirrup leathers bench.
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
