import crypto from "node:crypto";

/**
 * Ancient Runic Leather Archery Quiver Bench, Arrow Divider & Arcane Ammunition Engine for OpenAO MMORPG.
 * Simulates quiver framing benches and arrow separator jigs (Oak Quiver Stitching Bench, Runic Ironwood Arrow Divider Rig, Celestial Void Seraphic Quiver Sanctum),
 * raw tanned deerskin and hardened ironwood spine stiffeners (Tanned Deerskin Quiver Body, Hardened Ironwood Divider Stiffener, Celestial Void Starlight Ammunition Leather),
 * ranger swift-draw hip quivers and endless arrow quiver recipes (Ranger Swift-Draw Hip Quiver, Master Sniper Back Quiver, Celestial Void Seraphic Endless Arrow Quiver),
 * independent draw speed fluidity ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped ranged attack speed and clamped ammo retention scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and quiver bench maintenance.
 */

export type QuiverBenchType = "OAK_QUIVER_STITCHING_BENCH" | "RUNIC_IRONWOOD_ARROW_DIVIDER_RIG" | "CELESTIAL_VOID_SERAPHIC_QUIVER_SANCTUM";
export type RawLeatherQuiverType = "TANNED_DEERSKIN_QUIVER_BODY" | "HARDENED_IRONWOOD_DIVIDER_STIFFENER" | "CELESTIAL_VOID_STARLIGHT_AMMUNITION_LEATHER";
export type ArcheryQuiverRecipeType = "RANGER_SWIFT_DRAW_HIP_QUIVER" | "MASTER_SNIPER_BACK_QUIVER" | "CELESTIAL_VOID_SERAPHIC_ENDLESS_ARROW_QUIVER";

export interface QuiverBenchData {
    benchType: QuiverBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    fluidityBonusPercent: number;
}

export interface ArcheryQuiverRecipeData {
    recipeType: ArcheryQuiverRecipeType;
    requiredLeatherType: RawLeatherQuiverType;
    requiredLeatherCount: number;
    baseRangedAttackSpeedPercent: number;
    baseAmmoRetentionPercent: number;
}

export interface ActiveQuiverBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: QuiverBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedArcheryQuiver {
    quiverId: string;
    recipeType: ArcheryQuiverRecipeType;
    finalRangedAttackSpeedPercent: number;
    finalAmmoRetentionPercent: number;
    drawSpeedFluidityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherQuiverType;
    remainingProvidedLeathers: RawLeatherQuiverType[];
    craftedEpochMs: number;
}

export const QUIVER_BENCH_CATALOG: Record<QuiverBenchType, QuiverBenchData> = {
    OAK_QUIVER_STITCHING_BENCH: { benchType: "OAK_QUIVER_STITCHING_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, fluidityBonusPercent: 10 },
    RUNIC_IRONWOOD_ARROW_DIVIDER_RIG: { benchType: "RUNIC_IRONWOOD_ARROW_DIVIDER_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, fluidityBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_QUIVER_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_QUIVER_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, fluidityBonusPercent: 35 },
};

export const QUIVER_RECIPE_CATALOG: Record<ArcheryQuiverRecipeType, ArcheryQuiverRecipeData> = {
    RANGER_SWIFT_DRAW_HIP_QUIVER: { recipeType: "RANGER_SWIFT_DRAW_HIP_QUIVER", requiredLeatherType: "TANNED_DEERSKIN_QUIVER_BODY", requiredLeatherCount: 2, baseRangedAttackSpeedPercent: 20, baseAmmoRetentionPercent: 10 },
    MASTER_SNIPER_BACK_QUIVER: { recipeType: "MASTER_SNIPER_BACK_QUIVER", requiredLeatherType: "HARDENED_IRONWOOD_DIVIDER_STIFFENER", requiredLeatherCount: 2, baseRangedAttackSpeedPercent: 45, baseAmmoRetentionPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_ENDLESS_ARROW_QUIVER: { recipeType: "CELESTIAL_VOID_SERAPHIC_ENDLESS_ARROW_QUIVER", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_AMMUNITION_LEATHER", requiredLeatherCount: 2, baseRangedAttackSpeedPercent: 80, baseAmmoRetentionPercent: 60 },
};

export class AncientRunicLeatherArcheryQuiverBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(QUIVER_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(QUIVER_BENCH_CATALOG).map(b => b.fluidityBonusPercent), 1),
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
     * Constructs and initializes an archery quiver stitching bench or divider rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: QuiverBenchType
    ): ActiveQuiverBench {
        const data = QUIVER_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported quiver bench type: ${String(benchType)}`);
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
     * Forms and stitches deerskin quiver bodies and arrow dividers into hip and back quivers.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftQuiver(
        bench: ActiveQuiverBench,
        recipeType: ArcheryQuiverRecipeType,
        providedLeathers: RawLeatherQuiverType[],
        craftRoll?: number,
        fluidityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; quiver?: CraftedArcheryQuiver; updatedBench?: ActiveQuiverBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherQuiverType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Quiver bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = QUIVER_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = QUIVER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown quiver recipe: ${String(recipeType)}` };
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
                reason: `Insufficient quiver leather: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Quiver split: divider stitching cleaved deerskin seam, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent draw speed fluidity score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeFluidityRoll = typeof fluidityRoll === "number" && Number.isFinite(fluidityRoll) ? Math.max(0, Math.min(1, fluidityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.fluidityBonusPercent / maxBonus) * 20;
        const fluidityScore = Math.max(0, Math.min(100, Math.round(
            (safeFluidityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((fluidityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSpeed = Math.max(0, Math.min(100, Math.round(recipe.baseRangedAttackSpeedPercent * qualityMultiplier)));
        const finalRetention = Math.max(0, Math.min(100, Math.round(recipe.baseAmmoRetentionPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const quiver: CraftedArcheryQuiver = {
            quiverId: `quiver_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalRangedAttackSpeedPercent: finalSpeed,
            finalAmmoRetentionPercent: finalRetention,
            drawSpeedFluidityPercent: fluidityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            quiver,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-wires divider separator frames and maintains quiver bench.
     */
    public static maintainBench(
        bench: ActiveQuiverBench,
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