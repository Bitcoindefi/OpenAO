import crypto from "node:crypto";

/**
 * Ancient Runic Leather Cavalry Breastplate Bench, Mithril Buckle & Celestial Valkyrie Chestguard Engine for OpenAO MMORPG.
 * Simulates harness leather stitching benches and chestplate rivet rigs (Ash Breastplate Bench, Runic Ironwood Breastplate Rig, Celestial Void Valkyrie Breastplate Sanctum),
 * raw tanned bull-hide breast straps and tempered mithril buckle sets (Tanned Bull Hide Breast Strap, Tempered Mithril Harness Buckle Set, Celestial Void Astral Valkyrie Pelt),
 * novice cavalry breastplates and sovereign aerial breastguard recipes (Novice Cavalry Breastplate, Warmaster Mithril Harness Breastplate, Celestial Void Valkyrie Sovereign Breastguard),
 * independent steed chest impact mitigation ratings (scaled across catalog baselines ~15% to 100%), calibrated clamped chest impact absorption bonus and lance deflection mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and cavalry breastplate bench maintenance.
 */

export type BreastplateBenchType = "ASH_BREASTPLATE_BENCH" | "RUNIC_IRONWOOD_BREASTPLATE_RIG" | "CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM";
export type RawLeatherBreastplateType = "TANNED_BULL_HIDE_BREAST_STRAP" | "TEMPERED_MITHRIL_HARNESS_BUCKLE_SET" | "CELESTIAL_VOID_ASTRAL_VALKYRIE_PELT";
export type BreastplateRecipeType = "NOVICE_CAVALRY_BREASTPLATE" | "WARMASTER_MITHRIL_HARNESS_BREASTPLATE" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTGUARD";

export interface BreastplateBenchData {
    benchType: BreastplateBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    harnessBonusPercent: number;
}

export interface BreastplateRecipeData {
    recipeType: BreastplateRecipeType;
    requiredLeatherType: RawLeatherBreastplateType;
    requiredLeatherCount: number;
    baseChestImpactAbsorptionPercent: number;
    baseLanceDeflectionPercent: number;
}

export interface ActiveBreastplateBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BreastplateBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedCavalryBreastplate {
    breastplateId: string;
    recipeType: BreastplateRecipeType;
    finalChestImpactAbsorptionPercent: number;
    finalLanceDeflectionPercent: number;
    steedImpactMitigationPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~15% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBreastplateType;
    remainingProvidedLeathers: RawLeatherBreastplateType[];
    craftedEpochMs: number;
}

export const BREASTPLATE_BENCH_CATALOG: Record<BreastplateBenchType, BreastplateBenchData> = {
    ASH_BREASTPLATE_BENCH: { benchType: "ASH_BREASTPLATE_BENCH", maxDurability: 90, leathercraftPower: 28, baseSuccessRatePercent: 86, harnessBonusPercent: 12 },
    RUNIC_IRONWOOD_BREASTPLATE_RIG: { benchType: "RUNIC_IRONWOOD_BREASTPLATE_RIG", maxDurability: 195, leathercraftPower: 70, baseSuccessRatePercent: 93, harnessBonusPercent: 22 },
    CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM", maxDurability: 340, leathercraftPower: 125, baseSuccessRatePercent: 99, harnessBonusPercent: 38 },
};

export const BREASTPLATE_RECIPE_CATALOG: Record<BreastplateRecipeType, BreastplateRecipeData> = {
    NOVICE_CAVALRY_BREASTPLATE: { recipeType: "NOVICE_CAVALRY_BREASTPLATE", requiredLeatherType: "TANNED_BULL_HIDE_BREAST_STRAP", requiredLeatherCount: 2, baseChestImpactAbsorptionPercent: 22, baseLanceDeflectionPercent: 12 },
    WARMASTER_MITHRIL_HARNESS_BREASTPLATE: { recipeType: "WARMASTER_MITHRIL_HARNESS_BREASTPLATE", requiredLeatherType: "TEMPERED_MITHRIL_HARNESS_BUCKLE_SET", requiredLeatherCount: 2, baseChestImpactAbsorptionPercent: 48, baseLanceDeflectionPercent: 28 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTGUARD: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTGUARD", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_VALKYRIE_PELT", requiredLeatherCount: 2, baseChestImpactAbsorptionPercent: 82, baseLanceDeflectionPercent: 62 },
};

export class AncientRunicLeatherCavalryBreastplateBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BREASTPLATE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(BREASTPLATE_BENCH_CATALOG).map(b => b.harnessBonusPercent), 1),
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
     * Constructs and initializes a cavalry breastplate bench or rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: BreastplateBenchType
    ): ActiveBreastplateBench {
        const data = BREASTPLATE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported cavalry breastplate bench type: ${String(benchType)}`);
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
     * Stitches and rivets bull-hide straps and tempered mithril buckles into cavalry breastplates.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftBreastplate(
        bench: ActiveBreastplateBench,
        recipeType: BreastplateRecipeType,
        providedLeathers: RawLeatherBreastplateType[],
        craftRoll?: number,
        mitigationRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; breastplate?: CraftedCavalryBreastplate; updatedBench?: ActiveBreastplateBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBreastplateType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Cavalry breastplate bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BREASTPLATE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BREASTPLATE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown cavalry breastplate recipe: ${String(recipeType)}` };
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
                reason: `Insufficient breastplate straps/buckle sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Harness buckle misaligned: rivet fractured during tensile adjustment, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent steed impact mitigation score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeMitigationRoll = typeof mitigationRoll === "number" && Number.isFinite(mitigationRoll) ? Math.max(0, Math.min(1, mitigationRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.harnessBonusPercent / maxBonus) * 20;
        const impactMitigationScore = Math.max(0, Math.min(100, Math.round(
            (safeMitigationRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((impactMitigationScore / 100) * 0.4); // 0.8 to 1.2x

        const finalImpactBonus = Math.max(0, Math.min(100, Math.round(recipe.baseChestImpactAbsorptionPercent * qualityMultiplier)));
        const finalDeflectionBonus = Math.max(0, Math.min(100, Math.round(recipe.baseLanceDeflectionPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const breastplate: CraftedCavalryBreastplate = {
            breastplateId: `breastplate_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalChestImpactAbsorptionPercent: finalImpactBonus,
            finalLanceDeflectionPercent: finalDeflectionBonus,
            steedImpactMitigationPercent: impactMitigationScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            breastplate,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian harness residue and maintains breastplate bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveBreastplateBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveBreastplateBench; newDurability: number; isFunctional: boolean } {
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
