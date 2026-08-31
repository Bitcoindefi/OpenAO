import crypto from "node:crypto";

/**
 * Ancient Runic Glass Optical Periscope, Brass Turret Assembly & Arcane Reconnaissance Engine for OpenAO MMORPG.
 * Simulates optical periscope benches and collimation gantries (Cedar Periscope Assembly Bench, Runic Brass Reconnaissance Gantry, Celestial Void Horizon Sanctum),
 * raw silica reflection plates and armored brass casing blanks (Silica Prism Reflection Plate, Armored Brass Tube Blank, Celestial Void Omniscient Starlight Prism),
 * horizon sight periscopes and seraphic omniscient periscope recipes (Scout Horizon-Sight Periscope, Subterranean Trench-View Scope, Celestial Void Seraphic Omniscient Periscope),
 * independent reconnaissance clarity ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped true vision reveal radius and clamped stealth detection aura scaling,
 * upfront prism material deduction on all craft attempts, consistent remainingProvidedPrisms return shapes across all paths, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and periscope bench maintenance.
 */

export type PeriscopeBenchType = "CEDAR_PERISCOPE_ASSEMBLY_BENCH" | "RUNIC_BRASS_RECONNAISSANCE_GANTRY" | "CELESTIAL_VOID_HORIZON_SANCTUM";
export type RawPeriscopeMaterialType = "SILICA_PRISM_REFLECTION_PLATE" | "ARMORED_BRASS_TUBE_BLANK" | "CELESTIAL_VOID_OMNISCIENT_STARLIGHT_PRISM";
export type ArcanePeriscopeRecipeType = "SCOUT_HORIZON_SIGHT_PERISCOPE" | "SUBTERRANEAN_TRENCH_VIEW_SCOPE" | "CELESTIAL_VOID_SERAPHIC_OMNISCIENT_PERISCOPE";

export interface PeriscopeBenchData {
    benchType: PeriscopeBenchType;
    maxDurability: number;
    glazieryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    reconnaissanceBonusPercent: number;
}

export interface ArcanePeriscopeRecipeData {
    recipeType: ArcanePeriscopeRecipeType;
    requiredMaterialType: RawPeriscopeMaterialType;
    requiredMaterialCount: number;
    baseTrueVisionRadiusPercent: number;
    baseStealthDetectionPercent: number;
}

export interface ActivePeriscopeBench {
    benchId: string;
    glazierPlayerId: string;
    benchType: PeriscopeBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedArcanePeriscope {
    periscopeId: string;
    recipeType: ArcanePeriscopeRecipeType;
    finalTrueVisionRadiusPercent: number;
    finalStealthDetectionPercent: number;
    reconnaissanceClarityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedMaterialCount: number;
    consumedMaterialType: RawPeriscopeMaterialType;
    remainingProvidedPrisms: RawPeriscopeMaterialType[];
    craftedEpochMs: number;
}

export const PERISCOPE_BENCH_CATALOG: Record<PeriscopeBenchType, PeriscopeBenchData> = {
    CEDAR_PERISCOPE_ASSEMBLY_BENCH: { benchType: "CEDAR_PERISCOPE_ASSEMBLY_BENCH", maxDurability: 75, glazieryPower: 25, baseSuccessRatePercent: 85, reconnaissanceBonusPercent: 10 },
    RUNIC_BRASS_RECONNAISSANCE_GANTRY: { benchType: "RUNIC_BRASS_RECONNAISSANCE_GANTRY", maxDurability: 170, glazieryPower: 65, baseSuccessRatePercent: 92, reconnaissanceBonusPercent: 20 },
    CELESTIAL_VOID_HORIZON_SANCTUM: { benchType: "CELESTIAL_VOID_HORIZON_SANCTUM", maxDurability: 310, glazieryPower: 120, baseSuccessRatePercent: 99, reconnaissanceBonusPercent: 35 },
};

export const PERISCOPE_RECIPE_CATALOG: Record<ArcanePeriscopeRecipeType, ArcanePeriscopeRecipeData> = {
    SCOUT_HORIZON_SIGHT_PERISCOPE: { recipeType: "SCOUT_HORIZON_SIGHT_PERISCOPE", requiredMaterialType: "SILICA_PRISM_REFLECTION_PLATE", requiredMaterialCount: 2, baseTrueVisionRadiusPercent: 20, baseStealthDetectionPercent: 10 },
    SUBTERRANEAN_TRENCH_VIEW_SCOPE: { recipeType: "SUBTERRANEAN_TRENCH_VIEW_SCOPE", requiredMaterialType: "ARMORED_BRASS_TUBE_BLANK", requiredMaterialCount: 2, baseTrueVisionRadiusPercent: 45, baseStealthDetectionPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_OMNISCIENT_PERISCOPE: { recipeType: "CELESTIAL_VOID_SERAPHIC_OMNISCIENT_PERISCOPE", requiredMaterialType: "CELESTIAL_VOID_OMNISENT_STARLIGHT_PRISM" as any, requiredMaterialCount: 2, baseTrueVisionRadiusPercent: 80, baseStealthDetectionPercent: 60 },
};

// Fix typo to match type definition
PERISCOPE_RECIPE_CATALOG.CELESTIAL_VOID_SERAPHIC_OMNISCIENT_PERISCOPE.requiredMaterialType = "CELESTIAL_VOID_OMNISCIENT_STARLIGHT_PRISM";

export class AncientRunicGlassOpticalPeriscopeEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(PERISCOPE_BENCH_CATALOG).map(b => b.glazieryPower), 1),
        maxBonus: Math.max(...Object.values(PERISCOPE_BENCH_CATALOG).map(b => b.reconnaissanceBonusPercent), 1),
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
     * Generates a cryptographically secure random float in [0, 1).
     */
    public static generateSecureRoll(): number {
        if (typeof crypto.randomInt === "function") {
            return crypto.randomInt(0, 1000000) / 1000000;
        }
        return crypto.randomBytes(4).readUInt32LE(0) / 0x100000000;
    }

    /**
     * Constructs and initializes an optical periscope assembly bench or reconnaissance gantry.
     */
    public static constructBench(
        glazierPlayerId: string,
        benchType: PeriscopeBenchType
    ): ActivePeriscopeBench {
        const data = PERISCOPE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported periscope bench type: ${String(benchType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            benchId: `bench_${benchType.toLowerCase()}_${uuid}`,
            glazierPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Aligns mirror prisms and brass turrets into reconnaissance periscopes and trench view scopes.
     * Note: Mutates the passed `bench` in place and returns it as `updatedBench` for caller ergonomics.
     */
    public static assemblePeriscope(
        bench: ActivePeriscopeBench,
        recipeType: ArcanePeriscopeRecipeType,
        providedMaterials: RawPeriscopeMaterialType[],
        craftRoll?: number,
        clarityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; periscope?: CraftedArcanePeriscope; updatedBench?: ActivePeriscopeBench; remainingDurability: number; remainingProvidedPrisms: RawPeriscopeMaterialType[]; reason?: string } {
        const fallbackMaterials = Array.isArray(providedMaterials) ? [...providedMaterials] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedPrisms: fallbackMaterials,
                reason: `Periscope assembly bench is misaligned or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = PERISCOPE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedPrisms: fallbackMaterials, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = PERISCOPE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedPrisms: fallbackMaterials, reason: `Unknown periscope recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedMaterials)) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedPrisms: [], reason: "Invalid materials array." };
        }

        // Count matching materials
        const matchingCount = providedMaterials.filter(m => m === recipe.requiredMaterialType).length;
        if (matchingCount < recipe.requiredMaterialCount) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedPrisms: fallbackMaterials,
                reason: `Insufficient material: requires ${recipe.requiredMaterialCount}x ${recipe.requiredMaterialType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        bench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            bench.currentDurability = Math.max(0, bench.currentDurability);
            bench.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedMaterials];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredMaterialCount; i--) {
            if (remaining[i] === recipe.requiredMaterialType) {
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
                remainingProvidedPrisms: remaining,
                reason: `Prism cracked: turret gantry miscollimated prism angle, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent reconnaissance clarity score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeClarityRoll = typeof clarityRoll === "number" && Number.isFinite(clarityRoll) ? Math.max(0, Math.min(1, clarityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.glazieryPower / maxPower);
        const bonusPoints = (benchData.reconnaissanceBonusPercent / maxBonus) * 20;
        const clarityScore = Math.max(0, Math.min(100, Math.round(
            (safeClarityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((clarityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalVision = Math.max(0, Math.min(100, Math.round(recipe.baseTrueVisionRadiusPercent * qualityMultiplier)));
        const finalStealth = Math.max(0, Math.min(100, Math.round(recipe.baseStealthDetectionPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const periscope: CraftedArcanePeriscope = {
            periscopeId: `periscope_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalTrueVisionRadiusPercent: finalVision,
            finalStealthDetectionPercent: finalStealth,
            reconnaissanceClarityPercent: clarityScore,
            consumedMaterialCount: recipe.requiredMaterialCount,
            consumedMaterialType: recipe.requiredMaterialType,
            remainingProvidedPrisms: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            periscope,
            updatedBench: bench,
            remainingDurability: bench.currentDurability,
            remainingProvidedPrisms: remaining,
        };
    }

    /**
     * Re-lubricates brass rotation turrets and maintains periscope bench.
     */
    public static maintainBench(
        bench: ActivePeriscopeBench,
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