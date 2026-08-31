import crypto from "node:crypto";

/**
 * Ancient Runic Leather Falconry Glove Bench, Talon Gauntlet & Raptor Handling Engine for OpenAO MMORPG.
 * Simulates falconry glove benches and claw armature trees (Oak Falconry Glove Tree, Runic Ironwood Talon Armature Bench, Celestial Void Seraphic Raptor Sanctum),
 * raw tanned elkhide gauntlets and hardened wyrm claw rivets (Tanned Elkhide Gauntlet Blank, Hardened Wyrm Claw Rivet, Celestial Void Starlight Falconry Leather),
 * hunting hawk gauntlets and seraphic raptor handler gauntlet recipes (Scout Hunting Hawk Gauntlet, Falcon King Talon Bracer, Celestial Void Seraphic Raptor Handler Gauntlet),
 * independent grip resilience ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped companion pet damage aura and clamped talon rend mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and glove bench maintenance.
 */

export type FalconryGloveBenchType = "OAK_FALCONRY_GLOVE_TREE" | "RUNIC_IRONWOOD_TALON_ARMATURE_BENCH" | "CELESTIAL_VOID_SERAPHIC_RAPTOR_SANCTUM";
export type RawLeatherFalconryType = "TANNED_ELKHIDE_GAUNTLET_BLANK" | "HARDENED_WYRM_CLAW_RIVET" | "CELESTIAL_VOID_STARLIGHT_FALCONRY_LEATHER";
export type RaptorGauntletRecipeType = "SCOUT_HUNTING_HAWK_GAUNTLET" | "FALCON_KING_TALON_BRACER" | "CELESTIAL_VOID_SERAPHIC_RAPTOR_HANDLER_GAUNTLET";

export interface FalconryGloveBenchData {
    benchType: FalconryGloveBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    raptorBonusPercent: number;
}

export interface RaptorGauntletRecipeData {
    recipeType: RaptorGauntletRecipeType;
    requiredLeatherType: RawLeatherFalconryType;
    requiredLeatherCount: number;
    basePetDamageAuraPercent: number;
    baseTalonRendMitigationPercent: number;
}

export interface ActiveFalconryGloveBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: FalconryGloveBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedRaptorGauntlet {
    gauntletId: string;
    recipeType: RaptorGauntletRecipeType;
    finalPetDamageAuraPercent: number;
    finalTalonRendMitigationPercent: number;
    gripResiliencePercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherFalconryType;
    remainingProvidedLeathers: RawLeatherFalconryType[];
    craftedEpochMs: number;
}

export const FALCONRY_GLOVE_BENCH_CATALOG: Record<FalconryGloveBenchType, FalconryGloveBenchData> = {
    OAK_FALCONRY_GLOVE_TREE: { benchType: "OAK_FALCONRY_GLOVE_TREE", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, raptorBonusPercent: 10 },
    RUNIC_IRONWOOD_TALON_ARMATURE_BENCH: { benchType: "RUNIC_IRONWOOD_TALON_ARMATURE_BENCH", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, raptorBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_RAPTOR_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_RAPTOR_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, raptorBonusPercent: 35 },
};

export const FALCONRY_RECIPE_CATALOG: Record<RaptorGauntletRecipeType, RaptorGauntletRecipeData> = {
    SCOUT_HUNTING_HAWK_GAUNTLET: { recipeType: "SCOUT_HUNTING_HAWK_GAUNTLET", requiredLeatherType: "TANNED_ELKHIDE_GAUNTLET_BLANK", requiredLeatherCount: 2, basePetDamageAuraPercent: 20, baseTalonRendMitigationPercent: 10 },
    FALCON_KING_TALON_BRACER: { recipeType: "FALCON_KING_TALON_BRACER", requiredLeatherType: "HARDENED_WYRM_CLAW_RIVET", requiredLeatherCount: 2, basePetDamageAuraPercent: 45, baseTalonRendMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_RAPTOR_HANDLER_GAUNTLET: { recipeType: "CELESTIAL_VOID_SERAPHIC_RAPTOR_HANDLER_GAUNTLET", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_FALCONRY_LEATHER", requiredLeatherCount: 2, basePetDamageAuraPercent: 80, baseTalonRendMitigationPercent: 60 },
};

export class AncientRunicLeatherFalconryGloveBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(FALCONRY_GLOVE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(FALCONRY_GLOVE_BENCH_CATALOG).map(b => b.raptorBonusPercent), 1),
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
     * Constructs and initializes a falconry glove bench or claw armature tree.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: FalconryGloveBenchType
    ): ActiveFalconryGloveBench {
        const data = FALCONRY_GLOVE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported falconry glove bench type: ${String(benchType)}`);
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
     * Stitches and reinforces elkhide gauntlets and claw rivets into raptor handler gloves and bracers.
     * Note: Mutates the passed `bench` in place and returns it as `updatedBench` for caller ergonomics.
     */
    public static craftGauntlet(
        bench: ActiveFalconryGloveBench,
        recipeType: RaptorGauntletRecipeType,
        providedLeathers: RawLeatherFalconryType[],
        craftRoll?: number,
        resilienceRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; gauntlet?: CraftedRaptorGauntlet; updatedBench?: ActiveFalconryGloveBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherFalconryType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Falconry glove bench is splintered or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = FALCONRY_GLOVE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = FALCONRY_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown gauntlet recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedLeathers)) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedLeathers: [], reason: "Invalid leathers array." };
        }

        // Count matching leather materials
        const matchingCount = providedLeathers.filter(l => l === recipe.requiredLeatherType).length;
        if (matchingCount < recipe.requiredLeatherCount) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Insufficient falconry leather: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        bench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            bench.currentDurability = Math.max(0, bench.currentDurability);
            bench.isFunctional = false;
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
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: remaining,
                reason: `Gauntlet torn: rivet press sheared elkhide wrist cuff, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent grip resilience score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeResilienceRoll = typeof resilienceRoll === "number" && Number.isFinite(resilienceRoll) ? Math.max(0, Math.min(1, resilienceRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.raptorBonusPercent / maxBonus) * 20;
        const resilienceScore = Math.max(0, Math.min(100, Math.round(
            (safeResilienceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((resilienceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalDamage = Math.max(0, Math.min(100, Math.round(recipe.basePetDamageAuraPercent * qualityMultiplier)));
        const finalMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseTalonRendMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const gauntlet: CraftedRaptorGauntlet = {
            gauntletId: `gauntlet_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPetDamageAuraPercent: finalDamage,
            finalTalonRendMitigationPercent: finalMitigation,
            gripResiliencePercent: resilienceScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            gauntlet,
            updatedBench: bench,
            remainingDurability: bench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-waxes glove wooden forms and maintains falconry glove bench.
     */
    public static maintainBench(
        bench: ActiveFalconryGloveBench,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!bench) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        bench.currentDurability = Math.min(bench.maxDurability, bench.currentDurability + amt);
        bench.isFunctional = bench.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: bench.currentDurability,
            isFunctional: bench.isFunctional,
        };
    }
}