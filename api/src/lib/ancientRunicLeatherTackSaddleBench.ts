import crypto from "node:crypto";

/**
 * Ancient Runic Leather Tack Saddle Bench, Stirrup Rigging & Mount Harness Engine for OpenAO MMORPG.
 * Simulates saddle benches and harness stitching jacks (Oak Saddle Stitching Horse, Runic Ironwood Harness Bench, Celestial Void Seraphic Mount Sanctum),
 * raw tanned bridle leather and forged steel stirrups (Tanned Cowhide Harness Strap, Tempered Steel Stirrup Ring, Celestial Void Starlight Barding Leather),
 * courier swift gallop saddles and pegasi barding recipes (Courier Swift-Gallop Saddle, Knight Armored Warhorse Barding, Celestial Void Seraphic Pegasi Saddle),
 * independent mount comfort ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped mount stamina conservation and clamped rider impact mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and saddle bench maintenance.
 */

export type SaddleBenchType = "OAK_SADDLE_STITCHING_HORSE" | "RUNIC_IRONWOOD_HARNESS_BENCH" | "CELESTIAL_VOID_SERAPHIC_MOUNT_SANCTUM";
export type RawLeatherTackType = "TANNED_COWHIDE_HARNESS_STRAP" | "TEMPERED_STEEL_STIRRUP_RING" | "CELESTIAL_VOID_STARLIGHT_BARDING_LEATHER";
export type MountSaddleRecipeType = "COURIER_SWIFT_GALLOP_SADDLE" | "KNIGHT_ARMORED_WARHORSE_BARDING" | "CELESTIAL_VOID_SERAPHIC_PEGASI_SADDLE";

export interface SaddleBenchData {
    benchType: SaddleBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    comfortBonusPercent: number;
}

export interface MountSaddleRecipeData {
    recipeType: MountSaddleRecipeType;
    requiredTackType: RawLeatherTackType;
    requiredTackCount: number;
    baseMountStaminaConservationPercent: number;
    baseRiderImpactMitigationPercent: number;
}

export interface ActiveSaddleBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: SaddleBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedMountSaddle {
    saddleId: string;
    recipeType: MountSaddleRecipeType;
    finalMountStaminaConservationPercent: number;
    finalRiderImpactMitigationPercent: number;
    mountComfortPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedTackCount: number;
    consumedTackType: RawLeatherTackType;
    remainingProvidedLeathers: RawLeatherTackType[];
    craftedEpochMs: number;
}

export const SADDLE_BENCH_CATALOG: Record<SaddleBenchType, SaddleBenchData> = {
    OAK_SADDLE_STITCHING_HORSE: { benchType: "OAK_SADDLE_STITCHING_HORSE", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, comfortBonusPercent: 10 },
    RUNIC_IRONWOOD_HARNESS_BENCH: { benchType: "RUNIC_IRONWOOD_HARNESS_BENCH", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, comfortBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_MOUNT_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_MOUNT_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, comfortBonusPercent: 35 },
};

export const SADDLE_RECIPE_CATALOG: Record<MountSaddleRecipeType, MountSaddleRecipeData> = {
    COURIER_SWIFT_GALLOP_SADDLE: { recipeType: "COURIER_SWIFT_GALLOP_SADDLE", requiredTackType: "TANNED_COWHIDE_HARNESS_STRAP", requiredTackCount: 2, baseMountStaminaConservationPercent: 20, baseRiderImpactMitigationPercent: 10 },
    KNIGHT_ARMORED_WARHORSE_BARDING: { recipeType: "KNIGHT_ARMORED_WARHORSE_BARDING", requiredTackType: "TEMPERED_STEEL_STIRRUP_RING", requiredTackCount: 2, baseMountStaminaConservationPercent: 45, baseRiderImpactMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_PEGASI_SADDLE: { recipeType: "CELESTIAL_VOID_SERAPHIC_PEGASI_SADDLE", requiredTackType: "CELESTIAL_VOID_STARLIGHT_BARDING_LEATHER", requiredTackCount: 2, baseMountStaminaConservationPercent: 80, baseRiderImpactMitigationPercent: 60 },
};

export class AncientRunicLeatherTackSaddleBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SADDLE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(SADDLE_BENCH_CATALOG).map(b => b.comfortBonusPercent), 1),
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
     * Constructs and initializes a leather saddle bench or harness stitching horse.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: SaddleBenchType
    ): ActiveSaddleBench {
        const data = SADDLE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported saddle bench type: ${String(benchType)}`);
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
     * Stitches and rigs harness straps and stirrup irons into warhorse saddles and pegasi barding.
     * Note: Mutates the passed `bench` in place and returns it as `updatedBench` for caller ergonomics.
     */
    public static craftSaddle(
        bench: ActiveSaddleBench,
        recipeType: MountSaddleRecipeType,
        providedLeathers: RawLeatherTackType[],
        craftRoll?: number,
        comfortRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; saddle?: CraftedMountSaddle; updatedBench?: ActiveSaddleBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherTackType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Saddle bench is unstrung or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SADDLE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SADDLE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown saddle recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedLeathers)) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedLeathers: [], reason: "Invalid leathers array." };
        }

        // Count matching leather tack
        const matchingCount = providedLeathers.filter(l => l === recipe.requiredTackType).length;
        if (matchingCount < recipe.requiredTackCount) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Insufficient leather tack: requires ${recipe.requiredTackCount}x ${recipe.requiredTackType}, provided ${matchingCount}.`,
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
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredTackCount; i--) {
            if (remaining[i] === recipe.requiredTackType) {
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
                reason: `Strap snapped: stitching awl tore girth cinch seam, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent mount comfort score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeComfortRoll = typeof comfortRoll === "number" && Number.isFinite(comfortRoll) ? Math.max(0, Math.min(1, comfortRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.comfortBonusPercent / maxBonus) * 20;
        const comfortScore = Math.max(0, Math.min(100, Math.round(
            (safeComfortRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((comfortScore / 100) * 0.4); // 0.8 to 1.2x

        const finalStamina = Math.max(0, Math.min(100, Math.round(recipe.baseMountStaminaConservationPercent * qualityMultiplier)));
        const finalImpact = Math.max(0, Math.min(100, Math.round(recipe.baseRiderImpactMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const saddle: CraftedMountSaddle = {
            saddleId: `saddle_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalMountStaminaConservationPercent: finalStamina,
            finalRiderImpactMitigationPercent: finalImpact,
            mountComfortPercent: comfortScore,
            consumedTackCount: recipe.requiredTackCount,
            consumedTackType: recipe.requiredTackType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            saddle,
            updatedBench: bench,
            remainingDurability: bench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-oils stitching horse clamps and maintains saddle bench.
     */
    public static maintainBench(
        bench: ActiveSaddleBench,
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