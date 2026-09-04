import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Crupper Bench, Mithril Dock Buckle & Celestial Valkyrie Caudal Harness Engine for OpenAO MMORPG.
 * Simulates caudal crupper strap stitching benches and tail dock buckle rigs (Ash Horse Crupper Bench, Runic Ironwood Crupper Rig, Celestial Void Valkyrie Caudal Sanctum),
 * raw tanned elk-hide crupper straps and tempered mithril dock buckle sets (Tanned Elk Hide Crupper Strap, Tempered Mithril Dock Buckle Set, Celestial Void Astral Valkyrie Tail Pelt),
 * novice cavalry dock cruppers and sovereign aerial caudal crupper recipes (Novice Cavalry Dock Crupper, Warmaster Mithril Dock Crupper, Celestial Void Valkyrie Sovereign Crupper),
 * independent steed dock caudal stability ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped caudal stability bonus and forward saddle slip mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse crupper bench maintenance.
 */

export type CrupperBenchType = "ASH_HORSE_CRUPPER_BENCH" | "RUNIC_IRONWOOD_CRUPPER_RIG" | "CELESTIAL_VOID_VALKYRIE_CAUDAL_SANCTUM";
export type RawLeatherCrupperType = "TANNED_ELK_HIDE_CRUPPER_STRAP" | "TEMPERED_MITHRIL_DOCK_BUCKLE_SET" | "CELESTIAL_VOID_ASTRAL_VALKYRIE_TAIL_PELT";
export type CrupperRecipeType = "NOVICE_CAVALRY_DOCK_CRUPPER" | "WARMASTER_MITHRIL_DOCK_CRUPPER" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER";

export interface CrupperBenchData {
    benchType: CrupperBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    dockStabilityBonusPercent: number;
}

export interface CrupperRecipeData {
    recipeType: CrupperRecipeType;
    requiredLeatherType: RawLeatherCrupperType;
    requiredLeatherCount: number;
    baseCaudalStabilityBonusPercent: number;
    baseForwardSaddleSlipMitigationPercent: number;
}

export interface ActiveCrupperBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CrupperBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseCrupper {
    crupperId: string;
    recipeType: CrupperRecipeType;
    finalCaudalStabilityBonusPercent: number;
    finalForwardSaddleSlipMitigationPercent: number;
    caudalStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCrupperType;
    remainingProvidedLeathers: RawLeatherCrupperType[];
    craftedEpochMs: number;
}

export const CRUPPER_BENCH_CATALOG: Record<CrupperBenchType, CrupperBenchData> = {
    ASH_HORSE_CRUPPER_BENCH: { benchType: "ASH_HORSE_CRUPPER_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, dockStabilityBonusPercent: 14 },
    RUNIC_IRONWOOD_CRUPPER_RIG: { benchType: "RUNIC_IRONWOOD_CRUPPER_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, dockStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CAUDAL_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CAUDAL_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, dockStabilityBonusPercent: 40 },
};

export const CRUPPER_RECIPE_CATALOG: Record<CrupperRecipeType, CrupperRecipeData> = {
    NOVICE_CAVALRY_DOCK_CRUPPER: { recipeType: "NOVICE_CAVALRY_DOCK_CRUPPER", requiredLeatherType: "TANNED_ELK_HIDE_CRUPPER_STRAP", requiredLeatherCount: 2, baseCaudalStabilityBonusPercent: 24, baseForwardSaddleSlipMitigationPercent: 14 },
    WARMASTER_MITHRIL_DOCK_CRUPPER: { recipeType: "WARMASTER_MITHRIL_DOCK_CRUPPER", requiredLeatherType: "TEMPERED_MITHRIL_DOCK_BUCKLE_SET", requiredLeatherCount: 2, baseCaudalStabilityBonusPercent: 50, baseForwardSaddleSlipMitigationPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_VALKYRIE_TAIL_PELT", requiredLeatherCount: 2, baseCaudalStabilityBonusPercent: 84, baseForwardSaddleSlipMitigationPercent: 64 },
};

export class AncientRunicLeatherHorseCrupperBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CRUPPER_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(CRUPPER_BENCH_CATALOG).map(b => b.dockStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse crupper stitching bench or rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: CrupperBenchType
    ): ActiveCrupperBench {
        const data = CRUPPER_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse crupper bench type: ${String(benchType)}`);
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
     * Stitches and rivets elk-hide straps and tempered mithril dock buckles into horse cruppers.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftCrupper(
        bench: ActiveCrupperBench,
        recipeType: CrupperRecipeType,
        providedLeathers: RawLeatherCrupperType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; crupper?: CraftedHorseCrupper; updatedBench?: ActiveCrupperBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCrupperType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse crupper bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CRUPPER_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CRUPPER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse crupper recipe: ${String(recipeType)}` };
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
                reason: `Insufficient crupper straps/dock buckle sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Dock loop misaligned: tail dock buckle sheared during tensile clamping, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent caudal stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.dockStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalStabilityBonus = Math.max(0, Math.min(100, Math.round(recipe.baseCaudalStabilityBonusPercent * qualityMultiplier)));
        const finalSlipMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseForwardSaddleSlipMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const crupper: CraftedHorseCrupper = {
            crupperId: `crupper_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalCaudalStabilityBonusPercent: finalStabilityBonus,
            finalForwardSaddleSlipMitigationPercent: finalSlipMitigate,
            caudalStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            crupper,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail dust and maintains horse crupper bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveCrupperBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveCrupperBench; newDurability: number; isFunctional: boolean } {
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
