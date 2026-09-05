import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Noseband Bench, Mithril Cavesson Chape & Celestial Valkyrie Jaw Stabilization Engine for OpenAO MMORPG.
 * Simulates muzzle noseband strap stitching benches and cavesson chape tension rigs (Cedar Noseband Bench, Runic Oak Cavesson Rig, Celestial Void Valkyrie Jaw Sanctum),
 * raw tanned buffalo muzzle straps and tempered mithril cavesson chape sets (Tanned Buffalo Muzzle Strap, Tempered Mithril Cavesson Chape Set, Celestial Void Astral Noseband Pelt),
 * novice trail muzzle nosebands and sovereign aerial cavesson recipes (Novice Trail Muzzle Noseband, Warmaster Mithril Cavesson Noseband, Celestial Void Valkyrie Sovereign Noseband),
 * independent steed bit-evasion mitigation & jaw stabilization ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped bit evasion mitigation bonus and jaw comfort scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse noseband bench maintenance.
 */

export type NosebandBenchType = "CEDAR_NOSEBAND_BENCH" | "RUNIC_OAK_CAVESSON_RIG" | "CELESTIAL_VOID_VALKYRIE_JAW_SANCTUM";
export type RawLeatherNosebandType = "TANNED_BUFFALO_MUZZLE_STRAP" | "TEMPERED_MITHRIL_CAVESSON_CHAPE_SET" | "CELESTIAL_VOID_ASTRAL_NOSEBAND_PELT";
export type NosebandRecipeType = "NOVICE_TRAIL_MUZZLE_NOSEBAND" | "WARMASTER_MITHRIL_CAVESSON_NOSEBAND" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND";

export interface NosebandBenchData {
    benchType: NosebandBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    jawStabilizationBonusPercent: number;
}

export interface NosebandRecipeData {
    recipeType: NosebandRecipeType;
    requiredLeatherType: RawLeatherNosebandType;
    requiredLeatherCount: number;
    baseBitEvasionMitigationPercent: number;
    baseJawComfortBonusPercent: number;
}

export interface ActiveNosebandBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: NosebandBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseNoseband {
    nosebandId: string;
    recipeType: NosebandRecipeType;
    finalBitEvasionMitigationPercent: number;
    finalJawComfortBonusPercent: number;
    jawStabilizationPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherNosebandType;
    remainingProvidedLeathers: RawLeatherNosebandType[];
    craftedEpochMs: number;
}

export const NOSEBAND_BENCH_CATALOG: Record<NosebandBenchType, NosebandBenchData> = {
    CEDAR_NOSEBAND_BENCH: { benchType: "CEDAR_NOSEBAND_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, jawStabilizationBonusPercent: 14 },
    RUNIC_OAK_CAVESSON_RIG: { benchType: "RUNIC_OAK_CAVESSON_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, jawStabilizationBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_JAW_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_JAW_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, jawStabilizationBonusPercent: 40 },
};

export const NOSEBAND_RECIPE_CATALOG: Record<NosebandRecipeType, NosebandRecipeData> = {
    NOVICE_TRAIL_MUZZLE_NOSEBAND: { recipeType: "NOVICE_TRAIL_MUZZLE_NOSEBAND", requiredLeatherType: "TANNED_BUFFALO_MUZZLE_STRAP", requiredLeatherCount: 2, baseBitEvasionMitigationPercent: 24, baseJawComfortBonusPercent: 14 },
    WARMASTER_MITHRIL_CAVESSON_NOSEBAND: { recipeType: "WARMASTER_MITHRIL_CAVESSON_NOSEBAND", requiredLeatherType: "TEMPERED_MITHRIL_CAVESSON_CHAPE_SET", requiredLeatherCount: 2, baseBitEvasionMitigationPercent: 50, baseJawComfortBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_NOSEBAND", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_NOSEBAND_PELT", requiredLeatherCount: 2, baseBitEvasionMitigationPercent: 84, baseJawComfortBonusPercent: 64 },
};

export class AncientRunicLeatherHorseNosebandBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(NOSEBAND_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(NOSEBAND_BENCH_CATALOG).map(b => b.jawStabilizationBonusPercent), 1),
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
     * Constructs and initializes a horse noseband stitching bench or cavesson rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: NosebandBenchType
    ): ActiveNosebandBench {
        const data = NOSEBAND_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse noseband bench type: ${String(benchType)}`);
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
     * Stitches and tensions muzzle straps and tempered mithril cavesson chapes into horse nosebands.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftNoseband(
        bench: ActiveNosebandBench,
        recipeType: NosebandRecipeType,
        providedLeathers: RawLeatherNosebandType[],
        craftRoll?: number,
        stabilizationRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; noseband?: CraftedHorseNoseband; updatedBench?: ActiveNosebandBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherNosebandType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse noseband bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = NOSEBAND_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = NOSEBAND_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse noseband recipe: ${String(recipeType)}` };
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
                reason: `Insufficient noseband straps/cavesson chapes: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Muzzle strap misaligned: mithril cavesson chape distorted during tension clamping, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent jaw stabilization score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilizationRoll = typeof stabilizationRoll === "number" && Number.isFinite(stabilizationRoll) ? Math.max(0, Math.min(1, stabilizationRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.jawStabilizationBonusPercent / maxBonus) * 20;
        const jawScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilizationRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((jawScore / 100) * 0.4); // 0.8 to 1.2x

        const finalMitigationBonus = Math.max(0, Math.min(100, Math.round(recipe.baseBitEvasionMitigationPercent * qualityMultiplier)));
        const finalComfortBonus = Math.max(0, Math.min(100, Math.round(recipe.baseJawComfortBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const noseband: CraftedHorseNoseband = {
            nosebandId: `noseband_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalBitEvasionMitigationPercent: finalMitigationBonus,
            finalJawComfortBonusPercent: finalComfortBonus,
            jawStabilizationPercent: jawScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            noseband,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse noseband bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveNosebandBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveNosebandBench; newDurability: number; isFunctional: boolean } {
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
