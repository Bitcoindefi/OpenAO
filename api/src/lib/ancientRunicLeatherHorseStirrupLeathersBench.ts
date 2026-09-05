import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Stirrup Leathers Bench, Mithril Tongue Buckle & Celestial Valkyrie Stride Engine for OpenAO MMORPG.
 * Simulates stirrup strap stitching benches and tongue buckle tension rigs (Rowan Stirrup Leathers Bench, Runic Hickory Stirrup Rig, Celestial Void Valkyrie Stride Sanctum),
 * raw tanned buffalo stirrup straps and tempered mithril tongue buckle sets (Tanned Buffalo Stirrup Strap, Tempered Mithril Tongue Buckle Set, Celestial Void Astral Stride Pelt),
 * novice riders suspension stirrup leathers and sovereign aerial stirrup recipes (Novice Riders Suspension Stirrup Leathers, Warmaster Mithril Calf Stirrup Leathers, Celestial Void Valkyrie Sovereign Stirrup Leathers),
 * independent steed ankle-strain mitigation & stirrup suspension ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped ankle strain mitigation bonus and rider stride balance scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse stirrup leathers bench maintenance.
 */

export type StirrupLeathersBenchType = "ROWAN_STIRRUP_LEATHERS_BENCH" | "RUNIC_HICKORY_STIRRUP_RIG" | "CELESTIAL_VOID_VALKYRIE_STRIDE_SANCTUM";
export type RawLeatherStirrupLeathersType = "TANNED_BUFFALO_STIRRUP_STRAP" | "TEMPERED_MITHRIL_TONGUE_BUCKLE_SET" | "CELESTIAL_VOID_ASTRAL_STRIDE_PELT";
export type StirrupLeathersRecipeType = "NOVICE_RIDERS_SUSPENSION_STIRRUP_LEATHERS" | "WARMASTER_MITHRIL_CALF_STIRRUP_LEATHERS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_LEATHERS";

export interface StirrupLeathersBenchData {
    benchType: StirrupLeathersBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    stirrupSuspensionBonusPercent: number;
}

export interface StirrupLeathersRecipeData {
    recipeType: StirrupLeathersRecipeType;
    requiredLeatherType: RawLeatherStirrupLeathersType;
    requiredLeatherCount: number;
    baseAnkleStrainMitigationPercent: number;
    baseRiderStrideBalanceBonusPercent: number;
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
    finalAnkleStrainMitigationPercent: number;
    finalRiderStrideBalanceBonusPercent: number;
    stirrupSuspensionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherStirrupLeathersType;
    remainingProvidedLeathers: RawLeatherStirrupLeathersType[];
    craftedEpochMs: number;
}

export const STIRRUP_LEATHERS_BENCH_CATALOG: Record<StirrupLeathersBenchType, StirrupLeathersBenchData> = {
    ROWAN_STIRRUP_LEATHERS_BENCH: { benchType: "ROWAN_STIRRUP_LEATHERS_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, stirrupSuspensionBonusPercent: 14 },
    RUNIC_HICKORY_STIRRUP_RIG: { benchType: "RUNIC_HICKORY_STIRRUP_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, stirrupSuspensionBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_STRIDE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_STRIDE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, stirrupSuspensionBonusPercent: 40 },
};

export const STIRRUP_LEATHERS_RECIPE_CATALOG: Record<StirrupLeathersRecipeType, StirrupLeathersRecipeData> = {
    NOVICE_RIDERS_SUSPENSION_STIRRUP_LEATHERS: { recipeType: "NOVICE_RIDERS_SUSPENSION_STIRRUP_LEATHERS", requiredLeatherType: "TANNED_BUFFALO_STIRRUP_STRAP", requiredLeatherCount: 2, baseAnkleStrainMitigationPercent: 24, baseRiderStrideBalanceBonusPercent: 14 },
    WARMASTER_MITHRIL_CALF_STIRRUP_LEATHERS: { recipeType: "WARMASTER_MITHRIL_CALF_STIRRUP_LEATHERS", requiredLeatherType: "TEMPERED_MITHRIL_TONGUE_BUCKLE_SET", requiredLeatherCount: 2, baseAnkleStrainMitigationPercent: 50, baseRiderStrideBalanceBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_LEATHERS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_LEATHERS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_STRIDE_PELT", requiredLeatherCount: 2, baseAnkleStrainMitigationPercent: 84, baseRiderStrideBalanceBonusPercent: 64 },
};

export class AncientRunicLeatherHorseStirrupLeathersBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(STIRRUP_LEATHERS_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(STIRRUP_LEATHERS_BENCH_CATALOG).map(b => b.stirrupSuspensionBonusPercent), 1),
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
     * Constructs and initializes a horse stirrup leathers stitching bench or rig.
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
     * Stitches and tensions stirrup straps and tempered mithril tongue buckles into horse stirrup leathers.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftStirrupLeathers(
        bench: ActiveStirrupLeathersBench,
        recipeType: StirrupLeathersRecipeType,
        providedLeathers: RawLeatherStirrupLeathersType[],
        craftRoll?: number,
        suspensionRoll?: number,
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
                reason: `Insufficient stirrup straps/tongue buckles: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Stirrup strap misaligned: mithril tongue buckle distorted during tension clamping, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent stirrup suspension score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeSuspensionRoll = typeof suspensionRoll === "number" && Number.isFinite(suspensionRoll) ? Math.max(0, Math.min(1, suspensionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.stirrupSuspensionBonusPercent / maxBonus) * 20;
        const suspensionScore = Math.max(0, Math.min(100, Math.round(
            (safeSuspensionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((suspensionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalStrainMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseAnkleStrainMitigationPercent * qualityMultiplier)));
        const finalBalanceBonus = Math.max(0, Math.min(100, Math.round(recipe.baseRiderStrideBalanceBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const stirrupLeathers: CraftedHorseStirrupLeathers = {
            stirrupLeathersId: `stirrupleathers_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalAnkleStrainMitigationPercent: finalStrainMitigation,
            finalRiderStrideBalanceBonusPercent: finalBalanceBonus,
            stirrupSuspensionPercent: suspensionScore,
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
