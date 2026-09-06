import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Breastplate Bench, Mithril Yoke Rig & Celestial Valkyrie Breastplate Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian breastplate crafting benches and chest yoke tension rigs (Elder Breastplate Bench, Runic Oak Breastplate Rig, Celestial Void Valkyrie Breastplate Sanctum),
 * raw tanned warsteed breastplate straps and tempered mithril breastplate chest ring sets (Tanned Warsteed Breastplate Strap, Tempered Mithril Breastplate Chest Ring, Celestial Void Astral Breastplate Pelt),
 * novice expedition breastplates and sovereign aerial breastplate recipes (Novice Expedition Breastplate, Warmaster Mithril Reinforced Breastplate, Celestial Void Valkyrie Sovereign Breastplate),
 * independent steed uphill-saddle retention ratings and chest armor protection ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped uphill saddle retention bonus and chest armor protection scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse breastplate bench maintenance.
 */

export type BreastplateBenchType = "ELDER_BREASTPLATE_BENCH" | "RUNIC_OAK_BREASTPLATE_RIG" | "CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM";
export type RawLeatherBreastplateType = "TANNED_WARSTEED_BREASTPLATE_STRAP" | "TEMPERED_MITHRIL_BREASTPLATE_CHEST_RING" | "CELESTIAL_VOID_ASTRAL_BREASTPLATE_PELT";
export type BreastplateRecipeType = "NOVICE_EXPEDITION_BREASTPLATE" | "WARMASTER_MITHRIL_REINFORCED_BREASTPLATE" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE";

export interface BreastplateBenchData {
    benchType: BreastplateBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    breastplateStabilityBonusPercent: number;
}

export interface BreastplateRecipeData {
    recipeType: BreastplateRecipeType;
    requiredLeatherType: RawLeatherBreastplateType;
    requiredLeatherCount: number;
    baseUphillSaddleRetentionPercent: number;
    baseChestArmorProtectionPercent: number;
}

export interface ActiveBreastplateBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BreastplateBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseBreastplate {
    breastplateId: string;
    recipeType: BreastplateRecipeType;
    finalUphillSaddleRetentionPercent: number;
    finalChestArmorProtectionPercent: number;
    breastplateAnchorStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBreastplateType;
    remainingProvidedLeathers: RawLeatherBreastplateType[];
    craftedEpochMs: number;
}

export const BREASTPLATE_BENCH_CATALOG: Record<BreastplateBenchType, BreastplateBenchData> = {
    ELDER_BREASTPLATE_BENCH: { benchType: "ELDER_BREASTPLATE_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, breastplateStabilityBonusPercent: 14 },
    RUNIC_OAK_BREASTPLATE_RIG: { benchType: "RUNIC_OAK_BREASTPLATE_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, breastplateStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_BREASTPLATE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, breastplateStabilityBonusPercent: 40 },
};

export const BREASTPLATE_RECIPE_CATALOG: Record<BreastplateRecipeType, BreastplateRecipeData> = {
    NOVICE_EXPEDITION_BREASTPLATE: { recipeType: "NOVICE_EXPEDITION_BREASTPLATE", requiredLeatherType: "TANNED_WARSTEED_BREASTPLATE_STRAP", requiredLeatherCount: 2, baseUphillSaddleRetentionPercent: 24, baseChestArmorProtectionPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_BREASTPLATE: { recipeType: "WARMASTER_MITHRIL_REINFORCED_BREASTPLATE", requiredLeatherType: "TEMPERED_MITHRIL_BREASTPLATE_CHEST_RING", requiredLeatherCount: 2, baseUphillSaddleRetentionPercent: 50, baseChestArmorProtectionPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_BREASTPLATE", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_BREASTPLATE_PELT", requiredLeatherCount: 2, baseUphillSaddleRetentionPercent: 84, baseChestArmorProtectionPercent: 64 },
};

export class AncientRunicLeatherHorseBreastplateBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BREASTPLATE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(BREASTPLATE_BENCH_CATALOG).map(b => b.breastplateStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse breastplate crafting bench or chest yoke tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: BreastplateBenchType
    ): ActiveBreastplateBench {
        const data = BREASTPLATE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse breastplate bench type: ${String(benchType)}`);
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
     * Stitches and tensions breastplate straps and tempered mithril chest rings into horse breastplates.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftBreastplate(
        bench: ActiveBreastplateBench,
        recipeType: BreastplateRecipeType,
        providedLeathers: RawLeatherBreastplateType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; breastplate?: CraftedHorseBreastplate; updatedBench?: ActiveBreastplateBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBreastplateType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse breastplate bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BREASTPLATE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BREASTPLATE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse breastplate recipe: ${String(recipeType)}` };
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
                reason: `Insufficient breastplate straps/chest rings: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Breastplate strap misaligned: mithril chest ring warped under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent breastplate anchor stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.breastplateStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalRetention = Math.max(0, Math.min(100, Math.round(recipe.baseUphillSaddleRetentionPercent * qualityMultiplier)));
        const finalProtection = Math.max(0, Math.min(100, Math.round(recipe.baseChestArmorProtectionPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const breastplate: CraftedHorseBreastplate = {
            breastplateId: `breastplate_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalUphillSaddleRetentionPercent: finalRetention,
            finalChestArmorProtectionPercent: finalProtection,
            breastplateAnchorStabilityPercent: stabilityScore,
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
     * Cleans equestrian trail grime and maintains horse breastplate bench.
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
