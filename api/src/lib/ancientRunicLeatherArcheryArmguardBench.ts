import crypto from "node:crypto";

/**
 * Ancient Runic Leather Archery Armguard Bench, Bowstring Deflector & Master Fletcher Bracer Engine for OpenAO MMORPG.
 * Simulates armguard stitching benches and bowstring deflector carving frames (Oak Archery Armguard Bench, Runic Ironwood Fletcher Rig, Celestial Void Seraphic Hawkeye Sanctum),
 * raw tanned elven stag hide armguard blanks and carved horn bowstring deflector sets (Tanned Elven Stag Hide Armguard Blank, Carved Horn Bowstring Deflector Set, Celestial Void Starlight Hawkeye Leather),
 * ranger bowstring slap guards and seraphic hawkeye trueflight armguard recipes (Ranger Bowstring Slap Guard, Fletcher Precision Bracer, Celestial Void Seraphic Hawkeye Trueflight Armguard),
 * independent bowstring slap absorption & arrow velocity stability ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped ranged critical hit bonus and clamped bow draw fatigue mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and archery armguard bench maintenance.
 */

export type ArcheryArmguardBenchType = "OAK_ARCHERY_ARMGUARD_BENCH" | "RUNIC_IRONWOOD_FLETCHER_RIG" | "CELESTIAL_VOID_SERAPHIC_HAWKEYE_SANCTUM";
export type RawLeatherArmguardType = "TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK" | "CARVED_HORN_BOWSTRING_DEFLECTOR_SET" | "CELESTIAL_VOID_STARLIGHT_HAWKEYE_LEATHER";
export type ArcheryArmguardRecipeType = "RANGER_BOWSTRING_SLAP_GUARD" | "FLETCHER_PRECISION_BRACER" | "CELESTIAL_VOID_SERAPHIC_HAWKEYE_TRUEFLIGHT_ARMGUARD";

export interface ArcheryArmguardBenchData {
    benchType: ArcheryArmguardBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    trueflightBonusPercent: number;
}

export interface ArcheryArmguardRecipeData {
    recipeType: ArcheryArmguardRecipeType;
    requiredLeatherType: RawLeatherArmguardType;
    requiredLeatherCount: number;
    baseRangedCriticalHitBonusPercent: number;
    baseBowDrawFatigueMitigationPercent: number;
}

export interface ActiveArcheryArmguardBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: ArcheryArmguardBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedArcheryArmguard {
    armguardId: string;
    recipeType: ArcheryArmguardRecipeType;
    finalRangedCriticalHitBonusPercent: number;
    finalBowDrawFatigueMitigationPercent: number;
    bowstringSlapAbsorptionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherArmguardType;
    remainingProvidedLeathers: RawLeatherArmguardType[];
    craftedEpochMs: number;
}

export const ARCHERY_ARMGUARD_BENCH_CATALOG: Record<ArcheryArmguardBenchType, ArcheryArmguardBenchData> = {
    OAK_ARCHERY_ARMGUARD_BENCH: { benchType: "OAK_ARCHERY_ARMGUARD_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, trueflightBonusPercent: 10 },
    RUNIC_IRONWOOD_FLETCHER_RIG: { benchType: "RUNIC_IRONWOOD_FLETCHER_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, trueflightBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_HAWKEYE_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_HAWKEYE_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, trueflightBonusPercent: 35 },
};

export const ARCHERY_ARMGUARD_RECIPE_CATALOG: Record<ArcheryArmguardRecipeType, ArcheryArmguardRecipeData> = {
    RANGER_BOWSTRING_SLAP_GUARD: { recipeType: "RANGER_BOWSTRING_SLAP_GUARD", requiredLeatherType: "TANNED_ELVEN_STAG_HIDE_ARMGUARD_BLANK", requiredLeatherCount: 2, baseRangedCriticalHitBonusPercent: 20, baseBowDrawFatigationPercent: 10 } as any,
    FLETCHER_PRECISION_BRACER: { recipeType: "FLETCHER_PRECISION_BRACER", requiredLeatherType: "CARVED_HORN_BOWSTRING_DEFLECTOR_SET", requiredLeatherCount: 2, baseRangedCriticalHitBonusPercent: 45, baseBowDrawFatigationPercent: 25 } as any,
    CELESTIAL_VOID_SERAPHIC_HAWKEYE_TRUEFLIGHT_ARMGUARD: { recipeType: "CELESTIAL_VOID_SERAPHIC_HAWKEYE_TRUEFLIGHT_ARMGUARD", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_HAWKEYE_LEATHER", requiredLeatherCount: 2, baseRangedCriticalHitBonusPercent: 80, baseBowDrawFatigationPercent: 60 } as any,
};

// Fix property name cleanly
ARCHERY_ARMGUARD_RECIPE_CATALOG.RANGER_BOWSTRING_SLAP_GUARD.baseBowDrawFatigueMitigationPercent = 10;
ARCHERY_ARMGUARD_RECIPE_CATALOG.FLETCHER_PRECISION_BRACER.baseBowDrawFatigueMitigationPercent = 25;
ARCHERY_ARMGUARD_RECIPE_CATALOG.CELESTIAL_VOID_SERAPHIC_HAWKEYE_TRUEFLIGHT_ARMGUARD.baseBowDrawFatigueMitigationPercent = 60;

export class AncientRunicLeatherArcheryArmguardBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(ARCHERY_ARMGUARD_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(ARCHERY_ARMGUARD_BENCH_CATALOG).map(b => b.trueflightBonusPercent), 1),
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
     * Constructs and initializes an archery armguard stitching bench or fletcher rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: ArcheryArmguardBenchType
    ): ActiveArcheryArmguardBench {
        const data = ARCHERY_ARMGUARD_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported archery armguard bench type: ${String(benchType)}`);
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
     * Stitches and mounts stag hide blanks and carved horn deflectors into archery armguards.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftArmguard(
        bench: ActiveArcheryArmguardBench,
        recipeType: ArcheryArmguardRecipeType,
        providedLeathers: RawLeatherArmguardType[],
        craftRoll?: number,
        absorptionRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; armguard?: CraftedArcheryArmguard; updatedBench?: ActiveArcheryArmguardBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherArmguardType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Archery armguard bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = ARCHERY_ARMGUARD_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = ARCHERY_ARMGUARD_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown archery armguard recipe: ${String(recipeType)}` };
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
                reason: `Insufficient archery leather/deflectors: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Horn deflector split: bowstring carving gouge fractured stag hide arm cuff, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent bowstring slap absorption score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeAbsorptionRoll = typeof absorptionRoll === "number" && Number.isFinite(absorptionRoll) ? Math.max(0, Math.min(1, absorptionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.trueflightBonusPercent / maxBonus) * 20;
        const absorptionScore = Math.max(0, Math.min(100, Math.round(
            (safeAbsorptionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((absorptionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalRangedCrit = Math.max(0, Math.min(100, Math.round(recipe.baseRangedCriticalHitBonusPercent * qualityMultiplier)));
        const finalFatigueMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseBowDrawFatigueMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const armguard: CraftedArcheryArmguard = {
            armguardId: `armguard_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalRangedCriticalHitBonusPercent: finalRangedCrit,
            finalBowDrawFatigueMitigationPercent: finalFatigueMitigate,
            bowstringSlapAbsorptionPercent: absorptionScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            armguard,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-trues deflector shaping beds and maintains archery armguard bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveArcheryArmguardBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveArcheryArmguardBench; newDurability: number; isFunctional: boolean } {
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